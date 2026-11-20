/**
 * Main Three.js 3D Isometric Pixel-Art Lab Scene Controller.
 * Mounted once inside an isolated <div ref={mountRef} /> outside React HUD reconciliation.
 * Handles:
 * - True isometric OrthographicCamera (45° + Q/E 90° tweened snaps, 35.264° pitch)
 * - Pixel-snapped camera translation (zero shimmering when panning)
 * - Discrete zoom steps, WASD/drag/edge-scroll pan, minimap jumps
 * - Grounded outdoor tech-park surroundings + buildable 18x18 isometric floor grid
 * - Build ghost preview (valid green / invalid coral) + hover/selection outline
 * - Day/night lighting cycle with emissive windows, screens & blinking server LEDs
 * - Software WebGL detection + afterDraw() pacing so headless Chromium never stalls
 */

import * as THREE from 'three';
import { BALANCE } from '../data/balance';
import { CATALOG_BY_ID, type FloorType } from '../data/items';
import { canPlaceItem, findItemAtTile, floorIndex, getRotatedFootprint } from '../sim/grid';
import type { PlacedItem, RotationQuarter } from '../sim/types';
import { useGameStore } from '../store/useGameStore';
import { VoxelModelFactory, type ModelBuildResult } from './models';
import { VoxelParticlePool } from './particles';
import { PixelRenderPipeline } from './pixelPipeline';
import { InstancedStaffRenderer } from './staffRenderer';
import { createPixelTextures, type PixelTexturePack } from './textures';

const ISO_PITCH = Math.atan(1 / Math.sqrt(2)); // ~35.264 deg true isometric angle
const ZOOM_STEPS = [0.68, 0.85, 1.05, 1.3, 1.62];

// Pre-allocated scratch math helpers (zero GC in render loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _camFwd = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointerNdc = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _intersectPt = new THREE.Vector3();
const _colorDay = new THREE.Color('#47424d');
const _colorSunset = new THREE.Color('#6b473d');
const _colorNight = new THREE.Color('#231b1c');
const _bgColor = new THREE.Color();
const _sunColorDay = new THREE.Color('#ffe9c2');
const _sunColorSunset = new THREE.Color('#f0a684');
const _sunColorNight = new THREE.Color('#7a8fb8');

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

interface EraBuildingTheme {
  wallMain: string;
  wallExterior: string;
  baseboard: string;
  cornice: string;
  pilaster: string;
  windowFrame: string;
  windowGlass: string;
  windowEmissive: string;
  accentStrip: string | null;
  accentEmissive: string | null;
  cornerBeacon: string | null;
  wallHeight: number;
  floorTint: {
    garage: string;
    lab: string;
    server: string;
    lounge: string;
  };
}

const ERA_BUILDING_THEMES: EraBuildingTheme[] = [
  // Era 0: 2010 Garage Deep Nets — Cozy warm plaster + oak baseboard + warm daylight windows
  {
    wallMain: '#efe2ce',
    wallExterior: '#d5b999',
    baseboard: '#7c4e2e',
    cornice: '#8d5b37',
    pilaster: '#9e6b43',
    windowFrame: '#6a4024',
    windowGlass: '#a8d8ee',
    windowEmissive: '#ffd285',
    accentStrip: null,
    accentEmissive: null,
    cornerBeacon: null,
    wallHeight: 2.05,
    floorTint: { garage: '#ffffff', lab: '#ffffff', server: '#ffffff', lounge: '#ffffff' },
  },
  // Era 1: 2014 Vision Studio — Loft terracotta brick + studio plaster + iron mullions
  {
    wallMain: '#ebe2d6',
    wallExterior: '#b8644d',
    baseboard: '#4a434a',
    cornice: '#5a5058',
    pilaster: '#9e5340',
    windowFrame: '#3c3844',
    windowGlass: '#9cd6f0',
    windowEmissive: '#ffd996',
    accentStrip: '#d17b58',
    accentEmissive: null,
    cornerBeacon: null,
    wallHeight: 2.15,
    floorTint: { garage: '#f8efe5', lab: '#f5f2ec', server: '#ebeef5', lounge: '#fff2e6' },
  },
  // Era 2: 2017 Attention Campus — Clean bright white architectural studio + brushed aluminum
  {
    wallMain: '#f2f4f7',
    wallExterior: '#dde3ec',
    baseboard: '#4e5d75',
    cornice: '#5e6f8c',
    pilaster: '#cfd8e6',
    windowFrame: '#3e4d63',
    windowGlass: '#8ed6f7',
    windowEmissive: '#cceeff',
    accentStrip: '#4ea8de',
    accentEmissive: '#4ea8de',
    cornerBeacon: null,
    wallHeight: 2.25,
    floorTint: { garage: '#edf2f7', lab: '#e6eef7', server: '#dce6f2', lounge: '#eef5f0' },
  },
  // Era 3: 2021 Hyperscale Foundry — Graphite architectural steel + cobalt cyan trims
  {
    wallMain: '#d6dde8',
    wallExterior: '#4c576e',
    baseboard: '#293040',
    cornice: '#3a455c',
    pilaster: '#5e6d8a',
    windowFrame: '#252c3b',
    windowGlass: '#7fd4ff',
    windowEmissive: '#6cc8ff',
    accentStrip: '#56c7ff',
    accentEmissive: '#56c7ff',
    cornerBeacon: null,
    wallHeight: 2.35,
    floorTint: { garage: '#d4dce8', lab: '#cad6e8', server: '#bccae0', lounge: '#d6e2ec' },
  },
  // Era 4: 2025 Frontier Citadel — Warm ivory limestone + champagne-gold brass columns
  {
    wallMain: '#f7f1e3',
    wallExterior: '#e6dcc8',
    baseboard: '#4b4340',
    cornice: '#e6b84c',
    pilaster: '#d9ab43',
    windowFrame: '#8f6928',
    windowGlass: '#9ae6ff',
    windowEmissive: '#ffe499',
    accentStrip: '#ffe478',
    accentEmissive: '#e6b84c',
    cornerBeacon: '#ffe478',
    wallHeight: 2.45,
    floorTint: { garage: '#faf2e4', lab: '#f4ece0', server: '#e2e8f2', lounge: '#fbf4e8' },
  },
  // Era 5: 2045 Photonic Quantum Age — Pearl-white composite + glowing cyan holo-glass channels
  {
    wallMain: '#ebf7fc',
    wallExterior: '#cbe4f0',
    baseboard: '#2b475c',
    cornice: '#68e8ff',
    pilaster: '#9adbf0',
    windowFrame: '#2d5873',
    windowGlass: '#7cf2ff',
    windowEmissive: '#5de8ff',
    accentStrip: '#68f2ff',
    accentEmissive: '#4de8ff',
    cornerBeacon: '#68f2ff',
    wallHeight: 2.55,
    floorTint: { garage: '#d4effa', lab: '#c6ecfa', server: '#b4e2f7', lounge: '#daf4fc' },
  },
  // Era 6: 2100 Singularity Nexus — Celestial alabaster-obsidian + radiant starlight gold & violet
  {
    wallMain: '#f9f3e6',
    wallExterior: '#28253d',
    baseboard: '#1e1b2e',
    cornice: '#ffe478',
    pilaster: '#e6b84c',
    windowFrame: '#b894ff',
    windowGlass: '#d6c4ff',
    windowEmissive: '#c8a8ff',
    accentStrip: '#ffe478',
    accentEmissive: '#ffd866',
    cornerBeacon: '#c8a8ff',
    wallHeight: 2.65,
    floorTint: { garage: '#f3ebfc', lab: '#ebe2fa', server: '#d9d2f7', lounge: '#faf2e4' },
  },
];

interface WallAssembly {
  nx: number;
  nz: number;
  upperGroup: THREE.Group;
  currentScaleY: number;
}

interface PlacedMeshEntry {
  uid: string;
  itemId: string;
  gx: number;
  gz: number;
  rotation: RotationQuarter;
  built: ModelBuildResult;
}

export class LabSceneController {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly isSoftwareGl: boolean;
  private readonly scene = new THREE.Scene();
  private readonly highlightScene = new THREE.Scene();
  private readonly camera: THREE.OrthographicCamera;
  private readonly pipeline: PixelRenderPipeline;

  private readonly textures: PixelTexturePack;
  private readonly modelFactory: VoxelModelFactory;
  private readonly staffRenderer: InstancedStaffRenderer;
  private readonly particles: VoxelParticlePool;

