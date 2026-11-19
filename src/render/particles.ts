/**
 * Zero-GC pooled InstancedMesh voxel particle system for:
 * - Cooling tower & espresso steam puffs
 * - Active GPU / Tensor rack telemetry sparks during training
 * - Construction dust burst when placing equipment
 */

import * as THREE from 'three';

const MAX_PARTICLES = 180;

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

export class VoxelParticlePool {
  public readonly mesh: THREE.InstancedMesh;
  private readonly geo: THREE.BoxGeometry;
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly pool: ParticleSlot[] = [];
  private cursor = 0;

  constructor() {
    this.geo = new THREE.BoxGeometry(1, 1, 1);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, MAX_PARTICLES);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 0.1,
        color: new THREE.Color('#faf7eb'),
      });
    }
  }

  public spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    maxLife: number,
    hexColor: string,
  ): void {
    const slot = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_PARTICLES;
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.z = z;
    slot.vx = vx;
    slot.vy = vy;
    slot.vz = vz;
    slot.size = size;
    slot.life = 0;
    slot.maxLife = maxLife;
    slot.color.set(hexColor);
  }

  public spawnPlacementBurst(wx: number, wz: number): void {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      this.spawn(
        wx + Math.cos(a) * 0.2,
        0.15,
        wz + Math.sin(a) * 0.2,
        Math.cos(a) * 0.85,
        0.9 + (i % 3) * 0.25,
        Math.sin(a) * 0.85,
        0.11,
        0.48,
        i % 2 === 0 ? '#faf7eb' : '#ffe478',
      );
    }
  }

  public update(dt: number): void {
    const step = Math.min(0.1, dt);
    let visible = 0;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life += step;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      p.x += p.vx * step;
      p.y += p.vy * step;
      p.z += p.vz * step;

      const t = p.life / p.maxLife;
      const s = p.size * (1 - t * 0.65);
      _pos.set(p.x, p.y, p.z);
      _scale.setScalar(Math.max(0.01, s));
      _mat4.compose(_pos, _quat, _scale);
      this.mesh.setMatrixAt(visible, _mat4);
      this.mesh.setColorAt(visible, p.color);
      visible++;
    }

    this.mesh.count = visible;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public dispose(): void {
    this.geo.dispose();
    this.mat.dispose();
  }
}
