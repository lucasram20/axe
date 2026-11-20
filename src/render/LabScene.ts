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
import {
  getActiveCampusBuildings,
  LAND_PARCELS,
  type BuildingFootprint,
} from '../sim/facility';
import { canPlaceItem, findItemAtTile, floorIndex, getRotatedFootprint } from '../sim/grid';
import type { PlacedItem, RotationQuarter } from '../sim/types';
import { useGameStore } from '../store/useGameStore';
import {
  buildPlacedItemsInstanced,
  clearItemTemplateCache,
  detectLowEndDevice,
  InstancedBoxBucket,
  type EffectivePerfTier,
  type PerformanceMode,
} from './instancedBatcher';
import { VoxelModelFactory } from './models';
import { VoxelParticlePool } from './particles';
import { PixelRenderPipeline } from './pixelPipeline';
import { InstancedStaffRenderer } from './staffRenderer';
import { createPixelTextures, type PixelTexturePack } from './textures';

const ISO_PITCH = Math.atan(1 / Math.sqrt(2)); // ~35.264 deg true isometric angle
const ZOOM_STEPS = [0.2, 0.28, 0.38, 0.52, 0.72, 0.96, 1.28];

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

interface PerfTierProfile {
  maxDim: number;
  fastOutlines: boolean;
  allowShadows: boolean;
  shadowMapSize: number;
  particleInterval: number;
  maxParticlesPerTick: number;
  simInterval: number;
}

const PERF_PROFILES: Record<EffectivePerfTier, PerfTierProfile> = {
  low: {
    maxDim: 800,
    fastOutlines: true,
    allowShadows: false,
    shadowMapSize: 512,
    particleInterval: 0.55,
    maxParticlesPerTick: 4,
    simInterval: 0.16,
  },
  balanced: {
    maxDim: 1120,
    fastOutlines: true,
    allowShadows: true,
    shadowMapSize: 512,
    particleInterval: 0.35,
    maxParticlesPerTick: 8,
    simInterval: 0.125,
  },
  high: {
    maxDim: 1440,
    fastOutlines: false,
    allowShadows: true,
    shadowMapSize: 1024,
    particleInterval: 0.26,
    maxParticlesPerTick: 16,
    simInterval: 0.1,
  },
};

const FLOOR_TYPES: readonly FloorType[] = ['grass', 'garage', 'lab', 'server', 'lounge'];
const PARTICLE_ITEM_IDS = new Set([
  'cooling_tower',
  'cryo_spire',
  'coffee_machine',
  'quantum_core',
  'singularity_core',
  'fusion_reactor',
  'gpu_rig_2010',
  'tensor_pod',
  'liquid_cluster',
]);

