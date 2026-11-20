/**
 * High-performance InstancedMesh batching & hardware-tier detection for
 * Project-Labs. Collapses thousands of low-poly voxel boxes (15 multi-story
 * buildings, 300+ placed items, 1,600 floor tiles) into ~20–35 draw calls so
 * low-end PCs, laptops, and budget phones sustain smooth framerates.
 */

import * as THREE from 'three';
import { getRotatedFootprint } from '../sim/grid';
import type { PlacedItem } from '../sim/types';
import type { VoxelModelFactory } from './models';

export type PerformanceMode = 'auto' | 'low' | 'balanced' | 'high';
export type EffectivePerfTier = 'low' | 'balanced' | 'high';

let sharedUnitBoxGeo: THREE.BoxGeometry | null = null;

export function getSharedUnitBoxGeo(): THREE.BoxGeometry {
  if (!sharedUnitBoxGeo) {
    sharedUnitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
  }
  return sharedUnitBoxGeo;
}

/**
 * Heuristic hardware tier check for `'auto'` performance mode.
 * Flags mobile/touch devices, low CPU core count (<= 4), low RAM (<= 4 GB),
 * or software WebGL renderers so they start smoothly out of the box.
 */
export function detectLowEndDevice(isSoftwareGl: boolean): EffectivePerfTier {
  if (isSoftwareGl) return 'low';
  if (typeof navigator === 'undefined') return 'balanced';

  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(ua);
  const cores = navigator.hardwareConcurrency ?? 4;
  const memGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const isCoarsePointer =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  if (isMobile || isCoarsePointer || cores <= 4 || memGb <= 4) {
    return 'low';
  }
  if (cores <= 8 || memGb <= 8) {
    return 'balanced';
  }
  return 'high';
}

interface BucketEntry {
  material: THREE.Material;
  castShadow: boolean;
  receiveShadow: boolean;
  matrices: number[]; // Flat 16 floats per instance (avoids Matrix4 object churn!)
}

const _tmpMat = new THREE.Matrix4();
const _tmpPos = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpScale = new THREE.Vector3();
const _axisY = new THREE.Vector3(0, 1, 0);

/**
 * Collects arbitrary axis-aligned or Y-rotated unit boxes grouped by material
 * and shadow flags, then emits ONE THREE.InstancedMesh per unique bucket.
 */
export class InstancedBoxBucket {
  private readonly buckets = new Map<string, BucketEntry>();

  public addBox(
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rotY = 0,
    castShadow = true,
    receiveShadow = true,
  ): void {
    const key = `${material.uuid}|${castShadow ? 1 : 0}|${receiveShadow ? 1 : 0}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { material, castShadow, receiveShadow, matrices: [] };
      this.buckets.set(key, bucket);
    }
    _tmpPos.set(x, y, z);
    if (rotY !== 0) {
      _tmpQuat.setFromAxisAngle(_axisY, rotY);
    } else {
      _tmpQuat.identity();
    }
    _tmpScale.set(sx, sy, sz);
    _tmpMat.compose(_tmpPos, _tmpQuat, _tmpScale);
    const e = _tmpMat.elements;
    for (let i = 0; i < 16; i++) {
      bucket.matrices.push(e[i]);
    }
  }

  public addMatrix(
    material: THREE.Material,
    mat: THREE.Matrix4,
    castShadow = true,
    receiveShadow = true,
  ): void {
    const key = `${material.uuid}|${castShadow ? 1 : 0}|${receiveShadow ? 1 : 0}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { material, castShadow, receiveShadow, matrices: [] };
      this.buckets.set(key, bucket);
    }
    const e = mat.elements;
    for (let i = 0; i < 16; i++) {
      bucket.matrices.push(e[i]);
    }
  }

  public buildInto(parent: THREE.Object3D): THREE.InstancedMesh[] {
    const geo = getSharedUnitBoxGeo();
    const created: THREE.InstancedMesh[] = [];
    for (const b of this.buckets.values()) {
      const count = b.matrices.length / 16;
      if (count <= 0) continue;
      const mesh = new THREE.InstancedMesh(geo, b.material, count);
      const arr = mesh.instanceMatrix.array as Float32Array;
      for (let i = 0; i < b.matrices.length; i++) {
        arr[i] = b.matrices[i];
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = b.castShadow;
      mesh.receiveShadow = b.receiveShadow;
      mesh.frustumCulled = false;
      parent.add(mesh);
      created.push(mesh);
    }
    return created;
  }
}

