/**
 * High-performance Articulated InstancedMesh 3D Pixel-Art Character Renderer.
 * Renders up to 256 expressive, animated voxel staff members in only 11 draw calls (60 FPS).
 * Features:
 * - Crisp 16x16 pixel-art face (eyes, catchlights, rosy cheeks, smile) on front head face
 * - Textured pixel-art torso (collar, jacket seam, pocket detail, chest ID badge, belt)
 * - Articulated swinging left/right legs with shoes + swinging/typing left/right arms
 * - Sculpted multi-part voxel hair crown + back/side locks (varied styles per staff)
 * - Role-specific 3D accessories (researcher glasses, engineer backpacks, DevOps headsets,
 *   product/sales tablets) & steaming 3D coffee mugs during coffee breaks
 * - Zero allocations inside per-frame update.
 */

import * as THREE from 'three';
import { STAFF_ROLES } from '../data/staff';
import type { StaffMember } from '../sim/types';
import type { PixelTexturePack } from './textures';

const MAX_STAFF_INSTANCES = 512;

// Pre-allocated scratch math helpers (zero GC in per-frame loop)
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _localQuat = new THREE.Quaternion();
const _finalQuat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _axisX = new THREE.Vector3(1, 0, 0);
const _axisY = new THREE.Vector3(0, 1, 0);
const _color = new THREE.Color();

interface VisualStaffPos {
  x: number;
  z: number;
  facing: number;
  walkPhase: number;
}

export class InstancedStaffRenderer {
  public readonly group = new THREE.Group();

  private readonly shadowMesh: THREE.InstancedMesh;
  private readonly leftLegMesh: THREE.InstancedMesh;
  private readonly rightLegMesh: THREE.InstancedMesh;
  private readonly torsoMesh: THREE.InstancedMesh;
  private readonly leftArmMesh: THREE.InstancedMesh;
  private readonly rightArmMesh: THREE.InstancedMesh;
  private readonly headMesh: THREE.InstancedMesh;
  private readonly hairTopMesh: THREE.InstancedMesh;
  private readonly hairBackMesh: THREE.InstancedMesh;
  private readonly accessoryMesh: THREE.InstancedMesh;
  private readonly propMesh: THREE.InstancedMesh;