const _floorMat4 = new THREE.Matrix4();

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

  // Adaptive performance state
  private autoDetectedTier: EffectivePerfTier;
  private effectivePerfTier: EffectivePerfTier;
  private lastAppliedPerfMode: PerformanceMode = 'auto';
  private lastAppliedMaxDim = 0;
  private lastAppliedShadowSize = 1024;
  private avgFrameMs = 16.6;
  private slowFrameAccumSec = 0;
  private shadowUpdateAccumSec = 0;
  private shadowDirty = true;
  private perfReportAccumSec = 0;

  // Grid & world containers
  private readonly gridW = BALANCE.gridWidth;
  private readonly gridH = BALANCE.gridHeight;
  private readonly gridOffsetX = BALANCE.gridWidth / 2;
  private readonly gridOffsetZ = BALANCE.gridHeight / 2;

  private readonly floorMaterials: Record<FloorType, THREE.MeshToonMaterial>;
  private readonly floorInstancedMeshes: Record<FloorType, THREE.InstancedMesh>;
  private readonly floorTileGeo: THREE.BoxGeometry;
  private readonly floorStateCache: FloorType[] = [];
  private lastFloorsRef: readonly FloorType[] | null = null;

  private readonly buildingShellGroup = new THREE.Group();
  private wallAssemblies: WallAssembly[] = [];
  private shellWindowMats: THREE.MeshToonMaterial[] = [];
  private shellGlowMats: THREE.MeshToonMaterial[] = [];
  private shellInstancedMeshes: THREE.InstancedMesh[] = [];
  private shellDisposables: Array<THREE.BufferGeometry | THREE.Material> = [];
  private lastShellSignature = '';
  private streetLampBulbMat: THREE.MeshToonMaterial | null = null;
  private surroundingShadowMeshes: THREE.Object3D[] = [];

  private readonly placedGroup = new THREE.Group();
  private placedItemMeshes: THREE.InstancedMesh[] = [];
  private itemNightGlowMats: THREE.MeshToonMaterial[] = [];
  private itemBlinkMats: THREE.MeshToonMaterial[] = [];
  private readonly placedItemMap = new Map<string, PlacedItem>();
  private particleSourceItems: PlacedItem[] = [];
  private lastItemsRef: readonly PlacedItem[] | null = null;
  private lastItemsEra = -1;
  private lastItemsMovingUid: string | null = null;
  private lastItemsShadows = true;

  // Build ghost & hover highlight
  private ghostGroup: THREE.Group | null = null;
  private ghostItemId: string | null = null;
  private readonly ghostTileRing: THREE.Mesh;
  private readonly selectionRing: THREE.Mesh;
  private highlightClone: THREE.Object3D | null = null;
  private lastHighlightUid: string | null = null;

  // Camera rig state (default centered cleanly on Main HQ garage inside 40x40 estate)
  private camTargetX = 0;
  private camTargetZ = 0;
  private zoomIndex = 4; // 0.86x default (zooms all the way out to 0.26x for full 15-building 6F skyline!)
  private currentZoom = ZOOM_STEPS[4];
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
    this.autoDetectedTier = detectLowEndDevice(this.isSoftwareGl);

    const initialSettings = useGameStore.getState().game.settings;
    const initMode = initialSettings.performanceMode ?? 'auto';
    this.lastAppliedPerfMode = initMode;
    this.effectivePerfTier = initMode === 'auto' ? this.autoDetectedTier : initMode;
    const initProfile = PERF_PROFILES[this.effectivePerfTier];

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
    this.renderer.info.autoReset = false;
    const initialShadows = !this.isSoftwareGl && initialSettings.shadows && initProfile.allowShadows;
    this.renderer.shadowMap.enabled = initialShadows;
    this.renderer.shadowMap.autoUpdate = false; // Throttled 4Hz shadow updates instead of 60Hz!
    this.renderer.shadowMap.needsUpdate = true;
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
    this.staffRenderer.setShadowsEnabled(initialShadows);
    this.particles = new VoxelParticlePool();

    // True Isometric Orthographic Camera (deep near/far range so 6F skyscrapers never clip)
    const aspect = width / height;
    const frustumH = 12.5;
    this.camera = new THREE.OrthographicCamera(
      (-frustumH * aspect) / 2,
      (frustumH * aspect) / 2,
      frustumH / 2,
      -frustumH / 2,
      0.5,
      200,
    );
    this.camera.zoom = this.currentZoom;
    this.camera.updateProjectionMatrix();

    this.lastAppliedMaxDim = initProfile.maxDim;
    this.pipeline = new PixelRenderPipeline(
      this.renderer,
      width,
      height,
      initialSettings.pixelScale,
    );
    this.pipeline.resize(width, height, initialSettings.pixelScale, initProfile.maxDim);

    // Lighting: bright, crisp low-poly architectural sunlight + clean sky-ground bounce
    this.hemiLight = new THREE.HemisphereLight('#fff8eb', '#5e5869', 1.05);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff2d6', 1.65);
    this.sunLight.position.set(24, 36, 18);
    this.sunLight.castShadow = initialShadows;
    this.lastAppliedShadowSize = initProfile.shadowMapSize;
    this.sunLight.shadow.mapSize.set(initProfile.shadowMapSize, initProfile.shadowMapSize);
    this.sunLight.shadow.camera.left = -36;
    this.sunLight.shadow.camera.right = 36;
    this.sunLight.shadow.camera.top = 36;
    this.sunLight.shadow.camera.bottom = -36;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 110;
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

    // 5 InstancedMeshes for the entire 40x40 (1,600-tile) interactive campus floor!
    const maxTiles = this.gridW * this.gridH;
    this.floorTileGeo = new THREE.BoxGeometry(0.995, 0.06, 0.995);
    this.floorInstancedMeshes = {
      grass: new THREE.InstancedMesh(this.floorTileGeo, this.floorMaterials.grass, maxTiles),
      garage: new THREE.InstancedMesh(this.floorTileGeo, this.floorMaterials.garage, maxTiles),
      lab: new THREE.InstancedMesh(this.floorTileGeo, this.floorMaterials.lab, maxTiles),
      server: new THREE.InstancedMesh(this.floorTileGeo, this.floorMaterials.server, maxTiles),
      lounge: new THREE.InstancedMesh(this.floorTileGeo, this.floorMaterials.lounge, maxTiles),
    };
    for (const ft of FLOOR_TYPES) {
      const m = this.floorInstancedMeshes[ft];
      m.count = 0;
      m.receiveShadow = true;
      m.castShadow = false;
      m.frustumCulled = false;
      this.scene.add(m);
    }

    this.buildSurroundings();

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
    // Extended outdoor lawn slab so the 40x40 15-building estate sits grounded in a lush tech park
    const lawnGeo = new THREE.BoxGeometry(144, 0.6, 144);
    const lawnTex = this.textures.floors.grass.clone();
    lawnTex.repeat.set(144, 144);
    lawnTex.needsUpdate = true;
    const lawnMat = new THREE.MeshToonMaterial({
      map: lawnTex,
      gradientMap: this.textures.toonGradient,
    });
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.position.set(0, -0.34, 0);
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    // Paved tech-park access road along the south edge
    const roadTex = this.textures.road.clone();
    roadTex.repeat.set(72, 1);
    roadTex.needsUpdate = true;
    const roadGeo = new THREE.BoxGeometry(144, 0.06, 3.0);
    const roadMat = new THREE.MeshToonMaterial({
      map: roadTex,
      gradientMap: this.textures.toonGradient,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(0, -0.02, this.gridOffsetZ + 2.5);
    road.receiveShadow = true;
    this.scene.add(road);

    // Sidewalk strip between campus plot and road
    const curbGeo = new THREE.BoxGeometry(this.gridW + 8, 0.08, 1.0);
    const curbMat = new THREE.MeshToonMaterial({
      color: '#d8d2c7',
      gradientMap: this.textures.toonGradient,
    });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(0, -0.01, this.gridOffsetZ + 0.65);
    curb.receiveShadow = true;
    this.scene.add(curb);

    // Paved main campus entrance driveway apron connecting the access road to the central boulevard
    const apronGeo = new THREE.BoxGeometry(4.2, 0.065, 2.5);
    const apronMat = new THREE.MeshToonMaterial({
      color: '#737988',
      gradientMap: this.textures.toonGradient,
    });
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.position.set(0, -0.004, this.gridOffsetZ + 0.85);
    apron.receiveShadow = true;
    this.scene.add(apron);

    // Instanced campus streetlamps along the sidewalk (3 draw calls total instead of 24!)
    const lampXs = [-18, -12.5, -7.2, -2.6, 2.6, 7.2, 12.5, 18];
    const poleGeo = new THREE.BoxGeometry(0.11, 2.1, 0.11);
    const armGeo = new THREE.BoxGeometry(0.11, 0.09, 0.48);
    const bulbGeo = new THREE.BoxGeometry(0.2, 0.12, 0.2);
    const poleMat = new THREE.MeshToonMaterial({ color: '#394052', gradientMap: this.textures.toonGradient });
    this.streetLampBulbMat = new THREE.MeshToonMaterial({
      color: '#fff2ba',
      emissive: '#ffe478',
      emissiveIntensity: 0.45,
      gradientMap: this.textures.toonGradient,
    });
    const polesInst = new THREE.InstancedMesh(poleGeo, poleMat, lampXs.length);
    const armsInst = new THREE.InstancedMesh(armGeo, poleMat, lampXs.length);
    const bulbsInst = new THREE.InstancedMesh(bulbGeo, this.streetLampBulbMat, lampXs.length);
    const lampDummy = new THREE.Object3D();
    lampXs.forEach((lx, idx) => {
      lampDummy.position.set(lx, 1.05, this.gridOffsetZ + 0.9);
      lampDummy.scale.set(1, 1, 1);
      lampDummy.rotation.set(0, 0, 0);
      lampDummy.updateMatrix();
      polesInst.setMatrixAt(idx, lampDummy.matrix);

      lampDummy.position.set(lx, 2.08, this.gridOffsetZ + 1.1);
      lampDummy.updateMatrix();
      armsInst.setMatrixAt(idx, lampDummy.matrix);

      lampDummy.position.set(lx, 2.0, this.gridOffsetZ + 1.3);
      lampDummy.updateMatrix();
      bulbsInst.setMatrixAt(idx, lampDummy.matrix);
    });
    polesInst.castShadow = this.renderer.shadowMap.enabled;
    polesInst.frustumCulled = false;
    armsInst.frustumCulled = false;
    bulbsInst.frustumCulled = false;
    polesInst.instanceMatrix.needsUpdate = true;
    armsInst.instanceMatrix.needsUpdate = true;
    bulbsInst.instanceMatrix.needsUpdate = true;
    this.scene.add(polesInst, armsInst, bulbsInst);
    this.surroundingShadowMeshes.push(polesInst);

    // Cutaway architectural slab foundation border framing the 40x40 campus estate
    const borderGeo = new THREE.BoxGeometry(this.gridW + 0.56, 0.24, this.gridH + 0.56);
    const borderMat = new THREE.MeshToonMaterial({
      color: '#434859',
      gradientMap: this.textures.toonGradient,
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(0, -0.145, 0);
    border.receiveShadow = true;
    this.scene.add(border);

    // Instanced voxel trees around the 40x40 campus perimeter (well outside +/-20 estate bounds)
    const treePositions: Array<[number, number, number]> = [
      [-23.5, 0, -22.8], [-17.5, 0, -23.6], [-11.0, 0, -23.0], [-4.5, 0, -23.5],
      [2.2, 0, -23.2], [8.8, 0, -23.6], [15.4, 0, -22.9], [22.2, 0, -23.1],
      [23.6, 0, -16.5], [23.2, 0, -9.8], [23.8, 0, -3.0], [23.1, 0, 3.8], [23.6, 0, 10.6], [23.2, 0, 17.2],
      [-23.6, 0, -16.2], [-23.1, 0, -9.4], [-23.8, 0, -2.6], [-23.2, 0, 4.2], [-23.7, 0, 11.0], [-23.3, 0, 17.4],
      [-27.2, 0, -12.0], [27.4, 0, -6.0], [27.0, 0, 8.5], [-27.0, 0, 9.2],
      [-19.0, 0, 26.2], [-11.5, 0, 26.5], [-4.0, 0, 26.1], [4.0, 0, 26.4], [11.5, 0, 26.0], [19.0, 0, 26.3],
    ];

    const trunkGeo = new THREE.BoxGeometry(0.42, 1.15, 0.42);
    const canopyGeo = new THREE.BoxGeometry(1.55, 1.4, 1.55);
    const topGeo = new THREE.BoxGeometry(1.0, 0.85, 1.0);
    const trunkMat = new THREE.MeshToonMaterial({ color: '#8a4623', gradientMap: this.textures.toonGradient });
    const canopyMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: this.textures.toonGradient });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
    const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treePositions.length);
    const tops = new THREE.InstancedMesh(topGeo, canopyMat, treePositions.length);

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    const greens = ['#284d2c', '#467d39', '#66ad45'];

    treePositions.forEach(([x, , z], idx) => {
      const s = 0.92 + (idx % 4) * 0.12;
      dummy.position.set(x, 0.58 * s, z);
      dummy.scale.set(s, s, s);
      dummy.rotation.set(0, (idx % 4) * 0.5, 0);
      dummy.updateMatrix();
      trunks.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(x, 1.62 * s, z);
      dummy.updateMatrix();
      canopies.setMatrixAt(idx, dummy.matrix);
      col.set(greens[idx % greens.length]);
      canopies.setColorAt(idx, col);

      dummy.position.set(x, 2.5 * s, z);
      dummy.updateMatrix();
      tops.setMatrixAt(idx, dummy.matrix);
      col.set(greens[(idx + 1) % greens.length]);
      tops.setColorAt(idx, col);
    });

    for (const m of [trunks, canopies, tops]) {
      m.castShadow = this.renderer.shadowMap.enabled;
      m.receiveShadow = true;
      m.frustumCulled = false;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      this.scene.add(m);
      this.surroundingShadowMeshes.push(m);
    }
  }

  private syncFloorGrid(floors: readonly FloorType[], force: boolean): void {
    if (!force && floors === this.lastFloorsRef) return;
    let changed = force || this.floorStateCache.length !== floors.length;
    if (!changed) {
      for (let i = 0; i < floors.length; i++) {
        if (this.floorStateCache[i] !== floors[i]) {
          changed = true;
          break;
        }
      }
    }
    this.lastFloorsRef = floors;
    if (!changed) return;

    this.floorStateCache.length = floors.length;
    const counts: Record<FloorType, number> = {
      grass: 0,
      garage: 0,
      lab: 0,
      server: 0,
      lounge: 0,
    };

    for (let gz = 0; gz < this.gridH; gz++) {
      const wz = gz - this.gridOffsetZ + 0.5;
      for (let gx = 0; gx < this.gridW; gx++) {
        const idx = floorIndex(gx, gz, this.gridW);
        const fType = floors[idx] ?? 'grass';
        this.floorStateCache[idx] = fType;
        const slot = counts[fType]++;
        _floorMat4.makeTranslation(
          gx - this.gridOffsetX + 0.5,
          fType === 'grass' ? -0.04 : 0.0,
          wz,
        );
        this.floorInstancedMeshes[fType].setMatrixAt(slot, _floorMat4);
      }
    }

    for (const ft of FLOOR_TYPES) {
      const m = this.floorInstancedMeshes[ft];
      m.count = counts[ft];
      m.instanceMatrix.needsUpdate = true;
    }
    this.shadowDirty = true;
  }

  private clearPlacedItemMeshes(): void {
    for (const m of this.placedItemMeshes) {
      this.placedGroup.remove(m);
      m.dispose();
    }
    this.placedItemMeshes = [];
    this.itemNightGlowMats = [];
    this.itemBlinkMats = [];
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

    // 0. Resolve effective performance tier & apply resolution/shadow changes
    const perfMode: PerformanceMode = game.settings.performanceMode ?? 'auto';
    if (perfMode !== this.lastAppliedPerfMode) {
      this.lastAppliedPerfMode = perfMode;
      this.effectivePerfTier = perfMode === 'auto' ? this.autoDetectedTier : perfMode;
      this.slowFrameAccumSec = 0;
    }
    const profile = PERF_PROFILES[this.effectivePerfTier];
    const wantShadows = !this.isSoftwareGl && game.settings.shadows && profile.allowShadows;

    if (
      game.settings.pixelScale !== this.pipeline.pixelScale ||
      profile.maxDim !== this.lastAppliedMaxDim
    ) {
      this.lastAppliedMaxDim = profile.maxDim;
      this.handleResize();
    }

    if (this.renderer.shadowMap.enabled !== wantShadows) {
      this.renderer.shadowMap.enabled = wantShadows;
      this.sunLight.castShadow = wantShadows;
      this.staffRenderer.setShadowsEnabled(wantShadows);
      for (const m of this.surroundingShadowMeshes) {
        m.castShadow = wantShadows;
      }
      this.shadowDirty = true;
    }

    if (wantShadows && profile.shadowMapSize !== this.lastAppliedShadowSize) {
      this.lastAppliedShadowSize = profile.shadowMapSize;
      this.sunLight.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
      this.shadowDirty = true;
    }

    // 1. Sync instanced 40x40 floor tiles (5 draw calls total!)
    this.syncFloorGrid(game.floors, force);

    // 1b. Rebuild batched multi-building multi-story cutaway architectural shells on changes
    const eraIdx = Math.min(Math.max(0, game.eraIndex), ERA_BUILDING_THEMES.length - 1);
    const ownedKey = (game.ownedLandIds ?? []).join(',');
    const storiesKey = Object.entries(game.buildingStories ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    const shellSig = `e${eraIdx}|t${game.buildingTier ?? 0}|l:${ownedKey}|s:${storiesKey}|sh:${wantShadows ? 1 : 0}`;
    if (force || shellSig !== this.lastShellSignature) {
      this.lastShellSignature = shellSig;
      const buildings = getActiveCampusBuildings(game);
      this.rebuildCampusShell(buildings, game.ownedLandIds ?? [], eraIdx, wantShadows);
      this.shadowDirty = true;
    }

    // 2. Sync batched instanced placed items (~25 draw calls for 300+ items!)
    const eraChanged = this.lastItemsEra !== -1 && this.lastItemsEra !== eraIdx;
    const itemsChanged =
      force ||
      game.items !== this.lastItemsRef ||
      eraIdx !== this.lastItemsEra ||
      store.movingItemUid !== this.lastItemsMovingUid ||
      wantShadows !== this.lastItemsShadows;

    if (itemsChanged) {
      if (eraChanged) {
        this.ghostItemId = null;
        this.lastHighlightUid = null;
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

      this.clearPlacedItemMeshes();
      const batched = buildPlacedItemsInstanced(
        game.items,
        eraIdx,
        store.movingItemUid,
        this.modelFactory,
        this.gridOffsetX,
        this.gridOffsetZ,
        this.placedGroup,
        wantShadows,
      );
      this.placedItemMeshes = batched.meshes;
      this.itemNightGlowMats = batched.nightGlowMats;
      this.itemBlinkMats = batched.blinkMats;

      this.placedItemMap.clear();
      this.particleSourceItems = [];
      for (let i = 0; i < game.items.length; i++) {
        const it = game.items[i];
        this.placedItemMap.set(it.uid, it);
        if (PARTICLE_ITEM_IDS.has(it.itemId)) {
          this.particleSourceItems.push(it);
        }
      }

      this.lastItemsRef = game.items;
      this.lastItemsEra = eraIdx;
      this.lastItemsMovingUid = store.movingItemUid;
      this.lastItemsShadows = wantShadows;
      this.shadowDirty = true;
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
        const item = this.placedItemMap.get(highlightUid);
        if (item) {
          const built = this.modelFactory.createModel(item.itemId, game.eraIndex);
          const [wx, wz] = this.itemWorldCenter(item);
          built.group.position.set(wx, 0.03, wz);
          built.group.rotation.y = (item.rotation * Math.PI) / 2;
          this.highlightClone = built.group;
          this.highlightScene.add(this.highlightClone);
        }
      }
    }

    if (selectedItemUid && store.screen === 'playing') {
      const item = this.placedItemMap.get(selectedItemUid);
      if (item) {
        const [w, d] = getRotatedFootprint(item.itemId, item.rotation);
        const [wx, wz] = this.itemWorldCenter(item);
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
    // Only touches ~12 shared materials instead of traversing 2,000+ meshes every frame!
    const nightGlow = 1 - dayFactor * 0.72;
    const winEmissive = 0.2 + nightGlow * 0.78;
    for (let i = 0; i < this.shellWindowMats.length; i++) {
      this.shellWindowMats[i].emissiveIntensity = winEmissive;
    }
    const shellPulse = 0.65 + Math.sin(this.elapsedRealSec * 2.6) * 0.25 + nightGlow * 0.35;
    for (let i = 0; i < this.shellGlowMats.length; i++) {
      this.shellGlowMats[i].emissiveIntensity = shellPulse;
    }
    if (this.streetLampBulbMat) {
      this.streetLampBulbMat.emissiveIntensity = 0.2 + nightGlow * 1.1;
    }

    const isTraining = game.trainingJobs.length > 0;
    const blinkPhase = this.elapsedRealSec * (isTraining ? 7.5 : 3.2);
    const itemGlow = 0.22 + nightGlow * 0.85;
    for (let i = 0; i < this.itemNightGlowMats.length; i++) {
      this.itemNightGlowMats[i].emissiveIntensity = itemGlow;
    }
    for (let i = 0; i < this.itemBlinkMats.length; i++) {
      this.itemBlinkMats[i].emissiveIntensity =
        Math.sin(blinkPhase + i * 1.65) > 0.05 ? 1.25 : 0.24;
    }

    // Spawn ambient steam puffs, cooling mist & quantum/singularity compute sparks (capped per tier!)
    const profile = PERF_PROFILES[this.effectivePerfTier];
    this.particleSpawnAccum += dt;
    if (this.particleSpawnAccum >= profile.particleInterval && this.particleSourceItems.length > 0) {
      this.particleSpawnAccum = 0;
      const src = this.particleSourceItems;
      const maxSpawns = profile.maxParticlesPerTick;
      // Rotate starting offset so every tower/rig across a 15-building campus emits evenly
      const startIdx = Math.floor(this.elapsedRealSec * 7) % src.length;
      let spawned = 0;
      for (let k = 0; k < src.length && spawned < maxSpawns; k++) {
        const entry = src[(startIdx + k) % src.length];
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
          spawned++;
        } else if (entry.itemId === 'coffee_machine' && Math.random() < 0.35) {
          this.particles.spawn(wx, 0.98, wz, 0.05, 0.35, 0.02, 0.07, 0.9, '#faf7eb');
          spawned++;
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
          spawned++;
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
          spawned++;
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
          spawned++;
        }
      }
    }
  }

  private clearBuildingShell(): void {
    this.buildingShellGroup.clear();
    for (const m of this.shellInstancedMeshes) {
      m.dispose();
    }
    this.shellInstancedMeshes = [];
    for (const item of this.shellDisposables) {
      item.dispose();
    }
    this.shellDisposables = [];
    this.wallAssemblies = [];
    this.shellWindowMats = [];
    this.shellGlowMats = [];
  }

  /**
   * Builds batched InstancedMesh Era-themed architectural cutaway buildings for Main HQ +
   * all 14 owned Land Expansion buildings (up to 6F skyscrapers), paved campus walkways,
   * and subtle survey stakes in ~18 visible draw calls total (down from ~3,300!).
   */
  private rebuildCampusShell(
    buildings: BuildingFootprint[],
    ownedLandIds: string[],
    eraIdx: number,
    allowShadows: boolean,
  ): void {
    this.clearBuildingShell();
    const theme = ERA_BUILDING_THEMES[eraIdx] ?? ERA_BUILDING_THEMES[0];

    // Harmonize interior floor material tones with the current Era aesthetic
    this.floorMaterials.garage.color.set(theme.floorTint.garage);
    this.floorMaterials.lab.color.set(theme.floorTint.lab);
    this.floorMaterials.server.color.set(theme.floorTint.server);
    this.floorMaterials.lounge.color.set(theme.floorTint.lounge);

    const wallThick = 0.22;
    const curbH = 0.24;

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
    const dcExtMat = track(
      new THREE.MeshToonMaterial({
        color: eraIdx >= 5 ? '#9fd9f0' : eraIdx >= 2 ? '#4d607a' : '#6f7d94',
        gradientMap: this.textures.toonGradient,
      }),
    );
    const baseMat = track(
      new THREE.MeshToonMaterial({ color: theme.baseboard, gradientMap: this.textures.toonGradient }),
    );
    const corniceMat = track(
      new THREE.MeshToonMaterial({ color: theme.cornice, gradientMap: this.textures.toonGradient }),
    );
    const dcCorniceMat = track(
      new THREE.MeshToonMaterial({
        color: eraIdx >= 6 ? '#ffe478' : '#56c7ff',
        gradientMap: this.textures.toonGradient,
      }),
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
    const dcGlassMat = track(
      new THREE.MeshToonMaterial({
        color: eraIdx >= 6 ? '#d6c4ff' : '#74e4ff',
        emissive: eraIdx >= 6 ? '#c8a8ff' : '#4de0ff',
        emissiveIntensity: 0.45,
        gradientMap: this.textures.toonGradient,
      }),
    );
    this.shellWindowMats.push(glassMat, dcGlassMat);

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
    if (accentMat && theme.accentEmissive) {
      this.shellGlowMats.push(accentMat);
    }

    const walkwayMat = track(
      new THREE.MeshToonMaterial({
        color: eraIdx >= 5 ? '#cfdbe6' : '#b7b3a8',
        gradientMap: this.textures.toonGradient,
      }),
    );
    const stakePostMat = track(
      new THREE.MeshToonMaterial({ color: '#e6b84c', gradientMap: this.textures.toonGradient }),
    );
    const stakeBaseMat = track(
      new THREE.MeshToonMaterial({ color: '#45506b', gradientMap: this.textures.toonGradient }),
    );
    const roofUnitMat = track(
      new THREE.MeshToonMaterial({
        color: eraIdx >= 5 ? '#d0dde8' : '#7b8499',
        gradientMap: this.textures.toonGradient,
      }),
    );
    const antennaMat = track(
      new THREE.MeshToonMaterial({
        color: eraIdx >= 6 ? '#ffe478' : '#a9b5cc',
        gradientMap: this.textures.toonGradient,
      }),
    );
    const beaconMats = new Map<string, THREE.MeshToonMaterial>();
    const getBeaconMat = (hex: string): THREE.MeshToonMaterial => {
      let m = beaconMats.get(hex);
      if (!m) {
        m = track(
          new THREE.MeshToonMaterial({
            color: hex,
            emissive: hex,
            emissiveIntensity: 0.9,
            gradientMap: this.textures.toonGradient,
          }),
        );
        beaconMats.set(hex, m);
        this.shellGlowMats.push(m);
      }
      return m;
    };

    // Static bucket for always-visible ground walkways, survey stakes, corner plinths & curbs
    const staticBucket = new InstancedBoxBucket();
    // 4 compass buckets (all N/S/W/E walls across all 15 buildings batched into 4 cutaway groups!)
    const sideBuckets: Record<'north' | 'south' | 'west' | 'east', InstancedBoxBucket> = {
      north: new InstancedBoxBucket(),
      south: new InstancedBoxBucket(),
      west: new InstancedBoxBucket(),
      east: new InstancedBoxBucket(),
    };

    const addWalkway = (x1: number, x2: number, z1: number, z2: number) => {
      const wx1 = x1 - this.gridOffsetX;
      const wx2 = x2 + 1 - this.gridOffsetX;
      const wz1 = z1 - this.gridOffsetZ;
      const wz2 = z2 + 1 - this.gridOffsetZ;
      staticBucket.addBox(
        walkwayMat,
        (wx1 + wx2) * 0.5,
        0.002,
        (wz1 + wz2) * 0.5,
        wx2 - wx1,
        0.055,
        wz2 - wz1,
        0,
        false,
        true,
      );
    };

    // Main front entrance stone boulevard connecting the south road to Main HQ (and South Plaza if built)
    const hq = buildings[0];
    if (hq) {
      const hasSouthPlaza = ownedLandIds.includes('south_plaza');
      if (!hasSouthPlaza) {
        addWalkway(18, 21, hq.maxZ + 1, this.gridH - 1);
      } else {
        addWalkway(18, 21, 37, this.gridH - 1);
      }
    }

    // Dynamic paved campus walkway network across all 5 columns & 3 rows as land parcels are acquired!
    const hasAny = (ids: string[]) => ids.some((id) => ownedLandIds.includes(id));
    if (hasAny(['east_datacenter', 'ne_superpod', 'se_datacenter'])) {
      addWalkway(25, 25, hasAny(['ne_superpod']) ? 4 : 14, hasAny(['se_datacenter']) ? 35 : 25);
    }
    if (hasAny(['west_annex', 'nw_innovation', 'sw_campus'])) {
      addWalkway(14, 14, hasAny(['nw_innovation']) ? 4 : 14, hasAny(['sw_campus']) ? 35 : 25);
    }
    if (hasAny(['far_east_mega', 'far_east_north', 'far_east_south'])) {
      addWalkway(32, 32, hasAny(['far_east_north']) ? 4 : 14, hasAny(['far_east_south']) ? 35 : 25);
    }
    if (hasAny(['far_west_labs', 'far_west_north', 'far_west_south'])) {
      addWalkway(7, 7, hasAny(['far_west_north']) ? 4 : 14, hasAny(['far_west_south']) ? 35 : 25);
    }
    if (hasAny(['north_research', 'ne_superpod', 'nw_innovation', 'far_east_north', 'far_west_north'])) {
      const px1 = hasAny(['far_west_north']) ? 3 : hasAny(['nw_innovation']) ? 10 : 16;
      const px2 = hasAny(['far_east_north']) ? 36 : hasAny(['ne_superpod']) ? 29 : 23;
      addWalkway(px1, px2, 12, 12);
    }
    if (hasAny(['south_plaza', 'se_datacenter', 'sw_campus', 'far_east_south', 'far_west_south'])) {
      const px1 = hasAny(['far_west_south']) ? 3 : hasAny(['sw_campus']) ? 10 : 16;
      const px2 = hasAny(['far_east_south']) ? 36 : hasAny(['se_datacenter']) ? 29 : 23;
      addWalkway(px1, px2, 27, 27);
    }

    // Subtle expandable land parcel corner survey stakes across all unowned lots
    for (const parcel of LAND_PARCELS) {
      if (ownedLandIds.includes(parcel.id)) continue;
      const pLeft = parcel.minX - this.gridOffsetX + 0.12;
      const pRight = parcel.maxX + 1 - this.gridOffsetX - 0.12;
      const pTop = parcel.minZ - this.gridOffsetZ + 0.12;
      const pBottom = parcel.maxZ + 1 - this.gridOffsetZ - 0.12;
      for (const [sx, sz] of [
        [pLeft, pTop],
        [pRight, pTop],
        [pLeft, pBottom],
        [pRight, pBottom],
      ]) {
        staticBucket.addBox(stakeBaseMat, sx, 0.26, sz, 0.14, 0.52, 0.14, 0, false, false);
        staticBucket.addBox(stakePostMat, sx, 0.54, sz, 0.22, 0.12, 0.22, 0, false, false);
      }
    }

    const buildSingleBuilding = (b: BuildingFootprint) => {
      const wLeft = b.minX - this.gridOffsetX;
      const wRight = b.maxX + 1 - this.gridOffsetX;
      const wTop = b.minZ - this.gridOffsetZ;
      const wBottom = b.maxZ + 1 - this.gridOffsetZ;
      const spanX = wRight - wLeft;
      const spanZ = wBottom - wTop;
      const cx = (wLeft + wRight) * 0.5;
      const cz = (wTop + wBottom) * 0.5;
      const isDC = b.role === 'datacenter';
      const stories = Math.max(1, Math.min(6, b.stories ?? 1));
      const story1H = (isDC ? theme.wallHeight + 0.16 : theme.wallHeight) - curbH;
      const upperStoryH = 0.88;
      const totalUpperH = story1H + (stories - 1) * upperStoryH;

      const bExtMat = isDC ? dcExtMat : wallExtMat;
      const bCorniceMat = isDC ? dcCorniceMat : corniceMat;
      const bGlassMat = isDC ? dcGlassMat : glassMat;

      // 4 architectural corner plinth posts
      const corners: Array<[number, number]> = [
        [wLeft - wallThick * 0.5, wTop - wallThick * 0.5],
        [wRight + wallThick * 0.5, wTop - wallThick * 0.5],
        [wLeft - wallThick * 0.5, wBottom + wallThick * 0.5],
        [wRight + wallThick * 0.5, wBottom + wallThick * 0.5],
      ];
      for (const [px, pz] of corners) {
        staticBucket.addBox(
          baseMat,
          px,
          (curbH + 0.08) * 0.5,
          pz,
          wallThick + 0.14,
          curbH + 0.08,
          wallThick + 0.14,
          0,
          allowShadows,
          true,
        );
      }

      const buildWallSide = (
        side: 'north' | 'south' | 'west' | 'east',
        length: number,
        posX: number,
        posZ: number,
        rotY: number,
      ) => {
        const cos = Math.cos(rotY);
        const sin = Math.sin(rotY);
        const bucket = sideBuckets[side];

        // Helper transforming local wall coords (lx, lyAboveCurb, lz) -> compass upperGroup coords
        const addUpper = (
          mat: THREE.Material,
          lx: number,
          ly: number,
          lz: number,
          sx: number,
          sy: number,
          sz: number,
          castSh = false,
          recvSh = false,
        ) => {
          const wx = posX + lx * cos + lz * sin;
          const wz = posZ - lx * sin + lz * cos;
          bucket.addBox(mat, wx, ly, wz, sx, sy, sz, rotY, allowShadows && castSh, recvSh);
        };

        // Ground curb (always visible even when front wall is cut away)
        staticBucket.addBox(
          baseMat,
          posX,
          curbH * 0.5,
          posZ,
          length + wallThick * 2,
          curbH,
          wallThick + 0.04,
          rotY,
          allowShadows,
          true,
        );

        if (accentMat && (eraIdx >= 5 || isDC)) {
          staticBucket.addBox(
            accentMat,
            posX,
            curbH - 0.03,
            posZ,
            length + wallThick,
            0.05,
            wallThick + 0.07,
            rotY,
            false,
            false,
          );
        }

        // Full multi-story wall core (rises cleanly 1F..6F!)
        addUpper(
          wallMainMat,
          0,
          totalUpperH * 0.5,
          wallThick * 0.21,
          length + wallThick * 1.8,
          totalUpperH,
          wallThick * 0.58,
          true,
          true,
        );
        addUpper(
          bExtMat,
          0,
          totalUpperH * 0.5,
          -wallThick * 0.25,
          length + wallThick * 1.8,
          totalUpperH,
          wallThick * 0.46,
          true,
          true,
        );

        // Top skyscraper roof parapet cornice
        addUpper(
          bCorniceMat,
          0,
          totalUpperH + 0.07,
          0,
          length + wallThick * 2.2,
          0.18,
          wallThick + 0.18,
          true,
          false,
        );

        // Horizontal floor-slab divider bands between every story (2F..6F)
        if (stories > 1) {
          for (let s = 1; s < stories; s++) {
            const beltY = story1H + (s - 1) * upperStoryH;
            addUpper(
              bCorniceMat,
              0,
              beltY,
              0,
              length + wallThick * 2.1,
              0.14,
              wallThick + 0.14,
              true,
              false,
            );
          }
        }

        // Era glowing crown trim strip along the top story
        if (accentMat) {
          addUpper(
            accentMat,
            0,
            totalUpperH - 0.16,
            0,
            length + wallThick * 1.9,
            0.09,
            wallThick + 0.09,
            false,
            false,
          );
        }

        const bayCount = Math.max(2, Math.floor(length / 2.3));
        const baySpacing = length / bayCount;
        const winW = Math.min(1.45, baySpacing * 0.64);

        // Full-height structural bay pilasters
        for (let idxB = 0; idxB < bayCount - 1; idxB++) {
          const px = -length * 0.5 + (idxB + 1) * baySpacing;
          addUpper(
            pilasterMat,
            px,
            totalUpperH * 0.5,
            0,
            0.22,
            totalUpperH + 0.08,
            wallThick + 0.13,
            true,
            false,
          );
        }

        // Stacked illuminated window bays for EVERY story (1F .. stories)
        const winH1 = isDC ? story1H * 0.38 : eraIdx >= 2 ? story1H * 0.62 : story1H * 0.48;
        const winHUpper = isDC ? upperStoryH * 0.42 : eraIdx >= 2 ? upperStoryH * 0.62 : upperStoryH * 0.52;

        for (let s = 0; s < stories; s++) {
          const floorBaseY = s === 0 ? 0 : story1H + (s - 1) * upperStoryH;
          const curH = s === 0 ? story1H : upperStoryH;
          const curWinH = s === 0 ? winH1 : winHUpper;
          const curWinY = floorBaseY + (isDC ? curH * 0.58 : curH * 0.52);

          for (let idxB = 0; idxB < bayCount; idxB++) {
            const bx = -length * 0.5 + (idxB + 0.5) * baySpacing;
            const isDoorBay = s === 0 && side === 'south' && idxB === Math.floor(bayCount / 2);
            if (isDoorBay) {
              addUpper(frameMat, bx, story1H * 0.41, 0, 1.45, story1H * 0.82, wallThick + 0.1);
              addUpper(bGlassMat, bx, story1H * 0.38, 0, 1.2, story1H * 0.72, wallThick + 0.12);
            } else {
              addUpper(
                frameMat,
                bx,
                curWinY,
                0,
                winW + 0.14,
                curWinH + (s === 0 ? 0.14 : 0.12),
                wallThick + 0.08,
              );
              addUpper(bGlassMat, bx, curWinY, 0, winW, curWinH, wallThick + 0.11);
              if (eraIdx < 5) {
                addUpper(frameMat, bx, curWinY, 0, 0.06, curWinH, wallThick + 0.13);
              }
              addUpper(
                bCorniceMat,
                bx,
                curWinY - curWinH * 0.5 - 0.06,
                0,
                winW + 0.24,
                0.08,
                wallThick + 0.16,
              );
            }
          }
        }

        // Multi-story skyscraper crown details (rooftop HVAC penthouse & comms/quantum spires on 2F+!)
        if (stories >= 2 && (side === 'north' || side === 'west')) {
          addUpper(
            roofUnitMat,
            0,
            totalUpperH + 0.38,
            -0.05,
            Math.min(2.2, length * 0.32),
            0.48,
            wallThick + 0.35,
            true,
            false,
          );
          if (stories >= 3) {
            const spireH = 0.65 + (stories - 2) * 0.25;
            addUpper(
              antennaMat,
              length * 0.28,
              totalUpperH + 0.16 + spireH * 0.5,
              0,
              0.11,
              spireH,
              0.11,
            );
          }
        }

        // Glowing corner rooftop beacons (always present on 4F+ skyscrapers or Era 5+)
        const beaconHex = theme.cornerBeacon ?? (stories >= 4 ? (isDC ? '#56c7ff' : '#ffe478') : null);
        if (beaconHex) {
          const bMat = getBeaconMat(beaconHex);
          for (const endX of [-length * 0.5 - wallThick * 0.5, length * 0.5 + wallThick * 0.5]) {
            addUpper(bMat, endX, totalUpperH + 0.28, 0, 0.24, 0.24, 0.24);
          }
        }
      };

      buildWallSide('north', spanX, cx, wTop - wallThick * 0.5, 0);
      buildWallSide('south', spanX, cx, wBottom + wallThick * 0.5, Math.PI);
      buildWallSide('west', spanZ, wLeft - wallThick * 0.5, cz, Math.PI / 2);
      buildWallSide('east', spanZ, wRight + wallThick * 0.5, cz, -Math.PI / 2);
    };

    for (const b of buildings) {
      buildSingleBuilding(b);
    }

    // Emit all static walkways/curbs/stakes (~5 draw calls)
    this.shellInstancedMeshes.push(...staticBucket.buildInto(this.buildingShellGroup));

    // Emit the 4 batched compass upper-wall assemblies (~9 draw calls per visible direction!)
    const compassDefs: Array<{ side: 'north' | 'south' | 'west' | 'east'; nx: number; nz: number }> = [
      { side: 'north', nx: 0, nz: -1 },
      { side: 'south', nx: 0, nz: 1 },
      { side: 'west', nx: -1, nz: 0 },
      { side: 'east', nx: 1, nz: 0 },
    ];
    for (const def of compassDefs) {
      const upperGroup = new THREE.Group();
      upperGroup.position.set(0, curbH, 0);
      this.buildingShellGroup.add(upperGroup);
      this.shellInstancedMeshes.push(...sideBuckets[def.side].buildInto(upperGroup));
      this.wallAssemblies.push({
        nx: def.nx,
        nz: def.nz,
        upperGroup,
        currentScaleY: 1,
      });
    }

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

    // Gentle orbital sway on Title screen centered smoothly behind the centered Game Menu
    if (store.screen === 'title') {
      this.camTargetX = Math.sin(this.elapsedRealSec * 0.22) * 1.1;
      this.camTargetZ = 1.4 + Math.cos(this.elapsedRealSec * 0.18) * 0.9;
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

    // Place camera at true isometric direction from target (dist 48 prevents tall 6F towers from near-clipping)
    const dist = 48;
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
      } else if (store.trainingResultModelId) {
        store.dismissTrainingResult();
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
    const maxDim = PERF_PROFILES[this.effectivePerfTier].maxDim;
    this.lastAppliedMaxDim = maxDim;
    this.pipeline.resize(w, h, scale, maxDim);
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
    const rawMs = now - this.lastTimeMs;
    const rawDt = Math.min(0.1, Math.max(0.001, rawMs / 1000));
    this.lastTimeMs = now;
    this.elapsedRealSec += rawDt;

    // Adaptive hardware-tier auto-scaling when in 'auto' mode on real GPUs
    const currentMode: PerformanceMode = useGameStore.getState().game.settings.performanceMode ?? 'auto';
    if (!this.isSoftwareGl && currentMode === 'auto' && document.visibilityState === 'visible') {
      const clampedMs = Math.min(120, Math.max(4, rawMs));
      this.avgFrameMs = this.avgFrameMs * 0.92 + clampedMs * 0.08;
      if (this.avgFrameMs > 28 && this.effectivePerfTier !== 'low') {
        this.slowFrameAccumSec += rawDt;
        if (this.slowFrameAccumSec >= 2.2) {
          this.slowFrameAccumSec = 0;
          this.effectivePerfTier = this.effectivePerfTier === 'high' ? 'balanced' : 'low';
          this.autoDetectedTier = this.effectivePerfTier;
        }
      } else {
        this.slowFrameAccumSec = Math.max(0, this.slowFrameAccumSec - rawDt * 0.5);
      }
    }

    const profile = PERF_PROFILES[this.effectivePerfTier];

    // Throttle simulation & React store updates cleanly per tier so low-end CPUs never churn
    this.simAccumSec += rawDt;
    if (this.simAccumSec >= profile.simInterval) {
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

    // Smooth voxel staff & particle updates
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

    // Throttled 4Hz shadow map refresh (instead of re-rendering shadow pass at 60Hz!)
    if (this.renderer.shadowMap.enabled) {
      this.shadowUpdateAccumSec += rawDt;
      if (this.shadowDirty || this.shadowUpdateAccumSec >= 0.25) {
        this.renderer.shadowMap.needsUpdate = true;
        this.shadowDirty = false;
        this.shadowUpdateAccumSec = 0;
      }
    }

    const settings = freshStore.game.settings;
    const isSellHover = freshStore.buildTool === 'sell' && this.hoveredItemUid !== null;
    const freshProfile = PERF_PROFILES[this.effectivePerfTier];

    this.renderer.info.reset();
    this.pipeline.render(this.scene, this.camera, {
      outlines: settings.outlines,
      fastOutlines: freshProfile.fastOutlines,
      quantize: settings.paletteQuantize,
      subPixelTexelX: subX,
      subPixelTexelY: subY,
      highlightScene: this.highlightClone ? this.highlightScene : null,
      highlightColor: isSellHover ? '#e0534f' : '#faf7eb',
    });

    // Expose lightweight non-UI perf metrics for profiling & automated QA
    this.perfReportAccumSec += rawDt;
    if (this.perfReportAccumSec >= 0.4) {
      this.perfReportAccumSec = 0;
      (window as unknown as Record<string, unknown>).__PROJECT_LABS_PERF__ = {
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        fps: Math.round(1000 / Math.max(1, this.avgFrameMs)),
        effectiveTier: this.effectivePerfTier,
        mode: settings.performanceMode ?? 'auto',
        rtWidth: this.pipeline.rtWidth,
        rtHeight: this.pipeline.rtHeight,
        itemsCount: freshStore.game.items.length,
        staffCount: freshStore.game.staff.length,
      };
    }

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
    this.clearPlacedItemMeshes();
    clearItemTemplateCache();
    for (const ft of FLOOR_TYPES) {
      this.floorInstancedMeshes[ft].dispose();
    }
    this.floorTileGeo.dispose();
    this.pipeline.dispose();
    this.staffRenderer.dispose();
    this.particles.dispose();
    this.modelFactory.dispose();
    this.textures.dispose();
    Object.values(this.floorMaterials).forEach((m) => m.dispose());
    this.streetLampBulbMat?.dispose();
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