interface CachedTemplatePart {
  material: THREE.Material;
  localMatrix: THREE.Matrix4;
  castShadow: boolean;
  isBlink: boolean;
  isNightGlow: boolean;
}

const templateCache = new Map<string, CachedTemplatePart[]>();

function getItemTemplateParts(
  itemId: string,
  eraIndex: number,
  factory: VoxelModelFactory,
): CachedTemplatePart[] {
  const eraBucket = eraIndex >= 6 ? 6 : eraIndex === 5 ? 5 : eraIndex >= 2 ? 2 : 0;
  const key = `${itemId}|e${eraBucket}`;
  const existing = templateCache.get(key);
  if (existing) return existing;

  const built = factory.createModel(itemId, eraIndex);
  const blinkSet = new Set<THREE.Object3D>(built.blinkMeshes);
  const glowSet = new Set<THREE.Object3D>(built.nightGlowMeshes);
  const parts: CachedTemplatePart[] = [];

  built.group.updateMatrixWorld(true);
  for (const child of built.group.children) {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.updateMatrix();
      parts.push({
        material: mesh.material as THREE.Material,
        localMatrix: mesh.matrix.clone(),
        castShadow: mesh.castShadow,
        isBlink: blinkSet.has(mesh),
        isNightGlow: glowSet.has(mesh),
      });
    }
  }
  templateCache.set(key, parts);
  return parts;
}

export function clearItemTemplateCache(): void {
  templateCache.clear();
}

export interface BatchedItemsResult {
  meshes: THREE.InstancedMesh[];
  nightGlowMats: THREE.MeshToonMaterial[];
  blinkMats: THREE.MeshToonMaterial[];
}

const _itemRootMat = new THREE.Matrix4();
const _partWorldMat = new THREE.Matrix4();

/**
 * Compiles ALL placed lab hardware & furniture into ~20–30 InstancedMeshes
 * (grouped by shared MeshToonMaterial), cutting 3,000+ item draw calls down to ~25!
 */
export function buildPlacedItemsInstanced(
  items: readonly PlacedItem[],
  eraIndex: number,
  movingItemUid: string | null,
  factory: VoxelModelFactory,
  gridOffsetX: number,
  gridOffsetZ: number,
  parent: THREE.Group,
  allowShadows: boolean,
): BatchedItemsResult {
  const bucket = new InstancedBoxBucket();
  const nightGlowSet = new Set<THREE.MeshToonMaterial>();
  const blinkSet = new Set<THREE.MeshToonMaterial>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.uid === movingItemUid) continue;

    const parts = getItemTemplateParts(item.itemId, eraIndex, factory);
    if (parts.length === 0) continue;

    const [fw, fd] = getRotatedFootprint(item.itemId, item.rotation);
    const wx = item.gx + fw * 0.5 - gridOffsetX;
    const wz = item.gz + fd * 0.5 - gridOffsetZ;

    _tmpPos.set(wx, 0.03, wz);
    _tmpQuat.setFromAxisAngle(_axisY, (item.rotation * Math.PI) / 2);
    _tmpScale.set(1, 1, 1);
    _itemRootMat.compose(_tmpPos, _tmpQuat, _tmpScale);

    for (let p = 0; p < parts.length; p++) {
      const part = parts[p];
      _partWorldMat.multiplyMatrices(_itemRootMat, part.localMatrix);
      bucket.addMatrix(
        part.material,
        _partWorldMat,
        allowShadows && part.castShadow,
        true,
      );
      if (part.isNightGlow) {
        nightGlowSet.add(part.material as THREE.MeshToonMaterial);
      }
      if (part.isBlink) {
        blinkSet.add(part.material as THREE.MeshToonMaterial);
      }
    }
  }

  const meshes = bucket.buildInto(parent);
  return {
    meshes,
    nightGlowMats: Array.from(nightGlowSet),
    blinkMats: Array.from(blinkSet),
  };
}
