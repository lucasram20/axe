/**
 * Composite 3-12 part procedural voxel 3D models for every lab item.
 * All meshes use MeshToonMaterial with a 4-band NearestFilter gradientMap,
 * pivoted cleanly at bottom-center of their footprint (y = 0).
 */

import * as THREE from 'three';
import { CATALOG_BY_ID } from '../data/items';
import type { PixelTexturePack } from './textures';

export interface ModelBuildResult {
  group: THREE.Group;
  blinkMeshes: THREE.Mesh[];
  nightGlowMeshes: THREE.Mesh[];
}

export class VoxelModelFactory {
  private readonly textures: PixelTexturePack;
  private readonly materialCache = new Map<string, THREE.MeshToonMaterial>();
  private readonly boxGeo = new THREE.BoxGeometry(1, 1, 1);

  constructor(textures: PixelTexturePack) {
    this.textures = textures;
  }

  private mat(
    color: string,
    opts?: {
      emissive?: string;
      emissiveIntensity?: number;
      map?: THREE.Texture;
      transparent?: boolean;
      opacity?: number;
    },
  ): THREE.MeshToonMaterial {
    const key = `${color}|${opts?.emissive ?? ''}|${opts?.emissiveIntensity ?? 0}|${opts?.map?.uuid ?? ''}|${opts?.opacity ?? 1}`;
    const cached = this.materialCache.get(key);
    if (cached) return cached;

    const m = new THREE.MeshToonMaterial({
      color: opts?.map ? 0xffffff : new THREE.Color(color),
      gradientMap: this.textures.toonGradient,
      map: opts?.map ?? null,
      emissive: opts?.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
      emissiveIntensity: opts?.emissiveIntensity ?? 0,
      transparent: opts?.transparent ?? false,
      opacity: opts?.opacity ?? 1,
    });
    this.materialCache.set(key, m);
    return m;
  }

