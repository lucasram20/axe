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

  public createModel(itemId: string, eraIndex = 0): ModelBuildResult {
    const group = new THREE.Group();
    const blinkMeshes: THREE.Mesh[] = [];
    const nightGlowMeshes: THREE.Mesh[] = [];
    const def = CATALOG_BY_ID[itemId];
    const isModernEra = eraIndex >= 2 && eraIndex < 5;
    const isQuantumEra = eraIndex === 5;
    const isSingularityEra = eraIndex >= 6;

    // All models are built centered around (0, 0, 0) for their unrotated [w, d] footprint.
    switch (itemId) {
      case 'desk_basic': {
        if (isQuantumEra || isSingularityEra) {
          // 2045-2100 Floating Pearl/Alabaster & Gold Holographic Console!
          const deck = this.mat(isSingularityEra ? '#f8f0df' : '#dce6f2');
          const trim = this.mat(isSingularityEra ? '#e6b84c' : '#5baad9');
          const base = this.mat(isSingularityEra ? '#2b2438' : '#2e344b');
          const holoCol = isSingularityEra ? '#ffe478' : '#8de4ff';
          const holo = this.mat(holoCol, {
            emissive: holoCol,
            emissiveIntensity: 0.85,
            transparent: true,
            opacity: 0.85,
          });
          this.addBox(group, 0.32, 0.36, 0.28, 0, 0, -0.1, base);
          this.addBox(group, 0.9, 0.08, 0.54, 0, 0.42, -0.1, deck);
          this.addBox(group, 0.92, 0.03, 0.06, 0, 0.41, 0.16, trim, false);
          // Floating curved holo projection pane
          const scr = this.addBox(group, 0.52, 0.32, 0.03, 0, 0.56, -0.2, holo, false);
          nightGlowMeshes.push(scr);
          blinkMeshes.push(this.addBox(group, 0.28, 0.03, 0.1, 0, 0.5, -0.02, holo, false));
          // Hover chair
          this.addBox(group, 0.32, 0.07, 0.3, 0, 0.25, 0.28, deck);
          this.addBox(group, 0.32, 0.3, 0.06, 0, 0.3, 0.41, trim);
          this.addBox(group, 0.14, 0.08, 0.14, 0, 0.04, 0.28, trim, false);
          break;
        }

        // Era 0-1: Bright sunlit birch/oak desk | Era 2-4: Crisp modern studio desk
        const woodMat = isModernEra
          ? this.mat('#e6e2d3')
          : this.mat('#e5b278', { map: this.textures.wood });
        const drawerMat = isModernEra ? this.mat('#45506b') : this.mat('#c27d42');
        const darkWood = isModernEra ? this.mat('#2e344b') : this.mat('#8a4623');
        const monMat = this.mat('#2b2f3d');
        const scrMat = this.mat('#5baad9', {
          map: this.textures.screenCode,
          emissive: isModernEra ? '#8de4ff' : '#5baad9',
          emissiveIntensity: 0.55,
        });
        const chairMat = isModernEra ? this.mat('#3b73b5') : this.mat('#4f7a65');
        const chairBase = this.mat('#332d34');

        this.addBox(group, 0.88, 0.08, 0.56, 0, 0.42, -0.1, woodMat);
        this.addBox(group, 0.24, 0.42, 0.48, 0.29, 0, -0.1, drawerMat);
        this.addBox(group, 0.18, 0.03, 0.04, 0.29, 0.28, 0.15, darkWood, false);
        this.addBox(group, 0.18, 0.03, 0.04, 0.29, 0.12, 0.15, darkWood, false);
        this.addBox(group, 0.08, 0.42, 0.48, -0.37, 0, -0.1, drawerMat);
        // Monitor stand + LCD frame + bright sky/code display
        this.addBox(group, 0.12, 0.1, 0.08, -0.02, 0.5, -0.22, monMat);
        this.addBox(group, isModernEra ? 0.52 : 0.44, 0.29, 0.06, -0.02, 0.56, -0.22, monMat);
        const scr = this.addBox(group, isModernEra ? 0.46 : 0.38, 0.23, 0.02, -0.02, 0.59, -0.185, scrMat, false);
        nightGlowMeshes.push(scr);
        // Keyboard, notebook & porcelain mug
        this.addBox(group, 0.28, 0.03, 0.1, -0.04, 0.5, -0.02, this.mat('#f8f0df'), false);
        this.addBox(group, 0.14, 0.06, 0.16, -0.32, 0.5, -0.08, this.mat('#e0534f'), false);
        this.addBox(group, 0.07, 0.09, 0.07, 0.3, 0.5, -0.14, this.mat('#ffe478'), false);
        // Crisp contrasting swivel chair
        this.addBox(group, 0.3, 0.07, 0.3, -0.02, 0.24, 0.28, chairMat);
        this.addBox(group, 0.07, 0.24, 0.07, -0.02, 0, 0.28, chairBase);
        this.addBox(group, 0.3, 0.32, 0.07, -0.02, 0.29, 0.41, chairMat);
        break;
      }

      case 'desk_pro': {
        const topMat = this.mat(isSingularityEra ? '#f8f0df' : isQuantumEra ? '#e0eef8' : '#dde3ee');
        const legMat = this.mat('#252a3d');
        const trimMat = this.mat(isSingularityEra ? '#e6b84c' : '#4ea8de');
        const scrCol = isSingularityEra ? '#ffe478' : '#8de4ff';
        const scrMat = this.mat(scrCol, {
          map: this.textures.screenCode,
          emissive: scrCol,
          emissiveIntensity: 0.6,
        });
        this.addBox(group, 1.84, 0.08, 0.62, 0, 0.44, -0.1, topMat);
        this.addBox(group, 1.84, 0.04, 0.06, 0, 0.42, -0.39, trimMat);
        this.addBox(group, 0.08, 0.44, 0.54, -0.86, 0, -0.1, legMat);
        this.addBox(group, 0.08, 0.44, 0.54, 0.86, 0, -0.1, legMat);
        this.addBox(group, 0.18, 0.38, 0.42, 0, 0, -0.12, this.mat('#2e344b'));
        for (const sx of [-0.48, 0.48]) {
          this.addBox(group, 0.34, 0.24, 0.05, sx - 0.18, 0.54, -0.24, legMat);
          this.addBox(group, 0.34, 0.24, 0.05, sx + 0.18, 0.54, -0.24, legMat);
          const s1 = this.addBox(group, 0.3, 0.19, 0.02, sx - 0.18, 0.56, -0.21, scrMat, false);
          const s2 = this.addBox(group, 0.3, 0.19, 0.02, sx + 0.18, 0.56, -0.21, scrMat, false);
          nightGlowMeshes.push(s1, s2);
          this.addBox(group, 0.3, 0.06, 0.3, sx, 0.24, 0.28, this.mat('#3b73b5'));
          this.addBox(group, 0.3, 0.32, 0.06, sx, 0.28, 0.41, this.mat('#3b73b5'));
          this.addBox(group, 0.07, 0.24, 0.07, sx, 0, 0.28, legMat);
        }
        break;
      }

      case 'desk_holo': {
        // 2045-2100 2x1 Holo-Neural Bay (3 staff slots!)
        const pearl = this.mat(isSingularityEra ? '#f8f0df' : '#dce6f2');
        const gold = this.mat(isSingularityEra ? '#e6b84c' : '#5baad9');
        const dark = this.mat('#1f2233');
        const holoCol = isSingularityEra ? '#ffe478' : '#8de4ff';
        const holo = this.mat(holoCol, {
          emissive: holoCol,
          emissiveIntensity: 0.95,
          transparent: true,
          opacity: 0.82,
        });
        this.addBox(group, 1.88, 0.09, 0.64, 0, 0.42, -0.08, pearl);
        this.addBox(group, 1.9, 0.04, 0.66, 0, 0.39, -0.08, gold, false);
        this.addBox(group, 0.24, 0.39, 0.36, -0.68, 0, -0.1, dark);
        this.addBox(group, 0.24, 0.39, 0.36, 0.68, 0, -0.1, dark);
        // Glowing floating panoramic neural hologram screen + central holo-cube
        const mainHolo = this.addBox(group, 1.48, 0.34, 0.04, 0, 0.62, -0.22, holo, false);
        const cube = this.addBox(group, 0.22, 0.22, 0.22, 0, 0.68, 0.02, holo, false);
        nightGlowMeshes.push(mainHolo);
        blinkMeshes.push(cube);
        // 3 floating pod seats
        for (const sx of [-0.62, 0, 0.62]) {
          this.addBox(group, 0.28, 0.08, 0.28, sx, 0.24, 0.32, pearl);
          this.addBox(group, 0.28, 0.28, 0.06, sx, 0.3, 0.44, gold);
        }
        break;
      }

      case 'whiteboard': {
        if (isQuantumEra || isSingularityEra) {
          // Floating Holographic Blueprint Projector
          const ped = this.mat(isSingularityEra ? '#2b2438' : '#2e344b');
          const trim = this.mat(isSingularityEra ? '#e6b84c' : '#5baad9');
          const holoCol = isSingularityEra ? '#ffe478' : '#8de4ff';
          const holo = this.mat(holoCol, {
            emissive: holoCol,
            emissiveIntensity: 0.9,
            transparent: true,
            opacity: 0.82,
          });
          this.addBox(group, 0.72, 0.14, 0.32, 0, 0, 0, ped);
          this.addBox(group, 0.64, 0.05, 0.24, 0, 0.14, 0, trim, false);
          const pane = this.addBox(group, 0.84, 0.78, 0.04, 0, 0.26, 0, holo, false);
          nightGlowMeshes.push(pane);
          blinkMeshes.push(this.addBox(group, 0.56, 0.04, 0.06, 0, 0.2, 0, trim, false));
          break;
        }
        const frame = this.mat(isModernEra ? '#2e344b' : '#65708a');
        const board = isModernEra
          ? this.mat('#b0e2f7', { map: this.textures.whiteboard, emissive: '#5baad9', emissiveIntensity: 0.28 })
          : this.mat('#faf7eb', { map: this.textures.whiteboard });
        this.addBox(group, 0.06, 1.05, 0.08, -0.4, 0, 0, frame);
        this.addBox(group, 0.06, 1.05, 0.08, 0.4, 0, 0, frame);
        this.addBox(group, 0.16, 0.06, 0.36, -0.4, 0, 0, frame);
        this.addBox(group, 0.16, 0.06, 0.36, 0.4, 0, 0, frame);
        const brd = this.addBox(group, 0.78, 0.56, 0.06, 0, 0.48, 0, board);
        if (isModernEra) nightGlowMeshes.push(brd);
        this.addBox(group, 0.72, 0.04, 0.1, 0, 0.45, 0.05, frame, false);
        this.addBox(group, 0.08, 0.03, 0.03, -0.15, 0.49, 0.07, this.mat('#e0534f'), false);
        this.addBox(group, 0.08, 0.03, 0.03, 0.05, 0.49, 0.07, this.mat('#3b73b5'), false);
        break;
      }

      case 'coffee_machine': {
        const cab = this.mat(
          isSingularityEra ? '#2b2438' : isQuantumEra ? '#dce6f2' : isModernEra ? '#45506b' : '#9c5a2d',
          { map: isModernEra || isQuantumEra || isSingularityEra ? undefined : this.textures.wood },
        );
        const top = this.mat(isSingularityEra ? '#e6b84c' : '#f8f0df');
        const body = this.mat(
          isSingularityEra ? '#f8f0df' : isQuantumEra ? '#5baad9' : isModernEra ? '#2e344b' : '#c93e3e',
        );
        const chrome = this.mat('#dfe4ec');
        this.addBox(group, 0.8, 0.5, 0.64, 0, 0, 0, cab);
        this.addBox(group, 0.84, 0.06, 0.68, 0, 0.5, 0, top);
        this.addBox(group, 0.4, 0.38, 0.34, -0.12, 0.56, -0.06, body);
        this.addBox(group, 0.36, 0.1, 0.14, -0.12, 0.84, 0.1, chrome);
        const ledCol = isSingularityEra ? '#ffe478' : isQuantumEra ? '#8de4ff' : '#99db5c';
        const led = this.addBox(
          group,
          0.07,
          0.07,
          0.04,
          0.02,
          0.86,
          0.16,
          this.mat(ledCol, { emissive: ledCol, emissiveIntensity: 1.0 }),
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
        const gpuShell = this.mat('#546282');
        const fanAccent = this.mat('#4da858');
        this.addBox(group, 0.78, 0.08, 0.66, 0, 0, 0, frame);
        this.addBox(group, 0.74, 0.06, 0.58, 0, 0.08, 0, pcb);
        this.addBox(group, 0.05, 0.68, 0.05, -0.36, 0.06, -0.28, frame);
        this.addBox(group, 0.05, 0.68, 0.05, 0.36, 0.06, -0.28, frame);
        this.addBox(group, 0.05, 0.68, 0.05, -0.36, 0.06, 0.28, frame);
        this.addBox(group, 0.05, 0.68, 0.05, 0.36, 0.06, 0.28, frame);
        this.addBox(group, 0.78, 0.04, 0.62, 0, 0.72, 0, frame);
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
        const body = this.mat(isSingularityEra ? '#2b2438' : '#252a3d');
        const front = this.mat('#343c54', { map: this.textures.serverFront });
        const trim = this.mat(isSingularityEra ? '#e6b84c' : '#4ea8de');
        this.addBox(group, 0.78, 1.38, 0.76, 0, 0, 0, body);
        this.addBox(group, 0.68, 1.24, 0.04, 0, 0.07, 0.37, front);
        this.addBox(group, 0.8, 0.08, 0.8, 0, 1.38, 0, trim);
        for (let r = 0; r < 3; r++) {
          const col = r === 1 ? '#5baad9' : '#8ce063';
          const led = this.addBox(
            group,
            0.14,
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
        const chassis = this.mat('#1f3559');
        const brass = this.mat('#e6b84c');
        const core = this.mat('#2e344b', { map: this.textures.serverFront });
        this.addBox(group, 1.82, 1.32, 0.82, 0, 0, 0, chassis);
        this.addBox(group, 1.88, 0.1, 0.86, 0, 1.32, 0, brass);
        this.addBox(group, 0.74, 1.1, 0.05, -0.45, 0.1, 0.4, core);
        this.addBox(group, 0.74, 1.1, 0.05, 0.45, 0.1, 0.4, core);
        this.addBox(group, 0.14, 1.12, 0.1, 0, 0.1, 0.38, brass);
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
        const base = this.mat('#252a3d');
        const tower = this.mat('#4f356e');
        const pipe = this.mat('#8de4ff');
        const front = this.mat('#2e344b', { map: this.textures.serverFront });
        this.addBox(group, 1.88, 0.14, 1.88, 0, 0, 0, base);
        this.addBox(group, 1.72, 1.56, 0.62, 0, 0.14, -0.46, tower);
        this.addBox(group, 1.72, 1.56, 0.62, 0, 0.14, 0.46, tower);
        this.addBox(group, 1.52, 1.26, 0.06, 0, 0.24, 0.76, front);
        this.addBox(group, 0.14, 0.14, 1.4, -0.55, 1.72, 0, pipe);
        this.addBox(group, 0.14, 0.14, 1.4, 0.55, 1.72, 0, pipe);
        this.addBox(group, 1.24, 0.14, 0.16, 0, 1.72, 0, this.mat('#9966cc'));
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

      case 'quantum_core': {
        // 2045 Photonic Quantum Core (2x2): Golden Dilution Chandelier in Cyan Cryo-Chamber!
        const plinth = this.mat('#dce6f2');
        const dark = this.mat('#232a3d');
        const gold = this.mat('#e6b84c');
        const brightGold = this.mat('#ffe478', { emissive: '#e6b84c', emissiveIntensity: 0.45 });
        const cyanGlow = this.mat('#8de4ff', { emissive: '#8de4ff', emissiveIntensity: 1.2 });
        this.addBox(group, 1.88, 0.18, 1.88, 0, 0, 0, dark);
        this.addBox(group, 1.66, 0.08, 1.66, 0, 0.18, 0, plinth);
        // 4 sleek cryo corner pillars + top crown ring
        for (const px of [-0.72, 0.72]) {
          for (const pz of [-0.72, 0.72]) {
            this.addBox(group, 0.16, 1.72, 0.16, px, 0.24, pz, plinth);
            blinkMeshes.push(this.addBox(group, 0.06, 1.3, 0.06, px * 0.88, 0.42, pz * 0.88, cyanGlow, false));
          }
        }
        this.addBox(group, 1.76, 0.16, 1.76, 0, 1.92, 0, plinth);
        // Stepped golden quantum dilution-refrigerator tiers suspended from ceiling
        this.addBox(group, 1.06, 0.14, 1.06, 0, 1.56, 0, gold);
        this.addBox(group, 0.84, 0.14, 0.84, 0, 1.24, 0, brightGold);
        this.addBox(group, 0.62, 0.14, 0.62, 0, 0.94, 0, gold);
        this.addBox(group, 0.36, 0.34, 0.36, 0, 0.56, 0, brightGold);
        // Central photonic beam
        const beam = this.addBox(group, 0.2, 1.5, 0.2, 0, 0.28, 0, cyanGlow, false);
        nightGlowMeshes.push(beam);
        break;
      }

      case 'singularity_core': {
        // 2100 Matrioshka Singularity Core (2x2): Starlight Core + Golden Dyson Rings!
        const obsidian = this.mat('#1c1829');
        const alabaster = this.mat('#f8f0df');
        const gold = this.mat('#e6b84c', { emissive: '#e6b84c', emissiveIntensity: 0.4 });
        const starlight = this.mat('#ffe478', { emissive: '#ffe478', emissiveIntensity: 1.5 });
        const violet = this.mat('#c084fc', { emissive: '#9966cc', emissiveIntensity: 1.1 });
        // Stepped sanctuary plinth
        this.addBox(group, 1.9, 0.2, 1.9, 0, 0, 0, obsidian);
        this.addBox(group, 1.62, 0.1, 1.62, 0, 0.2, 0, alabaster);
        this.addBox(group, 1.32, 0.06, 1.32, 0, 0.3, 0, gold, false);
        // 4 floating angular energy pylons
        for (const px of [-0.74, 0.74]) {
          for (const pz of [-0.74, 0.74]) {
            this.addBox(group, 0.18, 1.65, 0.18, px, 0.28, pz, alabaster);
            this.addBox(group, 0.22, 0.12, 0.22, px, 1.9, pz, gold);
            blinkMeshes.push(this.addBox(group, 0.08, 1.2, 0.08, px * 0.85, 0.52, pz * 0.85, violet, false));
          }
        }
        // Concentric Dyson Rings framing the levitating starlight singularity core
        this.addBox(group, 1.26, 0.1, 1.26, 0, 1.15, 0, gold);
        this.addBox(group, 0.12, 1.26, 1.26, 0, 0.58, 0, gold);
        this.addBox(group, 1.26, 1.26, 0.12, 0, 0.58, 0, gold);
        const core = this.addBox(group, 0.58, 0.58, 0.58, 0, 0.92, 0, starlight, false);
        nightGlowMeshes.push(core);
        blinkMeshes.push(core);
        break;
      }

      case 'ac_unit': {
        const shell = this.mat('#eef0eb');
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
        const concrete = this.mat('#9ca5b8');
        const louver = this.mat('#45506b');
        const rim = this.mat('#4ea8de');
        const fanDark = this.mat('#14121d');
        this.addBox(group, 1.84, 0.24, 1.84, 0, 0, 0, concrete);
        this.addBox(group, 1.62, 1.25, 1.62, 0, 0.24, 0, louver);
        this.addBox(group, 1.72, 0.18, 1.72, 0, 1.49, 0, rim);
        this.addBox(group, 1.08, 0.24, 1.08, 0, 1.62, 0, fanDark);
        this.addBox(group, 0.16, 1.2, 0.16, -0.84, 0.2, 0.4, this.mat('#8de4ff'));
        this.addBox(group, 0.16, 1.2, 0.16, -0.84, 0.2, -0.4, this.mat('#e0534f'));
        break;
      }

      case 'cryo_spire': {
        // 2045-2100 Zero-Point Cryo Spire (2x2)
        const base = this.mat('#252a3d');
        const pearl = this.mat('#e8f2fa');
        const ice = this.mat('#8de4ff', { emissive: '#5baad9', emissiveIntensity: 1.0 });
        this.addBox(group, 1.86, 0.22, 1.86, 0, 0, 0, base);
        this.addBox(group, 1.5, 0.55, 1.5, 0, 0.22, 0, pearl);
        this.addBox(group, 1.08, 0.65, 1.08, 0, 0.77, 0, pearl);
        this.addBox(group, 0.64, 0.68, 0.64, 0, 1.42, 0, pearl);
        const core = this.addBox(group, 0.34, 1.85, 0.34, 0, 0.35, 0, ice, false);
        blinkMeshes.push(core);
        nightGlowMeshes.push(core);
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
        for (const ix of [-0.45, 0, 0.45]) {
          this.addBox(group, 0.14, 0.46, 0.14, ix, 1.1, 0, coil);
          this.addBox(group, 0.22, 0.06, 0.22, ix, 1.24, 0, this.mat('#e6e2d3'));
          this.addBox(group, 0.22, 0.06, 0.22, ix, 1.4, 0, this.mat('#e6e2d3'));
        }
        break;
      }

      case 'fusion_reactor': {
        // 2045-2100 Compact Fusion Core (2x1)
        const base = this.mat('#252a3d');
        const shell = this.mat('#e2ecf7');
        const gold = this.mat('#e6b84c');
        const plasma = this.mat('#8de4ff', { emissive: '#8de4ff', emissiveIntensity: 1.4 });
        this.addBox(group, 1.86, 0.2, 0.88, 0, 0, 0, base);
        this.addBox(group, 0.4, 1.05, 0.76, -0.68, 0.2, 0, shell);
        this.addBox(group, 0.4, 1.05, 0.76, 0.68, 0.2, 0, shell);
        this.addBox(group, 1.1, 0.16, 0.72, 0, 1.12, 0, gold);
        const core = this.addBox(group, 0.88, 0.56, 0.52, 0, 0.42, 0, plasma, false);
        blinkMeshes.push(core);
        nightGlowMeshes.push(core);
        break;
      }

      case 'wall_glass': {
        // Interior glass partition (era-tinted)
        const plaster = this.mat(isSingularityEra ? '#2b2438' : isQuantumEra ? '#dce6f2' : '#ebd9c2', {
          map: this.textures.wallPlaster,
        });
        const creamFrame = this.mat(isSingularityEra ? '#e6b84c' : '#f8f0df');
        const capWood = this.mat(isSingularityEra ? '#e6b84c' : '#3a2c29');
        const glass = this.mat('#b0e2f7', {
          map: this.textures.windowDaylight,
          emissive: isSingularityEra ? '#ffe478' : '#8de4ff',
          emissiveIntensity: 0.18,
        });
        this.addBox(group, 1.0, 0.42, 0.22, 0, 0, 0, plaster);
        this.addBox(group, 0.96, 0.05, 0.26, 0, 0.42, 0, creamFrame);
        this.addBox(group, 0.14, 1.28, 0.22, -0.43, 0, 0, plaster);
        this.addBox(group, 0.14, 1.28, 0.22, 0.43, 0, 0, plaster);
        this.addBox(group, 1.0, 0.12, 0.22, 0, 1.18, 0, plaster);
        this.addBox(group, 1.0, 0.06, 0.24, 0, 1.28, 0, capWood);
        const win = this.addBox(group, 0.72, 0.72, 0.06, 0, 0.46, 0, glass, false);
        nightGlowMeshes.push(win);
        break;
      }

      case 'potted_plant': {
        const pot = this.mat(
          isSingularityEra ? '#e6b84c' : isQuantumEra ? '#dce6f2' : isModernEra ? '#45506b' : '#c2713a',
        );
        const potRim = this.mat(isSingularityEra ? '#ffe478' : isModernEra ? '#e6e2d3' : '#de985c');
        const soil = this.mat('#522c1b');
        const trunk = this.mat(isSingularityEra ? '#e6b84c' : '#8a4623');
        const leaf1 = this.mat(isSingularityEra ? '#5baad9' : '#2f6e49');
        const leaf2 = this.mat(isSingularityEra ? '#8de4ff' : isQuantumEra ? '#4ea8de' : '#4da858');
        const leaf3 = isSingularityEra || isQuantumEra
          ? this.mat('#ffe478', { emissive: '#8de4ff', emissiveIntensity: 0.65 })
          : this.mat('#99db5c');
        this.addBox(group, 0.42, 0.34, 0.42, 0, 0, 0, pot);
        this.addBox(group, 0.48, 0.07, 0.48, 0, 0.3, 0, potRim);
        this.addBox(group, 0.36, 0.04, 0.36, 0, 0.34, 0, soil, false);
        this.addBox(group, 0.1, 0.38, 0.1, 0, 0.36, 0, trunk);
        this.addBox(group, 0.56, 0.32, 0.56, 0, 0.62, 0, leaf1);
        this.addBox(group, 0.44, 0.28, 0.44, 0.06, 0.88, -0.04, leaf2);
        const crown = this.addBox(group, 0.26, 0.18, 0.26, -0.08, 1.1, 0.04, leaf3);
        if (isSingularityEra || isQuantumEra) nightGlowMeshes.push(crown);
        break;
      }

      case 'bookshelf_posters': {
        const wood = this.mat(
          isSingularityEra ? '#2b2438' : isQuantumEra ? '#dce6f2' : isModernEra ? '#3a4259' : '#96522b',
        );
        const trim = this.mat(
          isSingularityEra ? '#e6b84c' : isQuantumEra ? '#5baad9' : isModernEra ? '#b8c0cf' : '#c48144',
        );
        this.addBox(group, 0.86, 1.24, 0.38, 0, 0, -0.16, wood);
        this.addBox(group, 0.36, 0.16, 0.28, 0.12, 1.24, -0.15, this.mat('#5178a8'));
        this.addBox(group, 0.26, 0.14, 0.24, -0.22, 1.24, -0.15, this.mat('#e6b84c'));
        this.addBox(group, 0.36, 0.32, 0.04, -0.2, 0.06, 0.03, trim, false);
        this.addBox(group, 0.36, 0.32, 0.04, 0.2, 0.06, 0.03, trim, false);
        const bookColors = isSingularityEra || isQuantumEra
          ? ['#8de4ff', '#ffe478', '#c084fc', '#5baad9', '#f8f0df', '#e6b84c']
          : ['#e0604c', '#5178a8', '#e6b84c', '#66ad45', '#f8f0df', '#b83c3c'];
        for (let shelf = 0; shelf < 3; shelf++) {
          const sy = 0.44 + shelf * 0.26;
          this.addBox(group, 0.76, 0.04, 0.32, 0, sy - 0.04, -0.12, trim, false);
          for (let b = 0; b < 5; b++) {
            const col = bookColors[(shelf * 5 + b) % bookColors.length];
            const bh = 0.17 + ((shelf + b) % 2) * 0.04;
            this.addBox(group, 0.11, bh, 0.24, -0.28 + b * 0.14, sy, -0.1, this.mat(col), false);
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
