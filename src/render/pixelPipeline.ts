/**
 * Low-res Pixel-Art Isometric Rendering Pipeline:
 * 1. Renders scene into a low-res (~480x270) WebGLRenderTarget with DepthTexture (NearestFilter).
 * 2. Renders view-space normals into a matching low-res NormalTarget (when outlines enabled).
 * 3. Renders hovered/selected object silhouette into a low-res HighlightTarget (only when active).
 * 4. Runs a low-res Composite pass performing:
 *    - 1px Depth + Normal dark ink outlines
 *    - 1px Light cream/cyan outline on hovered/selected object
 *    - 32-color curated palette quantization
 * 5. Blits the low-res composited image to the full viewport with NearestFilter
 *    and sub-pixel UV offset from the pixel-snapped OrthographicCamera (zero shimmer!).
 */

import * as THREE from 'three';
import { PALETTE } from '../data/palette';

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform sampler2D tNormal;
  uniform sampler2D tHighlight;
  uniform vec2 uTexelSize;
  uniform float uOutlinesEnabled;
  uniform float uQuantizeEnabled;
  uniform float uHasHighlight;
  uniform vec3 uOutlineColor;
  uniform vec3 uHighlightColor;
  uniform vec3 uPalette[32];

  varying vec2 vUv;

  vec3 linearToSrgb(vec3 c) {
    return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
  }

  vec3 quantizeToPalette(vec3 col) {
    float bestDist = 1e9;
    vec3 bestCol = uPalette[0];
    // Perceptual RGB weights for pixel-art palette matching
    vec3 w = vec3(0.30, 0.59, 0.11);
    for (int i = 0; i < 32; i++) {
      vec3 d = col - uPalette[i];
      float dist = dot(d * d, w);
      if (dist < bestDist) {
        bestDist = dist;
        bestCol = uPalette[i];
      }
    }
    return bestCol;
  }

  void main() {
    vec4 raw = texture2D(tColor, vUv);
    vec3 col = linearToSrgb(raw.rgb);

    // 1. Selected / Hovered lighter 1px outline check
    float isHighlightEdge = 0.0;
    if (uHasHighlight > 0.5) {
      float hC = texture2D(tHighlight, vUv).r;
      float hL = texture2D(tHighlight, vUv + vec2(-uTexelSize.x, 0.0)).r;
      float hR = texture2D(tHighlight, vUv + vec2( uTexelSize.x, 0.0)).r;
      float hU = texture2D(tHighlight, vUv + vec2(0.0,  uTexelSize.y)).r;
      float hD = texture2D(tHighlight, vUv + vec2(0.0, -uTexelSize.y)).r;
      float hMax = max(max(hL, hR), max(hU, hD));
      if (hC < 0.5 && hMax > 0.5) {
        isHighlightEdge = 1.0;
      }
    }

    // 2. Depth + Normal 1px dark outline
    float outlineFactor = 0.0;
    if (uOutlinesEnabled > 0.5) {
      float dC = texture2D(tDepth, vUv).r;
      float dL = texture2D(tDepth, vUv + vec2(-uTexelSize.x, 0.0)).r;
      float dR = texture2D(tDepth, vUv + vec2( uTexelSize.x, 0.0)).r;
      float dU = texture2D(tDepth, vUv + vec2(0.0,  uTexelSize.y)).r;
      float dD = texture2D(tDepth, vUv + vec2(0.0, -uTexelSize.y)).r;

      // Orthographic depth is linear; draw crisp 1px dark ink outline on foreground silhouettes
      float depthEdge = 0.0;
      depthEdge += max(0.0, dL - dC);
      depthEdge += max(0.0, dR - dC);
      depthEdge += max(0.0, dU - dC);
      depthEdge += max(0.0, dD - dC);
      float depthOutline = step(0.0042, depthEdge);

      // Normal crease outline (sharp interior bevels & architectural edges)
      vec3 nC = texture2D(tNormal, vUv).rgb * 2.0 - 1.0;
      vec3 nL = texture2D(tNormal, vUv + vec2(-uTexelSize.x, 0.0)).rgb * 2.0 - 1.0;
      vec3 nR = texture2D(tNormal, vUv + vec2( uTexelSize.x, 0.0)).rgb * 2.0 - 1.0;
      vec3 nU = texture2D(tNormal, vUv + vec2(0.0,  uTexelSize.y)).rgb * 2.0 - 1.0;
      vec3 nD = texture2D(tNormal, vUv + vec2(0.0, -uTexelSize.y)).rgb * 2.0 - 1.0;

      float nDiff = 0.0;
      nDiff = max(nDiff, 1.0 - dot(nC, nL));
      nDiff = max(nDiff, 1.0 - dot(nC, nR));
      nDiff = max(nDiff, 1.0 - dot(nC, nU));
      nDiff = max(nDiff, 1.0 - dot(nC, nD));
      float normalOutline = step(0.38, nDiff) * 0.52;

      outlineFactor = max(depthOutline * 0.88, normalOutline);
    }

    if (uQuantizeEnabled > 0.5) {
      col = quantizeToPalette(col);
    }

    if (outlineFactor > 0.01) {
      col = mix(col, uOutlineColor, outlineFactor);
    }
    if (isHighlightEdge > 0.5) {
      col = uHighlightColor;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

const BLIT_FRAG = /* glsl */ `
  precision highp float;

  uniform sampler2D tFinal;
  uniform vec2 uInsetScale;
  uniform vec2 uInsetOffset;
  uniform vec2 uSubPixelOffset;

  varying vec2 vUv;

  void main() {
    vec2 uv = uInsetOffset + vUv * uInsetScale + uSubPixelOffset;
    gl_FragColor = texture2D(tFinal, uv);
  }
`;

export class PixelRenderPipeline {
  private readonly renderer: THREE.WebGLRenderer;
  private colorTarget!: THREE.WebGLRenderTarget;
  private normalTarget!: THREE.WebGLRenderTarget;
  private highlightTarget!: THREE.WebGLRenderTarget;
  private finalLowResTarget!: THREE.WebGLRenderTarget;

  private readonly normalMaterial = new THREE.MeshNormalMaterial();
  private readonly highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quadGeo = new THREE.PlaneGeometry(2, 2);

  private readonly compositeMat: THREE.ShaderMaterial;
  private readonly blitMat: THREE.ShaderMaterial;
  private readonly compositeQuad: THREE.Mesh;
  private readonly blitQuad: THREE.Mesh;

  public pixelScale: 2 | 3 | 4 = 3;
  public rtWidth = 480;
  public rtHeight = 270;
  public paddedWidth = 482;
  public paddedHeight = 272;

  constructor(renderer: THREE.WebGLRenderer, width: number, height: number, pixelScale: 2 | 3 | 4 = 3) {
    this.renderer = renderer;
    this.pixelScale = pixelScale;

    const paletteVecs = PALETTE.map((c) => new THREE.Vector3(c.rgb[0], c.rgb[1], c.rgb[2]));

    this.compositeMat = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null },
        tDepth: { value: null },
        tNormal: { value: null },
        tHighlight: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / 482, 1 / 272) },
        uOutlinesEnabled: { value: 1 },
        uQuantizeEnabled: { value: 1 },
        uHasHighlight: { value: 0 },
        uOutlineColor: { value: new THREE.Color('#231b1c') },
        uHighlightColor: { value: new THREE.Color('#f8f0df') },
        uPalette: { value: paletteVecs },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    this.blitMat = new THREE.ShaderMaterial({
      uniforms: {
        tFinal: { value: null },
        uInsetScale: { value: new THREE.Vector2(1, 1) },
        uInsetOffset: { value: new THREE.Vector2(0, 0) },
        uSubPixelOffset: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: BLIT_FRAG,
      depthTest: false,
      depthWrite: false,
    });

    this.compositeQuad = new THREE.Mesh(this.quadGeo, this.compositeMat);
    this.blitQuad = new THREE.Mesh(this.quadGeo, this.blitMat);

    this.resize(width, height, pixelScale);
  }

  public resize(width: number, height: number, pixelScale: 2 | 3 | 4 = this.pixelScale): void {
    this.pixelScale = pixelScale;
    this.rtWidth = Math.max(200, Math.floor(width / pixelScale));
    this.rtHeight = Math.max(120, Math.floor(height / pixelScale));
    // 1-texel border margin on every side so sub-pixel camera snapping never smears edges
    this.paddedWidth = this.rtWidth + 2;
    this.paddedHeight = this.rtHeight + 2;

    this.disposeTargets();

    const depthTex = new THREE.DepthTexture(this.paddedWidth, this.paddedHeight);
    depthTex.minFilter = THREE.NearestFilter;
    depthTex.magFilter = THREE.NearestFilter;

    this.colorTarget = new THREE.WebGLRenderTarget(this.paddedWidth, this.paddedHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthTexture: depthTex,
    });

    this.normalTarget = new THREE.WebGLRenderTarget(this.paddedWidth, this.paddedHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
    });

    this.highlightTarget = new THREE.WebGLRenderTarget(this.paddedWidth, this.paddedHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
    });

    this.finalLowResTarget = new THREE.WebGLRenderTarget(this.paddedWidth, this.paddedHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
    });

    this.compositeMat.uniforms.tColor.value = this.colorTarget.texture;
    this.compositeMat.uniforms.tDepth.value = this.colorTarget.depthTexture;
    this.compositeMat.uniforms.tNormal.value = this.normalTarget.texture;
    this.compositeMat.uniforms.tHighlight.value = this.highlightTarget.texture;
    this.compositeMat.uniforms.uTexelSize.value.set(1 / this.paddedWidth, 1 / this.paddedHeight);

    this.blitMat.uniforms.tFinal.value = this.finalLowResTarget.texture;
    this.blitMat.uniforms.uInsetScale.value.set(
      this.rtWidth / this.paddedWidth,
      this.rtHeight / this.paddedHeight,
    );
    this.blitMat.uniforms.uInsetOffset.value.set(
      1 / this.paddedWidth,
      1 / this.paddedHeight,
    );
  }

  public render(
    scene: THREE.Scene,
    camera: THREE.OrthographicCamera,
    opts: {
      outlines: boolean;
      quantize: boolean;
      subPixelTexelX: number;
      subPixelTexelY: number;
      highlightScene?: THREE.Scene | null;
      highlightColor?: string;
    },
  ): void {
    // Pass 1: Color + Depth at low-res
    this.renderer.setRenderTarget(this.colorTarget);
    this.renderer.clear();
    this.renderer.render(scene, camera);

    // Pass 2: View-space Normals at low-res (if outlines enabled)
    if (opts.outlines) {
      const prevOverride = scene.overrideMaterial;
      const prevBg = scene.background;
      scene.overrideMaterial = this.normalMaterial;
      scene.background = null;
      this.renderer.setRenderTarget(this.normalTarget);
      this.renderer.setClearColor(0x8080ff, 1);
      this.renderer.clear();
      this.renderer.render(scene, camera);
      scene.overrideMaterial = prevOverride;
      scene.background = prevBg;
    }

    // Pass 3: Highlight mask for hovered/selected object
    const hasHighlight = Boolean(opts.highlightScene && opts.highlightScene.children.length > 0);
    if (hasHighlight && opts.highlightScene) {
      const prevOverride = opts.highlightScene.overrideMaterial;
      opts.highlightScene.overrideMaterial = this.highlightMaterial;
      this.renderer.setRenderTarget(this.highlightTarget);
      this.renderer.setClearColor(0x000000, 1);
      this.renderer.clear();
      this.renderer.render(opts.highlightScene, camera);
      opts.highlightScene.overrideMaterial = prevOverride;
    }

    // Pass 4: Composite (1px outlines + 32-color palette quantization) at low-res
    this.compositeMat.uniforms.uOutlinesEnabled.value = opts.outlines ? 1 : 0;
    this.compositeMat.uniforms.uQuantizeEnabled.value = opts.quantize ? 1 : 0;
    this.compositeMat.uniforms.uHasHighlight.value = hasHighlight ? 1 : 0;
    if (opts.highlightColor) {
      this.compositeMat.uniforms.uHighlightColor.value.set(opts.highlightColor);
    }

    this.quadScene.clear();
    this.quadScene.add(this.compositeQuad);
    this.renderer.setRenderTarget(this.finalLowResTarget);
    this.renderer.render(this.quadScene, this.quadCamera);

    // Pass 5: NearestFilter upscale blit to full viewport with sub-pixel remainder
    this.blitMat.uniforms.uSubPixelOffset.value.set(
      opts.subPixelTexelX / this.paddedWidth,
      opts.subPixelTexelY / this.paddedHeight,
    );
    this.quadScene.clear();
    this.quadScene.add(this.blitQuad);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  private disposeTargets(): void {
    this.colorTarget?.depthTexture?.dispose();
    this.colorTarget?.dispose();
    this.normalTarget?.dispose();
    this.highlightTarget?.dispose();
    this.finalLowResTarget?.dispose();
  }

  public dispose(): void {
    this.disposeTargets();
    this.normalMaterial.dispose();
    this.highlightMaterial.dispose();
    this.quadGeo.dispose();
    this.compositeMat.dispose();
    this.blitMat.dispose();
  }
}