  private addBox(
    parent: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material: THREE.Material,
    castShadow = true,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.boxGeo, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y + h * 0.5, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  public createModel(itemId: string): ModelBuildResult {
    const group = new THREE.Group();
    const blinkMeshes: THREE.Mesh[] = [];
    const nightGlowMeshes: THREE.Mesh[] = [];
    const def = CATALOG_BY_ID[itemId];

    // All models are built centered around (0, 0, 0) for their unrotated [w, d] footprint.
    switch (itemId) {
      case 'desk_basic': {
        const woodMat = this.mat('#d49455', { map: this.textures.wood });
        const drawerMat = this.mat('#b5723a');
        const darkWood = this.mat('#8a4623');
        const monMat = this.mat('#332d34');
        const scrMat = this.mat('#5baad9', {
          map: this.textures.screenCode,
          emissive: '#5baad9',
          emissiveIntensity: 0.48,
        });
        const chairMat = this.mat('#6b473d'); // Warm espresso-leather swivel chair from reference
        const chairBase = this.mat('#332d34');

        // Honey-oak desk top + side drawer pedestal + solid side panel
        this.addBox(group, 0.88, 0.08, 0.56, 0, 0.42, -0.1, woodMat);
        this.addBox(group, 0.24, 0.42, 0.48, 0.29, 0, -0.1, drawerMat);
        this.addBox(group, 0.18, 0.03, 0.04, 0.29, 0.28, 0.15, darkWood, false);
        this.addBox(group, 0.18, 0.03, 0.04, 0.29, 0.12, 0.15, darkWood, false);
        this.addBox(group, 0.08, 0.42, 0.48, -0.37, 0, -0.1, drawerMat);
        // Monitor stand + LCD frame + bright sky/code display
        this.addBox(group, 0.12, 0.1, 0.08, -0.02, 0.5, -0.22, monMat);
        this.addBox(group, 0.44, 0.29, 0.06, -0.02, 0.56, -0.22, monMat);
        const scr = this.addBox(group, 0.38, 0.23, 0.02, -0.02, 0.59, -0.185, scrMat, false);
        nightGlowMeshes.push(scr);
        // Keyboard, mouse, notebook stack & porcelain mug
        this.addBox(group, 0.28, 0.03, 0.1, -0.04, 0.5, -0.02, this.mat('#eadbc8'), false);
        this.addBox(group, 0.07, 0.03, 0.09, 0.18, 0.5, -0.02, this.mat('#d1cabf'), false);
        this.addBox(group, 0.14, 0.06, 0.16, -0.32, 0.5, -0.08, this.mat('#b83c3c'), false);
        this.addBox(group, 0.07, 0.09, 0.07, 0.3, 0.5, -0.14, this.mat('#f8f0df'), false);
        // Cozy warm-brown ergonomic swivel chair
        this.addBox(group, 0.3, 0.07, 0.3, -0.02, 0.24, 0.28, chairMat);
        this.addBox(group, 0.07, 0.24, 0.07, -0.02, 0, 0.28, chairBase);
        this.addBox(group, 0.3, 0.32, 0.07, -0.02, 0.29, 0.41, chairMat);
        break;
      }

      case 'desk_pro': {
        const topMat = this.mat('#b8c0cf');
        const legMat = this.mat('#1f2233');
        const trimMat = this.mat('#3b73b5');
        const scrMat = this.mat('#4ea8de', {
          map: this.textures.screenCode,
          emissive: '#8de4ff',
          emissiveIntensity: 0.5,
        });
        // 2x1 wide desk
        this.addBox(group, 1.84, 0.08, 0.62, 0, 0.44, -0.1, topMat);
        this.addBox(group, 1.84, 0.04, 0.06, 0, 0.42, -0.39, trimMat);
        this.addBox(group, 0.08, 0.44, 0.54, -0.86, 0, -0.1, legMat);
        this.addBox(group, 0.08, 0.44, 0.54, 0.86, 0, -0.1, legMat);
        this.addBox(group, 0.18, 0.38, 0.42, 0, 0, -0.12, this.mat('#2e344b')); // Tower PC center
        // Two dual-monitor setups
        for (const sx of [-0.48, 0.48]) {
          this.addBox(group, 0.34, 0.24, 0.05, sx - 0.18, 0.54, -0.24, legMat);
          this.addBox(group, 0.34, 0.24, 0.05, sx + 0.18, 0.54, -0.24, legMat);
          const s1 = this.addBox(group, 0.3, 0.19, 0.02, sx - 0.18, 0.56, -0.21, scrMat, false);
          const s2 = this.addBox(group, 0.3, 0.19, 0.02, sx + 0.18, 0.56, -0.21, scrMat, false);
          nightGlowMeshes.push(s1, s2);
          // Chair
          this.addBox(group, 0.3, 0.06, 0.3, sx, 0.24, 0.28, this.mat('#45506b'));
          this.addBox(group, 0.3, 0.32, 0.06, sx, 0.28, 0.41, this.mat('#45506b'));
          this.addBox(group, 0.07, 0.24, 0.07, sx, 0, 0.28, legMat);
        }
        break;
      }

      case 'whiteboard': {
        const frame = this.mat('#65708a');
        const board = this.mat('#faf7eb', { map: this.textures.whiteboard });
        this.addBox(group, 0.06, 1.05, 0.08, -0.4, 0, 0, frame);
        this.addBox(group, 0.06, 1.05, 0.08, 0.4, 0, 0, frame);
        this.addBox(group, 0.16, 0.06, 0.36, -0.4, 0, 0, frame);
        this.addBox(group, 0.16, 0.06, 0.36, 0.4, 0, 0, frame);
        this.addBox(group, 0.78, 0.56, 0.06, 0, 0.48, 0, board);
        // Marker tray + colorful markers
        this.addBox(group, 0.72, 0.04, 0.1, 0, 0.45, 0.05, frame, false);
        this.addBox(group, 0.08, 0.03, 0.03, -0.15, 0.49, 0.07, this.mat('#e0534f'), false);
        this.addBox(group, 0.08, 0.03, 0.03, 0.05, 0.49, 0.07, this.mat('#3b73b5'), false);
        break;
      }

      case 'coffee_machine': {
        const cab = this.mat('#8a4623', { map: this.textures.wood });
        const top = this.mat('#f8f0df');
        const body = this.mat('#b83c3c');
        const chrome = this.mat('#d1cabf');
        this.addBox(group, 0.8, 0.5, 0.64, 0, 0, 0, cab);
        this.addBox(group, 0.84, 0.06, 0.68, 0, 0.5, 0, top);
        this.addBox(group, 0.4, 0.38, 0.34, -0.12, 0.56, -0.06, body);
        this.addBox(group, 0.36, 0.1, 0.14, -0.12, 0.84, 0.1, chrome);
        // Power LED, porcelain kettle & mugs
        const led = this.addBox(
          group,
          0.05,
          0.05,
          0.04,
          0.02,
          0.86,
          0.16,
          this.mat('#99db5c', { emissive: '#99db5c', emissiveIntensity: 0.9 }),
          false,
        );
        blinkMeshes.push(led);
        this.addBox(group, 0.14, 0.18, 0.14, 0.24, 0.56, -0.08, this.mat('#f8f0df'), false);
        this.addBox(group, 0.09, 0.1, 0.09, 0.24, 0.56, 0.14, this.mat('#5178a8'), false);
        this.addBox(group, 0.09, 0.1, 0.09, 0.11, 0.56, 0.16, this.mat('#ffe478'), false);
        break;
      }

      case 'gpu_rig_2010': {
        const frame = this.mat('#2e344b');
        const pcb = this.mat('#1d4034');
        const gpuShell = this.mat('#45506b');
        const fanAccent = this.mat('#4da858');
        // Open mining/ML rack chassis
        this.addBox(group, 0.78, 0.08, 0.66, 0, 0, 0, frame);
        this.addBox(group, 0.74, 0.06, 0.58, 0, 0.08, 0, pcb);
        // Frame uprights
        this.addBox(group, 0.05, 0.68, 0.05, -0.36, 0.06, -0.28, frame);
        this.addBox(group, 0.05, 0.68, 0.05, 0.36, 0.06, -0.28, frame);
        this.addBox(group, 0.05, 0.68, 0.05, -0.36, 0.06, 0.28, frame);
        this.addBox(group, 0.05, 0.68, 0.05, 0.36, 0.06, 0.28, frame);
        this.addBox(group, 0.78, 0.04, 0.62, 0, 0.72, 0, frame);
        // 4 chunky upright GPUs with glowing LEDs
        for (let i = 0; i < 4; i++) {
          const gx = -0.24 + i * 0.16;
          this.addBox(group, 0.09, 0.42, 0.44, gx, 0.18, 0, gpuShell);
          this.addBox(group, 0.1, 0.14, 0.14, gx, 0.32, 0.1, fanAccent, false);
          const led = this.addBox(
            group,
            0.05,
            0.05,
            0.04,
            gx,
            0.54,
            0.22,
            this.mat('#8ce063', { emissive: '#8ce063', emissiveIntensity: 1.0 }),
            false,
          );
          blinkMeshes.push(led);
        }
        break;
      }

      case 'server_rack': {
        const body = this.mat('#1f2233');
        const front = this.mat('#2e344b', { map: this.textures.serverFront });
        const trim = this.mat('#3b73b5');
        this.addBox(group, 0.78, 1.38, 0.76, 0, 0, 0, body);
        this.addBox(group, 0.68, 1.24, 0.04, 0, 0.07, 0.37, front);
        this.addBox(group, 0.8, 0.08, 0.8, 0, 1.38, 0, trim);
        // Blinking telemetry LEDs along top & middle
        for (let r = 0; r < 3; r++) {
          const col = r === 1 ? '#4ea8de' : '#8ce063';
          const led = this.addBox(
            group,
            0.12,
            0.05,
            0.04,
            0.2,
            0.3 + r * 0.36,
            0.39,
            this.mat(col, { emissive: col, emissiveIntensity: 1.1 }),
            false,
          );
          blinkMeshes.push(led);
        }
        break;
      }

      case 'tensor_pod': {
        const chassis = this.mat('#1b2e4d');
        const brass = this.mat('#e6b84c');
        const core = this.mat('#2e344b', { map: this.textures.serverFront });
        this.addBox(group, 1.82, 1.32, 0.82, 0, 0, 0, chassis);
        this.addBox(group, 1.88, 0.1, 0.86, 0, 1.32, 0, brass);
        this.addBox(group, 0.74, 1.1, 0.05, -0.45, 0.1, 0.4, core);
        this.addBox(group, 0.74, 1.1, 0.05, 0.45, 0.1, 0.4, core);
        // Interconnect busbars
        this.addBox(group, 0.14, 1.12, 0.1, 0, 0.1, 0.38, brass);
        // Emissive cyan telemetry strips
        for (const sx of [-0.45, 0.45]) {
          const strip = this.addBox(
            group,
            0.52,
            0.08,
            0.05,
            sx,
            1.16,
            0.42,
            this.mat('#8de4ff', { emissive: '#8de4ff', emissiveIntensity: 1.2 }),
            false,
          );
          blinkMeshes.push(strip);
        }
        break;
      }

      case 'liquid_cluster': {
        const base = this.mat('#1f2233');
        const tower = this.mat('#4f3161');
        const pipe = this.mat('#8de4ff');
        const front = this.mat('#2e344b', { map: this.textures.serverFront });
        // 2x2 platform + twin frontier monolithic racks + overhead coolant loop
        this.addBox(group, 1.88, 0.14, 1.88, 0, 0, 0, base);
        this.addBox(group, 1.72, 1.56, 0.62, 0, 0.14, -0.46, tower);
        this.addBox(group, 1.72, 1.56, 0.62, 0, 0.14, 0.46, tower);
        this.addBox(group, 1.52, 1.26, 0.06, 0, 0.24, 0.76, front);
        // Overhead manifold pipes
        this.addBox(group, 0.14, 0.14, 1.4, -0.55, 1.72, 0, pipe);
        this.addBox(group, 0.14, 0.14, 1.4, 0.55, 1.72, 0, pipe);
        this.addBox(group, 1.24, 0.14, 0.16, 0, 1.72, 0, this.mat('#9966cc'));
        // Glowing violet frontier cores
        for (const sx of [-0.45, 0, 0.45]) {
          const led = this.addBox(
            group,
            0.22,
            0.12,
            0.06,
            sx,
            1.5,
            0.78,
            this.mat('#9966cc', { emissive: '#9966cc', emissiveIntensity: 1.3 }),
            false,
          );
          blinkMeshes.push(led);
        }
        break;
      }

      case 'ac_unit': {
        const shell = this.mat('#e6e2d3');
        const vent = this.mat('#2e344b');
        const trim = this.mat('#4ea8de');
        this.addBox(group, 0.78, 1.02, 0.64, 0, 0, 0, shell);
        this.addBox(group, 0.62, 0.34, 0.06, 0, 0.54, 0.31, vent);
        this.addBox(group, 0.62, 0.22, 0.06, 0, 0.18, 0.31, this.mat('#8c96ab'));
        this.addBox(group, 0.8, 0.08, 0.66, 0, 1.02, 0, trim);
        const led = this.addBox(
          group,
          0.12,
          0.06,
          0.05,
          0.22,
          0.92,
          0.32,
          this.mat('#8de4ff', { emissive: '#8de4ff', emissiveIntensity: 1.0 }),
          false,
        );
        blinkMeshes.push(led);
        break;
      }

      case 'cooling_tower': {
        const concrete = this.mat('#8c96ab');
        const louver = this.mat('#45506b');
        const rim = this.mat('#4ea8de');
        const fanDark = this.mat('#14121d');
        // 2x2 evaporative chiller tower
        this.addBox(group, 1.84, 0.24, 1.84, 0, 0, 0, concrete);
        this.addBox(group, 1.62, 1.25, 1.62, 0, 0.24, 0, louver);
        this.addBox(group, 1.72, 0.18, 1.72, 0, 1.49, 0, rim);
        // Top fan shroud cavity
        this.addBox(group, 1.08, 0.24, 1.08, 0, 1.62, 0, fanDark);
        // Side pipes
        this.addBox(group, 0.16, 1.2, 0.16, -0.84, 0.2, 0.4, this.mat('#8de4ff'));
        this.addBox(group, 0.16, 1.2, 0.16, -0.84, 0.2, -0.4, this.mat('#e0534f'));
        break;
      }

      case 'power_gen': {
        const body = this.mat('#e6b84c');
        const base = this.mat('#2e344b');
        const pipe = this.mat('#65708a');
        this.addBox(group, 0.84, 0.14, 0.74, 0, 0, 0, base);
        this.addBox(group, 0.78, 0.68, 0.64, 0, 0.14, 0, body);
        this.addBox(group, 0.56, 0.26, 0.05, 0, 0.34, 0.32, base);
        this.addBox(group, 0.12, 0.42, 0.12, -0.26, 0.82, -0.18, pipe);
        const led = this.addBox(
          group,
          0.1,
          0.08,
          0.05,
          0.22,
          0.66,
          0.32,
          this.mat('#ffe478', { emissive: '#ffe478', emissiveIntensity: 1.1 }),
          false,
        );
        blinkMeshes.push(led);
        break;
      }

      case 'substation': {
        const base = this.mat('#65708a');
        const tank = this.mat('#45506b');
        const fin = this.mat('#2e344b');
        const coil = this.mat('#f59876');
        this.addBox(group, 1.84, 0.18, 0.88, 0, 0, 0, base);
        this.addBox(group, 1.46, 0.92, 0.68, 0, 0.18, 0, tank);
        for (let i = -3; i <= 3; i++) {
          this.addBox(group, 0.08, 0.72, 0.82, i * 0.2, 0.24, 0, fin);
        }
        // Ceramic high-voltage insulators on top
        for (const ix of [-0.45, 0, 0.45]) {
          this.addBox(group, 0.14, 0.46, 0.14, ix, 1.1, 0, coil);
          this.addBox(group, 0.22, 0.06, 0.22, ix, 1.24, 0, this.mat('#e6e2d3'));
          this.addBox(group, 0.22, 0.06, 0.22, ix, 1.4, 0, this.mat('#e6e2d3'));
        }
        break;
      }

      case 'wall_glass': {
        // Warm peach-plaster cutaway wall + cream-framed sunlit daylight window (reference signature!)
        const plaster = this.mat('#cda384', { map: this.textures.wallPlaster });
        const creamFrame = this.mat('#f8f0df');
        const capWood = this.mat('#b5723a');
        const glass = this.mat('#b0e2f7', {
          map: this.textures.windowDaylight,
          emissive: '#ffe478',
          emissiveIntensity: 0.22,
        });
        // Lower plaster wainscoting + deep cream windowsill
        this.addBox(group, 1.0, 0.46, 0.24, 0, 0, 0, plaster);
        this.addBox(group, 0.96, 0.06, 0.30, 0, 0.44, 0.03, creamFrame);
        // Side peach plaster piers + inner cream window jambs
        this.addBox(group, 0.15, 1.38, 0.24, -0.425, 0, 0, plaster);
        this.addBox(group, 0.15, 1.38, 0.24, 0.425, 0, 0, plaster);
        this.addBox(group, 0.05, 0.84, 0.20, -0.33, 0.48, 0, creamFrame);
        this.addBox(group, 0.05, 0.84, 0.20, 0.33, 0.48, 0, creamFrame);
        // Top plaster header + clean cutaway timber wall cap
        this.addBox(group, 1.0, 0.16, 0.24, 0, 1.24, 0, plaster);
        this.addBox(group, 1.0, 0.06, 0.26, 0, 1.38, 0, capWood);
        // Bright sunlit window pane
        const win = this.addBox(group, 0.66, 0.78, 0.08, 0, 0.49, -0.01, glass, false);
        nightGlowMeshes.push(win);
        break;
      }

      case 'potted_plant': {
        const pot = this.mat('#b5723a');
        const potRim = this.mat('#d49455');
        const soil = this.mat('#522c1b');
        const trunk = this.mat('#8a4623');
        const leaf1 = this.mat('#284d2c');
        const leaf2 = this.mat('#467d39');
        const leaf3 = this.mat('#99db5c');
        this.addBox(group, 0.42, 0.34, 0.42, 0, 0, 0, pot);
        this.addBox(group, 0.48, 0.07, 0.48, 0, 0.3, 0, potRim);
        this.addBox(group, 0.36, 0.04, 0.36, 0, 0.34, 0, soil, false);
        this.addBox(group, 0.1, 0.38, 0.1, 0, 0.36, 0, trunk);
        this.addBox(group, 0.56, 0.32, 0.56, 0, 0.62, 0, leaf1);
        this.addBox(group, 0.44, 0.28, 0.44, 0.06, 0.88, -0.04, leaf2);
        this.addBox(group, 0.26, 0.18, 0.26, -0.08, 1.1, 0.04, leaf3);
        break;
      }

      case 'bookshelf_posters': {
        // Warm terracotta-mahogany bookcase with packed pixel books + top storage box (reference style!)
        const wood = this.mat('#8a4623');
        const trim = this.mat('#b5723a');
        this.addBox(group, 0.86, 1.24, 0.38, 0, 0, -0.16, wood);
        // Top storage box on bookcase
        this.addBox(group, 0.36, 0.16, 0.28, 0.12, 1.24, -0.15, this.mat('#5178a8'));
        this.addBox(group, 0.26, 0.14, 0.24, -0.22, 1.24, -0.15, this.mat('#d49455'));
        // Lower wooden cabinet doors
        this.addBox(group, 0.36, 0.32, 0.04, -0.2, 0.06, 0.03, trim, false);
        this.addBox(group, 0.36, 0.32, 0.04, 0.2, 0.06, 0.03, trim, false);
        // Upper 3 colorful book shelves
        const bookColors = ['#e0604c', '#5178a8', '#e6b84c', '#66ad45', '#f8f0df', '#b83c3c'];
        for (let shelf = 0; shelf < 3; shelf++) {
          const sy = 0.44 + shelf * 0.26;
          this.addBox(group, 0.76, 0.04, 0.32, 0, sy - 0.04, -0.12, trim, false);
          for (let b = 0; b < 5; b++) {
            const col = bookColors[(shelf * 5 + b) % bookColors.length];
            const bh = 0.17 + ((shelf + b) % 2) * 0.04;
            this.addBox(group, 0.11, bh, 0.24, -0.28 + b * 0.14, sy, -0.10, this.mat(col), false);
          }
        }
        break;
      }

      default: {
        this.addBox(
          group,
          0.7,
          0.6,
          0.7,
          0,
          0,
          0,
          this.mat(def?.accentColor ?? '#8c96ab'),
        );
      }
    }

    return { group, blinkMeshes, nightGlowMeshes };
  }

  public dispose(): void {
    this.boxGeo.dispose();
    this.materialCache.forEach((m) => m.dispose());
    this.materialCache.clear();
  }
}