  // Lighting
  private readonly sunLight: THREE.DirectionalLight;
  private readonly hemiLight: THREE.HemisphereLight;

  // Grid & world containers
  private readonly gridW = BALANCE.gridWidth;
  private readonly gridH = BALANCE.gridHeight;
  private readonly gridOffsetX = BALANCE.gridWidth / 2;
  private readonly gridOffsetZ = BALANCE.gridHeight / 2;

  private readonly floorTiles: THREE.Mesh[] = [];
  private readonly floorMaterials: Record<FloorType, THREE.MeshToonMaterial>;
  private readonly floorStateCache: FloorType[] = [];

  private readonly buildingShellGroup = new THREE.Group();
  private wallAssemblies: WallAssembly[] = [];
  private shellWindowMeshes: THREE.Mesh[] = [];
  private shellGlowMeshes: THREE.Mesh[] = [];
  private shellDisposables: Array<THREE.BufferGeometry | THREE.Material> = [];
  private lastShellSignature = '';
  private lastVisualEra = -1;
  private streetLampBulbs: THREE.Mesh[] = [];

  private readonly placedGroup = new THREE.Group();
  private readonly placedEntries = new Map<string, PlacedMeshEntry>();

  // Build ghost & hover highlight
  private ghostGroup: THREE.Group | null = null;
  private ghostItemId: string | null = null;
  private readonly ghostTileRing: THREE.Mesh;
  private readonly selectionRing: THREE.Mesh;
  private highlightClone: THREE.Object3D | null = null;
  private lastHighlightUid: string | null = null;

  // Camera rig state
  private camTargetX = 0;
  private camTargetZ = 0;
  private zoomIndex = 2; // 1.05x default
  private currentZoom = ZOOM_STEPS[2];
  private rotQuarter = 0;
  private currentYaw = Math.PI / 4;
  private targetYaw = Math.PI / 4;
  private lastCameraJumpNonce = 0;
  private lastCameraCommandNonce = 0;

  // Input state (supports mouse + multi-touch pan & pinch-to-zoom)
  private readonly keysDown = new Set<string>();
  private readonly activePointers = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private wasPinching = false;
  private isDragging = false;
  private dragMoved = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerClientX = -1;
  private pointerClientY = -1;
  private hoveredTile: [number, number] | null = null;
  private hoveredItemUid: string | null = null;

  // Loop & timers
  private disposed = false;
  private frameId = 0;
  private lastTimeMs = performance.now();
  private simAccumSec = 0;
  private autoSaveAccumSec = 0;
  private minimapSyncAccumSec = 0;
  private particleSpawnAccum = 0;
  private elapsedRealSec = 0;
  private prevItemCount = 0;