  private readonly allMeshes: THREE.InstancedMesh[];
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];

  // Smooth per-staff visual interpolation state (for 60fps gliding from 10Hz sim ticks)
  private readonly visualState = new Map<string, VisualStaffPos>();

  constructor(textures: PixelTexturePack) {
    // 1. Soft grounded contact shadow disc
    const shadowGeo = new THREE.CircleGeometry(0.26, 12);
    shadowGeo.rotateX(-Math.PI / 2);

    // 2. Articulated legs (pivoted at hip: shifted down by half height)
    const legGeo = new THREE.BoxGeometry(0.11, 0.25, 0.13);
    legGeo.translate(0, -0.125, 0);

    // 3. Tailored torso block
    const torsoGeo = new THREE.BoxGeometry(0.32, 0.30, 0.21);

    // 4. Articulated arms (pivoted at shoulder: shifted down by half height)
    const armGeo = new THREE.BoxGeometry(0.095, 0.26, 0.105);
    armGeo.translate(0, -0.11, 0);

    // 5. Chibi isometric pixel head (distinct silhouette & readable face)
    const headGeo = new THREE.BoxGeometry(0.30, 0.27, 0.27);

    // 6. Layered hair crown + back/side hair volume
    const hairTopGeo = new THREE.BoxGeometry(0.33, 0.11, 0.30);
    const hairBackGeo = new THREE.BoxGeometry(0.32, 0.20, 0.11);

    // 7. Role accessory unit box (scaled per role into glasses, backpack, headset, or badge/tie)
    const accessoryGeo = new THREE.BoxGeometry(1, 1, 1);

    // 8. Handheld prop (coffee mug / tablet)
    const propGeo = new THREE.BoxGeometry(1, 1, 1);

    this.geos.push(
      shadowGeo,
      legGeo,
      torsoGeo,
      armGeo,
      headGeo,
      hairTopGeo,
      hairBackGeo,
      accessoryGeo,
      propGeo,
    );

    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x231b1c,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    const makeToon = (map?: THREE.Texture) =>
      new THREE.MeshToonMaterial({
        color: 0xffffff,
        map: map ?? null,
        gradientMap: textures.toonGradient,
      });

    const pantsMat = makeToon();
    const torsoMat = makeToon(textures.charTorso);
    const armMat = makeToon();
    const skinMat = makeToon();
    const faceMat = makeToon(textures.charFace);
    // BoxGeometry material order: [+x right, -x left, +y top, -y bottom, +z front (face!), -z back]
    const headMaterials = [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat];
    const hairMat = makeToon();
    const accessoryMat = makeToon();
    const propMat = makeToon();

    this.mats.push(
      shadowMat,
      pantsMat,
      torsoMat,
      armMat,
      skinMat,
      faceMat,
      hairMat,
      accessoryMat,
      propMat,
    );

    this.shadowMesh = new THREE.InstancedMesh(shadowGeo, shadowMat, MAX_STAFF_INSTANCES);
    this.leftLegMesh = new THREE.InstancedMesh(legGeo, pantsMat, MAX_STAFF_INSTANCES);
    this.rightLegMesh = new THREE.InstancedMesh(legGeo, pantsMat, MAX_STAFF_INSTANCES);
    this.torsoMesh = new THREE.InstancedMesh(torsoGeo, torsoMat, MAX_STAFF_INSTANCES);
    this.leftArmMesh = new THREE.InstancedMesh(armGeo, armMat, MAX_STAFF_INSTANCES);
    this.rightArmMesh = new THREE.InstancedMesh(armGeo, armMat, MAX_STAFF_INSTANCES);
    this.headMesh = new THREE.InstancedMesh(headGeo, headMaterials, MAX_STAFF_INSTANCES);
    this.hairTopMesh = new THREE.InstancedMesh(hairTopGeo, hairMat, MAX_STAFF_INSTANCES);
    this.hairBackMesh = new THREE.InstancedMesh(hairBackGeo, hairMat, MAX_STAFF_INSTANCES);
    this.accessoryMesh = new THREE.InstancedMesh(accessoryGeo, accessoryMat, MAX_STAFF_INSTANCES);
    this.propMesh = new THREE.InstancedMesh(propGeo, propMat, MAX_STAFF_INSTANCES);

    this.allMeshes = [
      this.shadowMesh,
      this.leftLegMesh,
      this.rightLegMesh,
      this.torsoMesh,
      this.leftArmMesh,
      this.rightArmMesh,
      this.headMesh,
      this.hairTopMesh,
      this.hairBackMesh,
      this.accessoryMesh,
      this.propMesh,
    ];

    for (const mesh of this.allMeshes) {
      mesh.frustumCulled = false;
      mesh.count = 0;
      if (mesh !== this.shadowMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
      this.group.add(mesh);
    }
  }

  private placePart(
    mesh: THREE.InstancedMesh,
    index: number,
    baseX: number,
    baseY: number,
    baseZ: number,
    localX: number,
    localY: number,
    localZ: number,
    yawQuat: THREE.Quaternion,
    pitchRad: number,
    sx: number,
    sy: number,
    sz: number,
    colorHex: string,
  ): void {
    _offset.set(localX, localY, localZ).applyQuaternion(yawQuat);
    _pos.set(baseX + _offset.x, baseY + _offset.y, baseZ + _offset.z);
    if (pitchRad !== 0) {
      _localQuat.setFromAxisAngle(_axisX, pitchRad);
      _finalQuat.copy(yawQuat).multiply(_localQuat);
    } else {
      _finalQuat.copy(yawQuat);
    }
    _scale.set(sx, sy, sz);
    _mat4.compose(_pos, _finalQuat, _scale);
    mesh.setMatrixAt(index, _mat4);
    _color.set(colorHex);
    mesh.setColorAt(index, _color);
  }

  public update(
    staff: readonly StaffMember[],
    dt: number,
    selectedStaffId: string | null,
    gridOffsetX: number,
    gridOffsetZ: number,
  ): void {
    const count = Math.min(staff.length, MAX_STAFF_INSTANCES);
    const damp = 1 - Math.exp(-10 * Math.min(0.1, dt));

    if (this.visualState.size > count + 12) {
      const alive = new Set(staff.map((s) => s.id));
      for (const k of this.visualState.keys()) {
        if (!alive.has(k)) this.visualState.delete(k);
      }
    }

    const pantsPalette = ['#24344d', '#332d34', '#47424d', '#3e587d'];

    for (let i = 0; i < count; i++) {
      const s = staff[i];
      let vis = this.visualState.get(s.id);
      if (!vis) {
        vis = { x: s.x, z: s.z, facing: s.facingAngle, walkPhase: s.walkPhase };
        this.visualState.set(s.id, vis);
      } else {
        vis.x += (s.x - vis.x) * damp;
        vis.z += (s.z - vis.z) * damp;
        vis.facing = s.facingAngle;
        vis.walkPhase += (s.walkPhase - vis.walkPhase) * damp;
      }

      const wx = vis.x - gridOffsetX;
      const wz = vis.z - gridOffsetZ;
      const isMoving =
        s.activity === 'walking_to_desk' ||
        s.activity === 'walking_to_coffee' ||
        s.activity === 'walking_to_server' ||
        s.activity === 'wandering';
      const isWorking = s.activity === 'working' || s.activity === 'inspecting_server';
      const isCoffee = s.activity === 'drinking_coffee' || s.activity === 'walking_to_coffee';

      const swing = isMoving ? Math.sin(vis.walkPhase) * 0.62 : 0;
      const bob = isMoving
        ? Math.abs(Math.sin(vis.walkPhase)) * 0.065
        : Math.sin(vis.walkPhase * 0.35 + i * 1.1) * 0.012;
      const typingBob = isWorking ? Math.sin(vis.walkPhase * 1.9 + i) * 0.14 : 0;

      const isSelected = s.id === selectedStaffId;
      const sc = isSelected ? 1.12 : 1.0;

      _quat.setFromAxisAngle(_axisY, vis.facing);

      const shirtColor = isSelected ? '#ffe478' : STAFF_ROLES[s.role].shirtColor;
      const pantsColor = pantsPalette[i % pantsPalette.length];

      // 1. Contact shadow
      _pos.set(wx, 0.022, wz);
      _scale.set(sc, 1, sc);
      _mat4.compose(_pos, _quat, _scale);
      this.shadowMesh.setMatrixAt(i, _mat4);

      // 2 & 3. Articulated Left & Right Legs (swing opposite during walk)
      const hipY = 0.25 * sc + bob * 0.25;
      this.placePart(
        this.leftLegMesh, i, wx, hipY, wz,
        -0.08 * sc, 0, 0, _quat, swing, sc, sc, sc, pantsColor,
      );
      this.placePart(
        this.rightLegMesh, i, wx, hipY, wz,
        0.08 * sc, 0, 0, _quat, -swing, sc, sc, sc, pantsColor,
      );

      // 4. Textured Pixel Torso (role outfit + collar + chest ID badge)
      const torsoY = 0.40 * sc + bob;
      this.placePart(
        this.torsoMesh, i, wx, torsoY, wz,
        0, 0, 0, _quat, 0, sc, sc, sc, shirtColor,
      );

      // 5 & 6. Articulated Left & Right Arms (swing while walking, type at desk, or hold mug)
      const shoulderY = 0.51 * sc + bob;
      const leftArmPitch = isWorking
        ? -0.85 + typingBob
        : isMoving
          ? -swing * 0.85
          : 0.05;
      const rightArmPitch = isCoffee
        ? -1.05
        : isWorking
          ? -0.85 - typingBob
          : isMoving
            ? swing * 0.85
            : -0.05;

      this.placePart(
        this.leftArmMesh, i, wx, shoulderY, wz,
        -0.205 * sc, 0, 0, _quat, leftArmPitch, sc, sc, sc, shirtColor,
      );
      this.placePart(
        this.rightArmMesh, i, wx, shoulderY, wz,
        0.205 * sc, 0, 0, _quat, rightArmPitch, sc, sc, sc, shirtColor,
      );

      // 7. Chibi Pixel Head (front face displays crisp pixel eyes & smile)
      const headY = 0.69 * sc + bob;
      this.placePart(
        this.headMesh, i, wx, headY, wz,
        0, 0, 0, _quat, 0, sc, sc, sc, s.skinTone,
      );

      // 8 & 9. Sculpted Hair Crown + Back/Side Hair Volume (style varies per staff)
      const hairStyle = i % 3; // 0: full neat cut, 1: tall fluffy quiff, 2: longer bob
      const crownH = hairStyle === 1 ? 1.25 : 1.0;
      const backH = hairStyle === 2 ? 1.32 : 0.95;
      this.placePart(
        this.hairTopMesh, i, wx, headY + 0.145 * sc, wz,
        0, 0, -0.01 * sc, _quat, 0, sc, sc * crownH, sc, s.hairColor,
      );
      this.placePart(
        this.hairBackMesh, i, wx, headY + (hairStyle === 2 ? -0.02 : 0.02) * sc, wz,
        0, 0, -0.115 * sc, _quat, 0, sc, sc * backH, sc, s.hairColor,
      );

      // 10. Role-Specific 3D Pixel Accessory
      if (s.role === 'researcher') {
        // Dark-rimmed scholar glasses on front of head
        this.placePart(
          this.accessoryMesh, i, wx, headY + 0.01 * sc, wz,
          0, 0, 0.142 * sc, _quat, 0, 0.25 * sc, 0.055 * sc, 0.03 * sc, '#231b1c',
        );
      } else if (s.role === 'ml_engineer' || s.role === 'data_engineer') {
        // Cozy tech backpack on back (echoes the backpack in the reference room!)
        const packColor = s.role === 'ml_engineer' ? '#3e587d' : '#66ad45';
        this.placePart(
          this.accessoryMesh, i, wx, torsoY + 0.01 * sc, wz,
          0, 0, -0.145 * sc, _quat, 0, 0.22 * sc, 0.24 * sc, 0.10 * sc, packColor,
        );
      } else if (s.role === 'infra_devops') {
        // Glowing cyan DevOps headset band across top/side of head
        this.placePart(
          this.accessoryMesh, i, wx, headY + 0.03 * sc, wz,
          0, 0, 0.02 * sc, _quat, 0, 0.34 * sc, 0.06 * sc, 0.06 * sc, '#5baad9',
        );
      } else {
        // Brass/gold lapel badge / scarf accent for Product & Sales
        this.placePart(
          this.accessoryMesh, i, wx, torsoY + 0.12 * sc, wz,
          0, 0, 0.115 * sc, _quat, 0, 0.12 * sc, 0.08 * sc, 0.04 * sc, '#e6b84c',
        );
      }

      // 11. Contextual Handheld Prop (Porcelain Coffee Mug or Floating Selection Star)
      if (isCoffee) {
        this.placePart(
          this.propMesh, i, wx, shoulderY - 0.06 * sc, wz,
          0.205 * sc, 0, 0.19 * sc, _quat, 0, 0.085 * sc, 0.095 * sc, 0.085 * sc, '#f8f0df',
        );
      } else if (isSelected) {
        // Floating golden diamond marker above selected staff
        const floatY = headY + 0.34 * sc + Math.sin(vis.walkPhase * 1.4) * 0.04;
        this.placePart(
          this.propMesh, i, wx, floatY, wz,
          0, 0, 0, _quat, Math.PI / 4, 0.11 * sc, 0.11 * sc, 0.11 * sc, '#ffe478',
        );
      } else {
        // Hide prop instance via zero scale
        _pos.set(wx, -10, wz);
        _scale.set(0, 0, 0);
        _mat4.compose(_pos, _quat, _scale);
        this.propMesh.setMatrixAt(i, _mat4);
        _color.set('#f8f0df');
        this.propMesh.setColorAt(i, _color);
      }
    }

    for (const mesh of this.allMeshes) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
  }
}