  private readonly resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(320, container.clientWidth || window.innerWidth);
    const height = Math.max(200, container.clientHeight || window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(1); // Pixel-art pipeline renders exact integer pixels
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && useGameStore.getState().game.settings.shadows;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // Crisp pixel-art shadow edges

    const canvas = this.renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.imageRendering = 'pixelated';
    canvas.setAttribute('data-testid', 'lab-canvas');
    container.appendChild(canvas);

    this.textures = createPixelTextures();
    this.modelFactory = new VoxelModelFactory(this.textures);
    this.staffRenderer = new InstancedStaffRenderer(this.textures);
    this.particles = new VoxelParticlePool();

    // True Isometric Orthographic Camera
    const aspect = width / height;
    const frustumH = 12.5;
    this.camera = new THREE.OrthographicCamera(
      (-frustumH * aspect) / 2,
      (frustumH * aspect) / 2,
      frustumH / 2,
      -frustumH / 2,
      0.5,
      120,
    );
    this.camera.zoom = this.currentZoom;
    this.camera.updateProjectionMatrix();

    const settings = useGameStore.getState().game.settings;
    this.pipeline = new PixelRenderPipeline(
      this.renderer,
      width,
      height,
      settings.pixelScale,
    );

    // Lighting: bright, crisp low-poly architectural sunlight + clean sky-ground bounce
    this.hemiLight = new THREE.HemisphereLight('#fff8eb', '#5e5869', 1.05);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff2d6', 1.65);
    this.sunLight.position.set(16, 26, 12);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 20;
    this.sunLight.shadow.camera.bottom = -20;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 70;
    this.sunLight.shadow.bias = -0.0008;
    this.scene.add(this.sunLight);

    // Floor materials (NearestFilter 16x16 procedural pixel textures)
    this.floorMaterials = {
      grass: new THREE.MeshToonMaterial({ map: this.textures.floors.grass, gradientMap: this.textures.toonGradient }),
      garage: new THREE.MeshToonMaterial({ map: this.textures.floors.garage, gradientMap: this.textures.toonGradient }),
      lab: new THREE.MeshToonMaterial({ map: this.textures.floors.lab, gradientMap: this.textures.toonGradient }),
      server: new THREE.MeshToonMaterial({ map: this.textures.floors.server, gradientMap: this.textures.toonGradient }),
      lounge: new THREE.MeshToonMaterial({ map: this.textures.floors.lounge, gradientMap: this.textures.toonGradient }),
    };

    this.buildSurroundings();
    this.buildInteractiveFloorGrid();

    this.scene.add(this.buildingShellGroup);
    this.scene.add(this.placedGroup);
    this.scene.add(this.staffRenderer.group);
    this.scene.add(this.particles.mesh);

    // Ghost footprint tile pad & selection ring
    const padGeo = new THREE.PlaneGeometry(0.96, 0.96);
    padGeo.rotateX(-Math.PI / 2);
    this.ghostTileRing = new THREE.Mesh(
      padGeo,
      new THREE.MeshBasicMaterial({
        color: '#8ce063',
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    );
    this.ghostTileRing.position.y = 0.03;
    this.ghostTileRing.visible = false;
    this.scene.add(this.ghostTileRing);

    const selGeo = new THREE.RingGeometry(0.42, 0.52, 4);
    selGeo.rotateX(-Math.PI / 2);
    selGeo.rotateY(Math.PI / 4);
    this.selectionRing = new THREE.Mesh(
      selGeo,
      new THREE.MeshBasicMaterial({
        color: '#ffe478',
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.selectionRing.position.y = 0.04;
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);

    // Sync initial items right away so frame 1 is dense & complete
    this.syncWorldFromStore(true);
    this.prevItemCount = useGameStore.getState().game.items.length;

    // Bind events
    this.bindInputEvents();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // Start loop
    this.lastTimeMs = performance.now();
    this.scheduleNextFrame();
  }

  private buildSurroundings(): void {
    // Extended outdoor lawn slab so the lab sits grounded in a suburban tech park (never floating in void)
    const lawnGeo = new THREE.BoxGeometry(64, 0.6, 64);
    const lawnTex = this.textures.floors.grass.clone();
    lawnTex.repeat.set(64, 64);
    lawnTex.needsUpdate = true;
    const lawnMat = new THREE.MeshToonMaterial({
      map: lawnTex,
      gradientMap: this.textures.toonGradient,
    });
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.position.set(0, -0.32, 0);
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    // Paved tech-park access road along the south edge (z = +11.5)
    const roadTex = this.textures.road.clone();
    roadTex.repeat.set(32, 1);
    roadTex.needsUpdate = true;
    const roadGeo = new THREE.BoxGeometry(64, 0.06, 2.6);
    const roadMat = new THREE.MeshToonMaterial({
      map: roadTex,
      gradientMap: this.textures.toonGradient,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, 0.0, this.gridOffsetZ + 2.3);
    road.receiveShadow = true;
    this.scene.add(road);

    // Sidewalk strip between plot and road
    const curbGeo = new THREE.BoxGeometry(this.gridW + 4, 0.08, 0.9);
    const curbMat = new THREE.MeshToonMaterial({
      color: '#d8d2c7',
      gradientMap: this.textures.toonGradient,
    });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(0, 0.01, this.gridOffsetZ + 0.65);
    curb.receiveShadow = true;
    this.scene.add(curb);

    // Paved driveway apron connecting the access road to the lab courtyard
    const apronGeo = new THREE.BoxGeometry(3.2, 0.065, 2.2);
    const apronMat = new THREE.MeshToonMaterial({
      color: '#737988',
      gradientMap: this.textures.toonGradient,
    });
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.position.set(0, 0.006, this.gridOffsetZ + 0.85);
    apron.receiveShadow = true;
    this.scene.add(apron);

    // Campus streetlamps along the sidewalk with warm night glow
    const poleGeo = new THREE.BoxGeometry(0.11, 2.1, 0.11);
    const armGeo = new THREE.BoxGeometry(0.11, 0.09, 0.48);
    const bulbGeo = new THREE.BoxGeometry(0.2, 0.12, 0.2);
    const poleMat = new THREE.MeshToonMaterial({ color: '#394052', gradientMap: this.textures.toonGradient });
    for (const lx of [-7.5, -2.5, 2.5, 7.5]) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(lx, 1.05, this.gridOffsetZ + 0.9);
      pole.castShadow = true;
      this.scene.add(pole);

      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.position.set(lx, 2.08, this.gridOffsetZ + 1.1);
      this.scene.add(arm);

      const bulbMat = new THREE.MeshToonMaterial({
        color: '#fff2ba',
        emissive: '#ffe478',
        emissiveIntensity: 0.45,
        gradientMap: this.textures.toonGradient,
      });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(lx, 2.0, this.gridOffsetZ + 1.3);
      this.scene.add(bulb);
      this.streetLampBulbs.push(bulb);
    }

    // Cutaway architectural slab foundation border (clean diorama plinth)
    const borderGeo = new THREE.BoxGeometry(this.gridW + 0.44, 0.24, this.gridH + 0.44);
    const borderMat = new THREE.MeshToonMaterial({
      color: '#434859',
      gradientMap: this.textures.toonGradient,
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(0, -0.10, 0);
    border.receiveShadow = true;
    this.scene.add(border);

    // Instanced voxel trees around the campus perimeter (natural outdoor boundary)
    const treePositions: Array<[number, number, number]> = [
      [-11.5, 0, -10.5], [-8.5, 0, -12.0], [-4.0, 0, -11.5], [1.5, 0, -12.2],
      [6.5, 0, -11.4], [11.2, 0, -10.2], [12.5, 0, -5.5], [12.2, 0, 0.5],
      [11.8, 0, 5.8], [-12.0, 0, -4.8], [-11.8, 0, 1.2], [-12.4, 0, 6.4],
      [-14.5, 0, -8.0], [14.6, 0, -2.5], [14.0, 0, 8.2], [-14.2, 0, 9.0],
      [-6.5, 0, 14.8], [3.5, 0, 15.2], [10.5, 0, 14.5], [-12.5, 0, 14.8],
    ];

    const trunkGeo = new THREE.BoxGeometry(0.38, 1.1, 0.38);
    const canopyGeo = new THREE.BoxGeometry(1.45, 1.35, 1.45);
    const topGeo = new THREE.BoxGeometry(0.95, 0.8, 0.95);
    const trunkMat = new THREE.MeshToonMaterial({ color: '#8a4623', gradientMap: this.textures.toonGradient });
    const canopyMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: this.textures.toonGradient });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treePositions.length);
    const tops = new THREE.InstancedMesh(topGeo, canopyMat, treePositions.length);

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const greens = ['#284d2c', '#467d39', '#66ad45'];

    treePositions.forEach(([x, , z], idx) => {
      const s = 0.88 + (idx % 4) * 0.11;
      dummy.position.set(x, 0.55 * s, z);
      dummy.scale.set(s, s, s);
      dummy.rotation.set(0, (idx % 4) * 0.5, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(x, 1.55 * s, z);
      dummy.updateMatrix();
      canopies.setMatrixAt(idx, dummy.matrix);
      col.set(greens[idx % greens.length]);
      canopies.setColorAt(idx, col);

      dummy.position.set(x, 2.4 * s, z);
      dummy.updateMatrix();
      tops.setMatrixAt(idx, dummy.matrix);
      col.set(greens[(idx + 1) % greens.length]);
      tops.setColorAt(idx, col);
    });

    for (const m of [trunks, canopies, tops]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      this.scene.add(m);
    }
  }

  private buildInteractiveFloorGrid(): void {
    const tileGeo = new THREE.BoxGeometry(0.995, 0.06, 0.995);
    const state = useGameStore.getState().game;

    for (let gz = 0; gz < this.gridH; gz++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        const idx = floorIndex(gx, gz, this.gridW);
        const fType = state.floors[idx] ?? 'grass';
        this.floorStateCache.push(fType);
        const mesh = new THREE.Mesh(tileGeo, this.floorMaterials[fType]);
        mesh.position.set(
          gx - this.gridOffsetX + 0.5,
          fType === 'grass' ? -0.025 : 0.0,
          gz - this.gridOffsetZ + 0.5,
        );
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.floorTiles.push(mesh);
      }
    }
  }

  private itemWorldCenter(item: Pick<PlacedItem, 'itemId' | 'gx' | 'gz' | 'rotation'>): [number, number] {
    const [w, d] = getRotatedFootprint(item.itemId, item.rotation);
    return [
      item.gx + w * 0.5 - this.gridOffsetX,
      item.gz + d * 0.5 - this.gridOffsetZ,
    ];
  }

  private syncWorldFromStore(force = false): void {
    const store = useGameStore.getState();
    const game = store.game;

    // 1. Sync floor tiles
    for (let i = 0; i < game.floors.length; i++) {
      const f = game.floors[i];
      if (force || this.floorStateCache[i] !== f) {
        this.floorStateCache[i] = f;
        const mesh = this.floorTiles[i];
        if (mesh) {
          mesh.material = this.floorMaterials[f];
          mesh.position.y = f === 'grass' ? -0.025 : 0.0;
        }
      }
    }

    // 1b. Rebuild dynamic camera-aware cutaway architectural shell when floor bounds or Era changes
    let minX: number = this.gridW;
    let maxX = -1;
    let minZ: number = this.gridH;
    let maxZ = -1;
    for (let gz = 0; gz < this.gridH; gz++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        if (game.floors[floorIndex(gx, gz, this.gridW)] !== 'grass') {
          if (gx < minX) minX = gx;
          if (gx > maxX) maxX = gx;
          if (gz < minZ) minZ = gz;
          if (gz > maxZ) maxZ = gz;
        }
      }
    }
    const eraIdx = Math.min(Math.max(0, game.eraIndex), ERA_BUILDING_THEMES.length - 1);
    const shellSig = `${minX},${maxX},${minZ},${maxZ}|e${eraIdx}|t${game.buildingTier ?? 0}`;
    if (force || shellSig !== this.lastShellSignature) {
      this.lastShellSignature = shellSig;
      if (maxX >= minX && maxZ >= minZ) {
        this.rebuildBuildingShell(minX, maxX, minZ, maxZ, eraIdx);
      }
    }

    // 2. Sync placed items (rebuild all item meshes cleanly whenever Era visually advances!)
    const eraChanged = this.lastVisualEra !== -1 && this.lastVisualEra !== eraIdx;
    this.lastVisualEra = eraIdx;

    if (eraChanged) {
      for (const entry of this.placedEntries.values()) {
        this.placedGroup.remove(entry.built.group);
      }
      this.placedEntries.clear();
      this.ghostItemId = null;
      this.lastHighlightUid = null;
    }

    const liveUids = new Set<string>();
    for (const item of game.items) {
      liveUids.add(item.uid);
      const existing = this.placedEntries.get(item.uid);
      if (existing) {
        if (
          existing.gx !== item.gx ||
          existing.gz !== item.gz ||
          existing.rotation !== item.rotation
        ) {
          existing.gx = item.gx;
          existing.gz = item.gz;
          existing.rotation = item.rotation;
          const [wx, wz] = this.itemWorldCenter(item);
          existing.built.group.position.set(wx, 0.03, wz);
          existing.built.group.rotation.y = (item.rotation * Math.PI) / 2;
        }
        // Hide item currently being moved (shown via ghost preview instead)
        existing.built.group.visible = store.movingItemUid !== item.uid;
      } else {
        const built = this.modelFactory.createModel(item.itemId, eraIdx);
        const [wx, wz] = this.itemWorldCenter(item);
        built.group.position.set(wx, 0.03, wz);
        built.group.rotation.y = (item.rotation * Math.PI) / 2;
        this.placedGroup.add(built.group);
        this.placedEntries.set(item.uid, {
          uid: item.uid,
          itemId: item.itemId,
          gx: item.gx,
          gz: item.gz,
          rotation: item.rotation,
          built,
        });
      }
    }

    // Spawn dust burst if player just placed a new item
    if (!force && !eraChanged && game.items.length > this.prevItemCount) {
      const newest = game.items[game.items.length - 1];
      if (newest) {
        const [wx, wz] = this.itemWorldCenter(newest);
        this.particles.spawnPlacementBurst(wx, wz);
      }
    }
    this.prevItemCount = game.items.length;

    // Remove sold items
    for (const [uid, entry] of this.placedEntries.entries()) {
      if (!liveUids.has(uid)) {
        this.placedGroup.remove(entry.built.group);
        this.placedEntries.delete(uid);
      }
    }

    // 3. Sync quality settings (pixelScale, shadows)
    if (game.settings.pixelScale !== this.pipeline.pixelScale) {
      this.handleResize();
    }
    const wantShadows = !this.isSoftwareGl && game.settings.shadows;
    if (this.renderer.shadowMap.enabled !== wantShadows) {
      this.renderer.shadowMap.enabled = wantShadows;
      this.sunLight.castShadow = wantShadows;
    }

    // 4. Sync minimap camera jump requests & mobile touch camera commands
    if (
      store.cameraJumpTarget &&
      store.cameraJumpTarget.nonce !== this.lastCameraJumpNonce
    ) {
      this.lastCameraJumpNonce = store.cameraJumpTarget.nonce;
      this.camTargetX = store.cameraJumpTarget.x - this.gridOffsetX;
      this.camTargetZ = store.cameraJumpTarget.z - this.gridOffsetZ;
    }

    if (
      store.cameraCommand &&
      store.cameraCommand.nonce !== this.lastCameraCommandNonce
    ) {
      this.lastCameraCommandNonce = store.cameraCommand.nonce;
      switch (store.cameraCommand.type) {
        case 'zoom_in':
          this.zoomIndex = Math.min(ZOOM_STEPS.length - 1, this.zoomIndex + 1);
          break;
        case 'zoom_out':
          this.zoomIndex = Math.max(0, this.zoomIndex - 1);
          break;
        case 'rotate_left':
          this.rotQuarter = (this.rotQuarter + 3) % 4;
          this.targetYaw = Math.PI / 4 + (this.rotQuarter * Math.PI) / 2;
          break;
        case 'rotate_right':
          this.rotQuarter = (this.rotQuarter + 1) % 4;
          this.targetYaw = Math.PI / 4 + (this.rotQuarter * Math.PI) / 2;
          break;
        case 'center':
          this.camTargetX = 0;
          this.camTargetZ = 0;
          break;
      }
    }
  }

  private updateBuildGhostAndSelection(): void {
    const store = useGameStore.getState();
    const { buildTool, buildItemId, buildRotation, movingItemUid, selectedItemUid, game } = store;

    const showGhost =
      store.screen === 'playing' &&
      (buildTool === 'place' || buildTool === 'move') &&
      Boolean(buildItemId) &&
      this.hoveredTile !== null;

    if (showGhost && buildItemId && this.hoveredTile) {
      const [gx, gz] = this.hoveredTile;
      const check = canPlaceItem(game, buildItemId, gx, gz, buildRotation, {
        ignoreUid: movingItemUid ?? undefined,
        skipCostCheck: buildTool === 'move',
      });
      const def = CATALOG_BY_ID[buildItemId];
      const [w, d] = getRotatedFootprint(buildItemId, buildRotation);
      const wx = gx + w * 0.5 - this.gridOffsetX;
      const wz = gz + d * 0.5 - this.gridOffsetZ;

      this.ghostTileRing.visible = true;
      this.ghostTileRing.position.set(wx, 0.045, wz);
      this.ghostTileRing.scale.set(w, 1, d);
      (this.ghostTileRing.material as THREE.MeshBasicMaterial).color.set(
        check.valid ? '#8ce063' : '#e0534f',
      );

      if (!def?.isFloorTile) {
        if (this.ghostItemId !== buildItemId) {
          if (this.ghostGroup) this.scene.remove(this.ghostGroup);
          this.ghostGroup = this.modelFactory.createModel(buildItemId, game.eraIndex).group;
          this.ghostGroup.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const m = obj as THREE.Mesh;
              m.castShadow = false;
              m.material = new THREE.MeshBasicMaterial({
                color: '#8ce063',
                transparent: true,
                opacity: 0.55,
              });
            }
          });
          this.scene.add(this.ghostGroup);
          this.ghostItemId = buildItemId;
        }
        if (this.ghostGroup) {
          this.ghostGroup.visible = true;
          this.ghostGroup.position.set(wx, 0.05, wz);
          this.ghostGroup.rotation.y = (buildRotation * Math.PI) / 2;
          const tint = check.valid ? '#8ce063' : '#e0534f';
          this.ghostGroup.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(tint);
            }
          });
        }
      } else if (this.ghostGroup) {
        this.ghostGroup.visible = false;
      }
    } else {
      this.ghostTileRing.visible = false;
      if (this.ghostGroup) this.ghostGroup.visible = false;
    }

    // Highlight outline & ground ring for selected or hovered placed item
    const highlightUid =
      store.screen === 'playing' && buildTool === 'select'
        ? selectedItemUid ?? this.hoveredItemUid
        : buildTool === 'sell'
          ? this.hoveredItemUid
          : null;

    if (highlightUid !== this.lastHighlightUid) {
      this.lastHighlightUid = highlightUid;
      this.highlightScene.clear();
      this.highlightClone = null;
      if (highlightUid) {
        const entry = this.placedEntries.get(highlightUid);
        if (entry) {
          this.highlightClone = entry.built.group.clone();
          this.highlightScene.add(this.highlightClone);
        }
      }
    }

    if (selectedItemUid && store.screen === 'playing') {
      const entry = this.placedEntries.get(selectedItemUid);
      if (entry) {
        const [w, d] = getRotatedFootprint(entry.itemId, entry.rotation);
        const [wx, wz] = this.itemWorldCenter(entry);
        this.selectionRing.visible = true;
        this.selectionRing.position.set(wx, 0.045, wz);
        this.selectionRing.scale.set(Math.max(w, d) * 1.15, 1, Math.max(w, d) * 1.15);
      } else {
        this.selectionRing.visible = false;
      }
    } else {
      this.selectionRing.visible = false;
    }
  }

  private updateDayNightAndLEDs(dt: number): void {
    const game = useGameStore.getState().game;
    const tod = game.timeOfDay; // 0 midnight, 0.25 dawn, 0.5 noon, 0.75 sunset

    // Compute smooth daylight factor (0 = night, 1 = noon)
    const sunElev = Math.sin((tod - 0.25) * Math.PI * 2); // -1 at midnight, +1 at noon
    const dayFactor = THREE.MathUtils.clamp((sunElev + 0.25) / 1.15, 0, 1);
    const sunsetFactor = THREE.MathUtils.clamp(1 - Math.abs(sunElev - 0.08) * 3.5, 0, 1);

    // Sky / backdrop color
    _bgColor.copy(_colorNight).lerp(_colorDay, dayFactor).lerp(_colorSunset, sunsetFactor * 0.45);
    this.scene.background = _bgColor;

    // Sun direction & intensity
    const sunAngle = tod * Math.PI * 2;
    this.sunLight.position.set(
      Math.cos(sunAngle) * 20,
      Math.max(9, Math.sin(sunAngle - Math.PI * 0.5) * 26 + 18),
      Math.sin(sunAngle) * 16,
    );
    this.sunLight.color
      .copy(_sunColorNight)
      .lerp(_sunColorDay, dayFactor)
      .lerp(_sunColorSunset, sunsetFactor * 0.55);
    this.sunLight.intensity = 0.85 + dayFactor * 1.05;
    this.hemiLight.intensity = 0.62 + dayFactor * 0.56;

    // Night emissive glow for architectural windows, streetlamps & monitors + blinking server LEDs
    const nightGlow = 1 - dayFactor * 0.72;
    for (const winMesh of this.shellWindowMeshes) {
      const mat = winMesh.material as THREE.MeshToonMaterial;
      mat.emissiveIntensity = 0.2 + nightGlow * 0.78;
    }
    for (const glowMesh of this.shellGlowMeshes) {
      const mat = glowMesh.material as THREE.MeshToonMaterial;
      mat.emissiveIntensity = 0.65 + Math.sin(this.elapsedRealSec * 2.6) * 0.25 + nightGlow * 0.35;
    }
    for (const bulb of this.streetLampBulbs) {
      const mat = bulb.material as THREE.MeshToonMaterial;
      mat.emissiveIntensity = 0.2 + nightGlow * 1.1;
    }

    const isTraining = game.trainingJobs.length > 0;
    const blinkPhase = this.elapsedRealSec * (isTraining ? 7.5 : 3.2);

    let idx = 0;
    for (const entry of this.placedEntries.values()) {
      for (const m of entry.built.nightGlowMeshes) {
        const mat = m.material as THREE.MeshToonMaterial;
        mat.emissiveIntensity = 0.22 + nightGlow * 0.85;
      }
      for (const m of entry.built.blinkMeshes) {
        const mat = m.material as THREE.MeshToonMaterial;
        const pulse = Math.sin(blinkPhase + idx * 1.37) > 0.05 ? 1.25 : 0.24;
        mat.emissiveIntensity = pulse;
        idx++;
      }
    }

    // Spawn ambient steam puffs, cooling mist & quantum/singularity compute sparks
    this.particleSpawnAccum += dt;
    if (this.particleSpawnAccum >= 0.26) {
      this.particleSpawnAccum = 0;
      for (const entry of this.placedEntries.values()) {
        const [wx, wz] = this.itemWorldCenter(entry);
        if (entry.itemId === 'cooling_tower' || entry.itemId === 'cryo_spire') {
          this.particles.spawn(
            wx + (Math.random() - 0.5) * 0.45,
            entry.itemId === 'cryo_spire' ? 2.3 : 1.8,
            wz + (Math.random() - 0.5) * 0.45,
            0.14,
            0.78,
            -0.08,
            0.2,
            1.35,
            entry.itemId === 'cryo_spire' ? '#8de4ff' : '#faf7eb',
          );
        } else if (entry.itemId === 'coffee_machine' && Math.random() < 0.35) {
          this.particles.spawn(wx, 0.98, wz, 0.05, 0.35, 0.02, 0.07, 0.9, '#faf7eb');
        } else if (
          (entry.itemId === 'quantum_core' || entry.itemId === 'singularity_core') &&
          Math.random() < (isTraining ? 0.65 : 0.35)
        ) {
          this.particles.spawn(
            wx + (Math.random() - 0.5) * 0.75,
            1.25 + Math.random() * 0.5,
            wz + (Math.random() - 0.5) * 0.75,
            (Math.random() - 0.5) * 0.25,
            0.95,
            (Math.random() - 0.5) * 0.25,
            0.09,
            0.85,
            entry.itemId === 'singularity_core' ? '#ffe478' : '#68f2ff',
          );
        } else if (entry.itemId === 'fusion_reactor' && Math.random() < 0.45) {
          this.particles.spawn(
            wx + (Math.random() - 0.5) * 0.5,
            1.5,
            wz + (Math.random() - 0.5) * 0.5,
            0,
            0.9,
            0,
            0.1,
            0.8,
            '#68f2ff',
          );
        } else if (
          isTraining &&
          (entry.itemId === 'gpu_rig_2010' ||
            entry.itemId === 'tensor_pod' ||
            entry.itemId === 'liquid_cluster') &&
          Math.random() < 0.45
        ) {
          this.particles.spawn(
            wx + (Math.random() - 0.5) * 0.6,
            0.75,
            wz + (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.35,
            0.85,
            (Math.random() - 0.5) * 0.35,
            0.08,
            0.65,
            entry.itemId === 'liquid_cluster' ? '#9966cc' : '#8ce063',
          );
        }
      }
    }
  }

  private clearBuildingShell(): void {
    this.buildingShellGroup.clear();
    for (const item of this.shellDisposables) {
      item.dispose();
    }
    this.shellDisposables = [];
    this.wallAssemblies = [];
    this.shellWindowMeshes = [];
    this.shellGlowMeshes = [];
  }

  /**
   * Builds sleek Era-themed architectural walls around the active indoor footprint.
   * Front walls automatically drop to clean low curbs based on camera yaw so the
   * interior lab is ALWAYS unobstructed from every 90-degree angle!
   */
  private rebuildBuildingShell(
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    eraIdx: number,
  ): void {
    this.clearBuildingShell();
    const theme = ERA_BUILDING_THEMES[eraIdx] ?? ERA_BUILDING_THEMES[0];

    // Harmonize interior floor material tones with the current Era aesthetic (2010 oak → 2045 pearl-cyan → 2100 celestial marble)
    this.floorMaterials.garage.color.set(theme.floorTint.garage);
    this.floorMaterials.lab.color.set(theme.floorTint.lab);
    this.floorMaterials.server.color.set(theme.floorTint.server);
    this.floorMaterials.lounge.color.set(theme.floorTint.lounge);

    const wLeft = minX - this.gridOffsetX;
    const wRight = maxX + 1 - this.gridOffsetX;
    const wTop = minZ - this.gridOffsetZ;
    const wBottom = maxZ + 1 - this.gridOffsetZ;
    const spanX = wRight - wLeft;
    const spanZ = wBottom - wTop;
    const cx = (wLeft + wRight) * 0.5;
    const cz = (wTop + wBottom) * 0.5;

    const wallThick = 0.22;
    const curbH = 0.24;
    const upperH = theme.wallHeight - curbH;

    const track = <T extends THREE.BufferGeometry | THREE.Material>(obj: T): T => {
      this.shellDisposables.push(obj);
      return obj;
    };

    const wallMainMat = track(
      new THREE.MeshToonMaterial({
        color: theme.wallMain,
        ...(eraIdx <= 1 ? { map: this.textures.wallPlaster } : {}),
        gradientMap: this.textures.toonGradient,
      }),
    );
    const wallExtMat = track(
      new THREE.MeshToonMaterial({
        color: theme.wallExterior,
        gradientMap: this.textures.toonGradient,
      }),
    );
    const baseMat = track(
      new THREE.MeshToonMaterial({ color: theme.baseboard, gradientMap: this.textures.toonGradient }),
    );
    const corniceMat = track(
      new THREE.MeshToonMaterial({ color: theme.cornice, gradientMap: this.textures.toonGradient }),
    );
    const pilasterMat = track(
      new THREE.MeshToonMaterial({ color: theme.pilaster, gradientMap: this.textures.toonGradient }),
    );
    const frameMat = track(
      new THREE.MeshToonMaterial({ color: theme.windowFrame, gradientMap: this.textures.toonGradient }),
    );
    const glassMat = track(
      new THREE.MeshToonMaterial({
        color: theme.windowGlass,
        emissive: theme.windowEmissive,
        emissiveIntensity: 0.32,
        gradientMap: this.textures.toonGradient,
      }),
    );
    const accentMat = theme.accentStrip
      ? track(
          new THREE.MeshToonMaterial({
            color: theme.accentStrip,
            emissive: theme.accentEmissive ?? '#000000',
            emissiveIntensity: theme.accentEmissive ? 0.72 : 0,
            gradientMap: this.textures.toonGradient,
          }),
        )
      : null;

    // 4 architectural corner plinth posts (always grounded; Era 4+ gets luminous beacons)
    const corners: Array<[number, number]> = [
      [wLeft - wallThick * 0.5, wTop - wallThick * 0.5],
      [wRight + wallThick * 0.5, wTop - wallThick * 0.5],
      [wLeft - wallThick * 0.5, wBottom + wallThick * 0.5],
      [wRight + wallThick * 0.5, wBottom + wallThick * 0.5],
    ];
    const cornerCurbGeo = track(new THREE.BoxGeometry(wallThick + 0.14, curbH + 0.08, wallThick + 0.14));
    for (const [px, pz] of corners) {
      const post = new THREE.Mesh(cornerCurbGeo, baseMat);
      post.position.set(px, (curbH + 0.08) * 0.5, pz);
      post.castShadow = true;
      post.receiveShadow = true;
      this.buildingShellGroup.add(post);
    }

    const buildWallSide = (
      side: 'north' | 'south' | 'west' | 'east',
      nx: number,
      nz: number,
      length: number,
      posX: number,
      posZ: number,
      rotY: number,
    ) => {
      const wallRoot = new THREE.Group();
      wallRoot.position.set(posX, 0, posZ);
      wallRoot.rotation.y = rotY;
      this.buildingShellGroup.add(wallRoot);

      // Permanent low cutaway curb (always frames the building footprint cleanly)
      const curbGeo = track(new THREE.BoxGeometry(length + wallThick * 2, curbH, wallThick + 0.04));
      const curbMesh = new THREE.Mesh(curbGeo, baseMat);
      curbMesh.position.set(0, curbH * 0.5, 0);
      curbMesh.castShadow = true;
      curbMesh.receiveShadow = true;
      wallRoot.add(curbMesh);

      // Subtle glowing trim line along curb for Era 5 & 6
      if (accentMat && eraIdx >= 5) {
        const curbGlowGeo = track(new THREE.BoxGeometry(length + wallThick, 0.05, wallThick + 0.07));
        const curbGlow = new THREE.Mesh(curbGlowGeo, accentMat);
        curbGlow.position.set(0, curbH - 0.03, 0);
        wallRoot.add(curbGlow);
        this.shellGlowMeshes.push(curbGlow);
      }

      // Upper dynamic cutaway wall anchored at y = curbH (scales smoothly along Y!)
      const upperGroup = new THREE.Group();
      upperGroup.position.set(0, curbH, 0);
      wallRoot.add(upperGroup);

      // Main architectural wall body (inner cream/porcelain + outer facade cladding)
      const innerBodyGeo = track(new THREE.BoxGeometry(length + wallThick * 1.8, upperH, wallThick * 0.58));
      const innerBody = new THREE.Mesh(innerBodyGeo, wallMainMat);
      innerBody.position.set(0, upperH * 0.5, wallThick * 0.21);
      innerBody.castShadow = true;
      innerBody.receiveShadow = true;
      upperGroup.add(innerBody);

      const outerBodyGeo = track(new THREE.BoxGeometry(length + wallThick * 1.8, upperH, wallThick * 0.46));
      const outerBody = new THREE.Mesh(outerBodyGeo, wallExtMat);
      outerBody.position.set(0, upperH * 0.5, -wallThick * 0.25);
      outerBody.castShadow = true;
      outerBody.receiveShadow = true;
      upperGroup.add(outerBody);

      // Clean cutaway top cornice cap
      const capGeo = track(new THREE.BoxGeometry(length + wallThick * 2.15, 0.14, wallThick + 0.14));
      const cap = new THREE.Mesh(capGeo, corniceMat);
      cap.position.set(0, upperH + 0.05, 0);
      cap.castShadow = true;
      upperGroup.add(cap);

      // Era horizontal accent channel near top cornice (Era 1+)
      if (accentMat) {
        const stripGeo = track(new THREE.BoxGeometry(length + wallThick * 1.9, 0.09, wallThick + 0.09));
        const strip = new THREE.Mesh(stripGeo, accentMat);
        strip.position.set(0, upperH - 0.16, 0);
        upperGroup.add(strip);
        if (theme.accentEmissive) this.shellGlowMeshes.push(strip);
      }

      // Repeating architectural window bays & structural pilasters every ~2.2 tiles
      const bayCount = Math.max(2, Math.floor(length / 2.2));
      const baySpacing = length / bayCount;
      const winW = Math.min(1.45, baySpacing * 0.64);
      const winH = eraIdx >= 2 ? upperH * 0.62 : upperH * 0.48;
      const winY = upperH * 0.52;

      const winFrameGeo = track(new THREE.BoxGeometry(winW + 0.14, winH + 0.14, wallThick + 0.08));
      const winGlassGeo = track(new THREE.BoxGeometry(winW, winH, wallThick + 0.11));
      const mullionVGeo = track(new THREE.BoxGeometry(0.06, winH, wallThick + 0.13));
      const sillGeo = track(new THREE.BoxGeometry(winW + 0.24, 0.08, wallThick + 0.16));
      const pilasterGeo = track(new THREE.BoxGeometry(0.22, upperH + 0.06, wallThick + 0.12));

      for (let b = 0; b < bayCount; b++) {
        const bx = -length * 0.5 + (b + 0.5) * baySpacing;

        // South wall center bay = sleek architectural entrance double-door!
        const isDoorBay = side === 'south' && b === Math.floor(bayCount / 2);
        if (isDoorBay) {
          const doorFrameGeo = track(new THREE.BoxGeometry(1.5, upperH * 0.82, wallThick + 0.1));
          const doorFrame = new THREE.Mesh(doorFrameGeo, frameMat);
          doorFrame.position.set(bx, upperH * 0.41, 0);
          upperGroup.add(doorFrame);

          const doorGlassGeo = track(new THREE.BoxGeometry(1.24, upperH * 0.72, wallThick + 0.12));
          const doorGlass = new THREE.Mesh(doorGlassGeo, glassMat);
          doorGlass.position.set(bx, upperH * 0.38, 0);
          upperGroup.add(doorGlass);
          this.shellWindowMeshes.push(doorGlass);
        } else {
          const frame = new THREE.Mesh(winFrameGeo, frameMat);
          frame.position.set(bx, winY, 0);
          upperGroup.add(frame);

          const glass = new THREE.Mesh(winGlassGeo, glassMat);
          glass.position.set(bx, winY, 0);
          upperGroup.add(glass);
          this.shellWindowMeshes.push(glass);

          // Mullion bar for classic 2010–2025 architectural rhythm (frameless holo-glass in 2045/2100)
          if (eraIdx < 5) {
            const mullion = new THREE.Mesh(mullionVGeo, frameMat);
            mullion.position.set(bx, winY, 0);
            upperGroup.add(mullion);
          }

          const sill = new THREE.Mesh(sillGeo, corniceMat);
          sill.position.set(bx, winY - winH * 0.5 - 0.06, 0);
          upperGroup.add(sill);
        }

        // Structural pilaster column between bays
        if (b < bayCount - 1) {
          const px = -length * 0.5 + (b + 1) * baySpacing;
          const pilaster = new THREE.Mesh(pilasterGeo, pilasterMat);
          pilaster.position.set(px, upperH * 0.5, 0);
          pilaster.castShadow = true;
          upperGroup.add(pilaster);
        }
      }

      // Corner pinnacle beacons for Frontier / Quantum / Singularity Eras (4..6)
      if (theme.cornerBeacon) {
        const beaconMat = track(
          new THREE.MeshToonMaterial({
            color: theme.cornerBeacon,
            emissive: theme.cornerBeacon,
            emissiveIntensity: 0.9,
            gradientMap: this.textures.toonGradient,
          }),
        );
        const beaconGeo = track(new THREE.BoxGeometry(0.24, 0.24, 0.24));
        for (const endX of [-length * 0.5 - wallThick * 0.5, length * 0.5 + wallThick * 0.5]) {
          const bMesh = new THREE.Mesh(beaconGeo, beaconMat);
          bMesh.position.set(endX, upperH + 0.28, 0);
          upperGroup.add(bMesh);
          this.shellGlowMeshes.push(bMesh);
        }
      }

      this.wallAssemblies.push({
        nx,
        nz,
        upperGroup,
        currentScaleY: 1,
      });
    };

    // North wall (outward normal 0, -1), South (0, +1), West (-1, 0), East (+1, 0)
    buildWallSide('north', 0, -1, spanX, cx, wTop - wallThick * 0.5, 0);
    buildWallSide('south', 0, 1, spanX, cx, wBottom + wallThick * 0.5, Math.PI);
    buildWallSide('west', -1, 0, spanZ, wLeft - wallThick * 0.5, cz, Math.PI / 2);
    buildWallSide('east', 1, 0, spanZ, wRight + wallThick * 0.5, cz, -Math.PI / 2);

    // Apply initial cutaway state immediately so frame 1 never flickers
    this.updateWallCutaway(1.0);
  }

  private updateWallCutaway(dt: number): void {
    const camDirX = Math.sin(this.currentYaw);
    const camDirZ = Math.cos(this.currentYaw);
    const lerpT = dt >= 0.99 ? 1 : 1 - Math.exp(-16 * Math.min(0.1, dt));

    for (const wall of this.wallAssemblies) {
      // Positive dot means wall faces the camera (FRONT wall -> drop to clean cutaway curb!)
      const dot = wall.nx * camDirX + wall.nz * camDirZ;
      const targetScaleY = dot > 0.05 ? 0.001 : 1.0;
      wall.currentScaleY += (targetScaleY - wall.currentScaleY) * lerpT;
      wall.upperGroup.scale.y = Math.max(0.001, wall.currentScaleY);
      wall.upperGroup.visible = wall.currentScaleY > 0.04;
    }
  }

  private updateCameraAndComputeSnap(dt: number): { subX: number; subY: number } {
    const store = useGameStore.getState();

    // Gentle orbital sway on Title screen, offset so the garage sits cleanly to the right of the Title plaque
    if (store.screen === 'title') {
      this.camTargetX = -2.4 + Math.sin(this.elapsedRealSec * 0.22) * 0.8;
      this.camTargetZ = 1.4 + Math.cos(this.elapsedRealSec * 0.18) * 0.7;
    } else {
      // WASD / Arrow camera pan aligned to current isometric camera yaw
      let moveRight = 0;
      let moveForward = 0;
      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) moveForward += 1;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) moveForward -= 1;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) moveRight += 1;
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) moveRight -= 1;

      // Optional edge-scroll when enabled in settings
      if (store.game.settings.edgeScroll && this.pointerClientX >= 0) {
        const margin = 16;
        const rect = this.container.getBoundingClientRect();
        if (this.pointerClientX < rect.left + margin) moveRight -= 1;
        if (this.pointerClientX > rect.right - margin) moveRight += 1;
        if (this.pointerClientY < rect.top + margin) moveForward += 1;
        if (this.pointerClientY > rect.bottom - margin) moveForward -= 1;
      }

      if (moveRight !== 0 || moveForward !== 0) {
        const panSpeed = (9.5 / this.currentZoom) * dt;
        const fwdX = -Math.sin(this.currentYaw);
        const fwdZ = -Math.cos(this.currentYaw);
        const rightX = Math.cos(this.currentYaw);
        const rightZ = -Math.sin(this.currentYaw);
        this.camTargetX += (rightX * moveRight + fwdX * moveForward) * panSpeed;
        this.camTargetZ += (rightZ * moveRight + fwdZ * moveForward) * panSpeed;
      }
    }

    // Clamp camera target to plot bounds
    const maxPan = this.gridOffsetX + 2.5;
    this.camTargetX = THREE.MathUtils.clamp(this.camTargetX, -maxPan, maxPan);
    this.camTargetZ = THREE.MathUtils.clamp(this.camTargetZ, -maxPan, maxPan);

    // Smooth Q/E 90-degree rotation tween & discrete zoom damping
    const damp = 1 - Math.exp(-12 * Math.min(0.1, dt));
    this.currentYaw += (this.targetYaw - this.currentYaw) * damp;
    this.currentZoom += (ZOOM_STEPS[this.zoomIndex] - this.currentZoom) * damp;

    // Update camera frustum padded by +2 texels for sub-pixel snapping
    // Adapt framing on narrow portrait phones AND short mobile landscape viewports
    const w = Math.max(320, this.container.clientWidth || window.innerWidth);
    const h = Math.max(200, this.container.clientHeight || window.innerHeight);
    const aspect = w / h;
    const baseFrustumH = aspect < 0.85 ? 16.0 : h < 460 ? 14.5 : w < 768 ? 14.2 : 12.5;
    const padScaleX = this.pipeline.paddedWidth / this.pipeline.rtWidth;
    const padScaleY = this.pipeline.paddedHeight / this.pipeline.rtHeight;

    this.camera.left = ((-baseFrustumH * aspect) / 2) * padScaleX;
    this.camera.right = ((baseFrustumH * aspect) / 2) * padScaleX;
    this.camera.top = (baseFrustumH / 2) * padScaleY;
    this.camera.bottom = (-baseFrustumH / 2) * padScaleY;
    this.camera.zoom = this.currentZoom;
    this.camera.updateProjectionMatrix();

    // Place camera at true isometric direction from target
    const dist = 32;
    const cosPitch = Math.cos(ISO_PITCH);
    const sinPitch = Math.sin(ISO_PITCH);
    const offX = Math.sin(this.currentYaw) * cosPitch * dist;
    const offY = sinPitch * dist;
    const offZ = Math.cos(this.currentYaw) * cosPitch * dist;

    this.camera.position.set(this.camTargetX + offX, offY, this.camTargetZ + offZ);
    this.camera.lookAt(this.camTargetX, 0, this.camTargetZ);
    this.camera.updateMatrixWorld();

    // Pixel-snapped camera translation: snap along camera right & up axes to exact low-res texels!
    this.camera.matrixWorld.extractBasis(_camRight, _camUp, _camFwd);
    const worldW = (this.camera.right - this.camera.left) / this.camera.zoom;
    const worldH = (this.camera.top - this.camera.bottom) / this.camera.zoom;
    const texelWorldW = worldW / this.pipeline.paddedWidth;
    const texelWorldH = worldH / this.pipeline.paddedHeight;

    _vec3A.set(this.camTargetX, 0, this.camTargetZ);
    const projX = _vec3A.dot(_camRight);
    const projY = _vec3A.dot(_camUp);

    const snappedX = Math.round(projX / texelWorldW) * texelWorldW;
    const snappedY = Math.round(projY / texelWorldH) * texelWorldH;

    const deltaX = snappedX - projX;
    const deltaY = snappedY - projY;

    // Move camera & lookAt by exact delta so rendered low-res texels never swim
    _vec3B.copy(_camRight).multiplyScalar(deltaX).addScaledVector(_camUp, deltaY);
    this.camera.position.add(_vec3B);
    this.camera.updateMatrixWorld();

    // Sub-pixel remainder passed to fullscreen quad (in low-res texels)
    const subX = (projX - snappedX) / texelWorldW;
    const subY = (projY - snappedY) / texelWorldH;

    // Throttled minimap bounds update (5Hz)
    this.minimapSyncAccumSec += dt;
    if (this.minimapSyncAccumSec >= 0.2) {
      this.minimapSyncAccumSec = 0;
      store.setCameraBounds({
        centerX: this.camTargetX + this.gridOffsetX,
        centerZ: this.camTargetZ + this.gridOffsetZ,
        halfW: worldW * 0.42,
        halfH: worldH * 0.42,
      });
    }

    return { subX, subY };
  }

  private raycastTile(clientX: number, clientY: number): [number, number] | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_pointerNdc, this.camera);
    if (!_raycaster.ray.intersectPlane(_groundPlane, _intersectPt)) return null;

    const gx = Math.floor(_intersectPt.x + this.gridOffsetX);
    const gz = Math.floor(_intersectPt.z + this.gridOffsetZ);
    if (gx < 0 || gz < 0 || gx >= this.gridW || gz >= this.gridH) return null;
    return [gx, gz];
  }

  private bindInputEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
  }

  private readonly onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private getPinchDistance(): number {
    const pts = Array.from(this.activePointers.values());
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  private readonly onPointerDown = (e: PointerEvent) => {
    const store = useGameStore.getState();
    if (store.screen !== 'playing') return;

    // Right click cancels build mode cleanly
    if (e.button === 2) {
      if (store.buildTool !== 'select') {
        store.cancelBuild();
      } else {
        store.selectItemUid(null);
        store.selectStaffId(null);
      }
      return;
    }

    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Entering 2-finger pinch-to-zoom gesture on touch devices
    if (this.activePointers.size >= 2) {
      this.pinchStartDist = this.getPinchDistance();
      this.wasPinching = true;
      this.dragMoved = true;
      this.isDragging = true;
      return;
    }

    this.wasPinching = false;
    this.isDragging = true;
    this.dragMoved = false;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    // Immediately show tile hover ghost when tapping on touch devices
    if (e.pointerType === 'touch' && e.target === this.renderer.domElement) {
      this.hoveredTile = this.raycastTile(e.clientX, e.clientY);
    }
  };

  private readonly onPointerMove = (e: PointerEvent) => {
    this.pointerClientX = e.clientX;
    this.pointerClientY = e.clientY;

    if (this.activePointers.has(e.pointerId)) {
      this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // 2-finger pinch-to-zoom on mobile/tablet
    if (this.activePointers.size >= 2) {
      const dist = this.getPinchDistance();
      if (this.pinchStartDist > 0) {
        const ratio = dist / this.pinchStartDist;
        if (ratio > 1.2) {
          this.zoomIndex = Math.min(ZOOM_STEPS.length - 1, this.zoomIndex + 1);
          this.pinchStartDist = dist;
        } else if (ratio < 0.82) {
          this.zoomIndex = Math.max(0, this.zoomIndex - 1);
          this.pinchStartDist = dist;
        }
      }
      return;
    }

    if (this.isDragging) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      // Slightly more forgiving tap threshold on touchscreens
      const dragThreshold = e.pointerType === 'touch' ? 11 : 6;
      if (Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY) > dragThreshold) {
        this.dragMoved = true;
      }

      if (this.dragMoved) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const worldW = (this.camera.right - this.camera.left) / this.camera.zoom;
        const scale = worldW / Math.max(1, rect.width);

        const rightX = Math.cos(this.currentYaw);
        const rightZ = -Math.sin(this.currentYaw);
        const fwdX = -Math.sin(this.currentYaw);
        const fwdZ = -Math.cos(this.currentYaw);

        this.camTargetX -= rightX * dx * scale - fwdX * dy * scale * 1.45;
        this.camTargetZ -= rightZ * dx * scale - fwdZ * dy * scale * 1.45;
        return;
      }
    }

    // Hover raycast only when pointer is over the canvas
    if (e.target === this.renderer.domElement) {
      const tile = this.raycastTile(e.clientX, e.clientY);
      this.hoveredTile = tile;
      if (tile) {
        const item = findItemAtTile(useGameStore.getState().game, tile[0], tile[1]);
        this.hoveredItemUid = item?.uid ?? null;
      } else {
        this.hoveredItemUid = null;
      }
    }
  };

  private readonly onPointerUp = (e: PointerEvent) => {
    this.activePointers.delete(e.pointerId);

    // If one finger remains after a pinch, smoothly reset drag anchor without firing a tap
    if (this.activePointers.size === 1) {
      const remaining = Array.from(this.activePointers.values())[0];
      this.lastPointerX = remaining.x;
      this.lastPointerY = remaining.y;
      this.dragMoved = true;
      return;
    }

    if (!this.isDragging) return;
    this.isDragging = false;
    if (this.wasPinching) {
      this.wasPinching = false;
      return;
    }
    if (this.dragMoved) return;
    if (e.target !== this.renderer.domElement) return;

    const store = useGameStore.getState();
    if (store.screen !== 'playing') return;
    const tile = this.raycastTile(e.clientX, e.clientY);
    if (!tile) return;
    const [gx, gz] = tile;

    if (store.buildTool === 'place' || store.buildTool === 'move') {
      store.placeAtTile(gx, gz);
      return;
    }

    if (store.buildTool === 'sell') {
      const hit = findItemAtTile(store.game, gx, gz);
      if (hit) store.sellItemByUid(hit.uid);
      return;
    }

    // Select mode: check nearby staff first, then placed item
    const wx = gx + 0.5;
    const wz = gz + 0.5;
    const hitRadius = e.pointerType === 'touch' ? 0.95 : 0.72;
    const clickedStaff = store.game.staff.find(
      (s) => Math.hypot(s.x - wx, s.z - wz) < hitRadius,
    );
    if (clickedStaff) {
      store.selectStaffId(clickedStaff.id);
      return;
    }

    const hitItem = findItemAtTile(store.game, gx, gz);
    store.selectItemUid(hitItem?.uid ?? null);
  };

  private readonly onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      this.zoomIndex = Math.min(ZOOM_STEPS.length - 1, this.zoomIndex + 1);
    } else if (e.deltaY > 0) {
      this.zoomIndex = Math.max(0, this.zoomIndex - 1);
    }
  };

  private readonly onKeyDown = (e: KeyboardEvent) => {
    // Ignore typing in input fields
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const store = useGameStore.getState();

    // Secret Cheat Menu chord: Ctrl+Shift+L (or Cmd+Shift+L on macOS)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyL') {
      e.preventDefault();
      if (store.screen !== 'title') {
        store.toggleCheatMenu();
      }
      return;
    }

    if (e.code === 'Backquote') {
      e.preventDefault();
      store.toggleDebug();
      return;
    }

    if (store.screen === 'title') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (store.hasExistingSave) store.continueLab();
        else store.startNewLab();
      }
      return;
    }

    if (e.code === 'Escape') {
      e.preventDefault();
      if (store.cheatMenuOpen) {
        store.closeCheatMenu();
      } else if (store.buildTool !== 'select') {
        store.cancelBuild();
      } else if (store.activeDrawer) {
        store.setActiveDrawer(null);
      } else if (store.screen === 'playing') {
        store.setScreen('paused');
      } else if (store.screen === 'paused') {
        store.setScreen('playing');
      }
      return;
    }

    if (store.screen !== 'playing') return;

    this.keysDown.add(e.code);

    if (e.code === 'KeyQ') {
      this.rotQuarter = (this.rotQuarter + 3) % 4;
      this.targetYaw = Math.PI / 4 + this.rotQuarter * (Math.PI / 2);
    } else if (e.code === 'KeyE') {
      this.rotQuarter = (this.rotQuarter + 1) % 4;
      this.targetYaw = Math.PI / 4 + this.rotQuarter * (Math.PI / 2);
    } else if (e.code === 'KeyR') {
      if (store.buildTool === 'place' || store.buildTool === 'move') {
        store.rotateBuild();
      }
    } else if (e.code === 'Space') {
      e.preventDefault();
      store.setSpeed(store.game.speed === 0 ? 1 : 0);
    } else if (e.code === 'Digit1') {
      store.setSpeed(1);
    } else if (e.code === 'Digit2') {
      store.setSpeed(2);
    } else if (e.code === 'Digit3') {
      store.setSpeed(4);
    } else if (e.code === 'KeyB') {
      store.setActiveDrawer('build');
    } else if (e.code === 'KeyP') {
      store.setScreen('paused');
    } else if (e.code === 'KeyM') {
      store.updateSettings({ muted: !store.game.settings.muted });
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent) => {
    this.keysDown.delete(e.code);
  };

  private readonly onWindowBlur = () => {
    this.keysDown.clear();
    this.isDragging = false;
  };

  private handleResize(): void {
    const w = Math.max(320, this.container.clientWidth || window.innerWidth);
    const h = Math.max(200, this.container.clientHeight || window.innerHeight);
    this.renderer.setSize(w, h);
    const scale = useGameStore.getState().game.settings.pixelScale;
    this.pipeline.resize(w, h, scale);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 75);
        }
      };
      this.frameId = window.setTimeout(poll, 6);
    } else {
      this.frameId = window.setTimeout(cb, 85);
    }
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private readonly tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = Math.min(0.1, Math.max(0.001, (now - this.lastTimeMs) / 1000));
    this.lastTimeMs = now;
    this.elapsedRealSec += rawDt;

    // Throttle simulation & React store updates to ~10Hz (every 0.1s) so HUD never churns at 60Hz
    this.simAccumSec += rawDt;
    if (this.simAccumSec >= 0.1) {
      const step = Math.min(0.25, this.simAccumSec);
      this.simAccumSec = 0;
      useGameStore.getState().tickSim(step);
    }

    // Periodic autosave
    const store = useGameStore.getState();
    if (store.screen === 'playing') {
      this.autoSaveAccumSec += rawDt;
      if (this.autoSaveAccumSec >= BALANCE.autoSaveIntervalSec) {
        this.autoSaveAccumSec = 0;
        try {
          window.localStorage.setItem(
            'project_labs_save_v1',
            JSON.stringify({ ...store.game, lastSavedAtMs: Date.now() }),
          );
        } catch {
          // Ignore quota errors
        }
      }
    }

    this.syncWorldFromStore(false);
    this.updateBuildGhostAndSelection();
    this.updateDayNightAndLEDs(rawDt);

    // Smooth 60fps voxel staff & particle updates
    const freshStore = useGameStore.getState();
    this.staffRenderer.update(
      freshStore.game.staff,
      rawDt,
      freshStore.selectedStaffId,
      this.gridOffsetX,
      this.gridOffsetZ,
    );
    this.particles.update(rawDt);

    const { subX, subY } = this.updateCameraAndComputeSnap(rawDt);
    this.updateWallCutaway(rawDt);

    const settings = freshStore.game.settings;
    const isSellHover = freshStore.buildTool === 'sell' && this.hoveredItemUid !== null;

    this.pipeline.render(this.scene, this.camera, {
      outlines: settings.outlines,
      quantize: settings.paletteQuantize,
      subPixelTexelX: subX,
      subPixelTexelY: subY,
      highlightScene: this.highlightClone ? this.highlightScene : null,
      highlightColor: isSellHover ? '#e0534f' : '#faf7eb',
    });

    this.scheduleNextFrame();
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);

    this.clearBuildingShell();
    this.pipeline.dispose();
    this.staffRenderer.dispose();
    this.particles.dispose();
    this.modelFactory.dispose();
    this.textures.dispose();
    Object.values(this.floorMaterials).forEach((m) => m.dispose());
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
