/**
 * Pure isometric grid placement, rotation, validation, move, and sell logic.
 * Zero React or Three.js imports.
 */

import { BALANCE } from '../data/balance';
import { CATALOG_BY_ID, type FloorType } from '../data/items';
import {
  allocUid,
  pushNotification,
  type GameState,
  type PlacedItem,
  type RotationQuarter,
} from './types';

export function getRotatedFootprint(
  itemId: string,
  rotation: RotationQuarter,
): [number, number] {
  const def = CATALOG_BY_ID[itemId];
  if (!def) return [1, 1];
  const [w, d] = def.footprint;
  return rotation % 2 === 1 ? [d, w] : [w, d];
}

export function floorIndex(gx: number, gz: number, gridWidth: number): number {
  return gz * gridWidth + gx;
}

export function isInsideGrid(
  gx: number,
  gz: number,
  gridWidth: number,
  gridHeight: number,
): boolean {
  return gx >= 0 && gz >= 0 && gx < gridWidth && gz < gridHeight;
}

export function getItemOccupiedTiles(item: Pick<PlacedItem, 'itemId' | 'gx' | 'gz' | 'rotation'>): Array<[number, number]> {
  const [w, d] = getRotatedFootprint(item.itemId, item.rotation);
  const tiles: Array<[number, number]> = [];
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      tiles.push([item.gx + dx, item.gz + dz]);
    }
  }
  return tiles;
}

export function isItemUnlocked(state: GameState, itemId: string): boolean {
  const def = CATALOG_BY_ID[itemId];
  if (!def) return false;
  if (def.unlockEra !== undefined && state.eraIndex < def.unlockEra) {
    return false;
  }
  if (def.unlockTech && !state.unlockedTechs.includes(def.unlockTech)) {
    return false;
  }
  return true;
}

export interface PlacementCheck {
  valid: boolean;
  reason?: string;
}

export function canPlaceItem(
  state: GameState,
  itemId: string,
  gx: number,
  gz: number,
  rotation: RotationQuarter,
  options?: { ignoreUid?: string; skipCostCheck?: boolean },
): PlacementCheck {
  const def = CATALOG_BY_ID[itemId];
  if (!def) return { valid: false, reason: 'Unknown item' };

  if (!isItemUnlocked(state, itemId)) {
    return { valid: false, reason: 'Locked (higher Era required)' };
  }

  if (!options?.skipCostCheck && state.cash < def.cost) {
    return { valid: false, reason: 'Insufficient funds' };
  }

  const [w, d] = getRotatedFootprint(itemId, rotation);
  for (let dx = 0; dx < w; dx++) {
    for (let dz = 0; dz < d; dz++) {
      const tx = gx + dx;
      const tz = gz + dz;
      if (!isInsideGrid(tx, tz, state.gridWidth, state.gridHeight)) {
        return { valid: false, reason: 'Out of bounds' };
      }

      const fType = state.floors[floorIndex(tx, tz, state.gridWidth)];
      if (def.isFloorTile) {
        if (fType === def.floorType) {
          return { valid: false, reason: 'Already this floor type' };
        }
        continue;
      }

      // Equipment must be placed on indoor flooring (not grass yard) unless it's a cooling tower or substation
      const outdoorAllowed = itemId === 'cooling_tower' || itemId === 'substation' || itemId === 'power_gen';
      if (fType === 'grass' && !outdoorAllowed) {
        return { valid: false, reason: 'Build floor tile first' };
      }

      // Check collision with existing items
      for (const existing of state.items) {
        if (options?.ignoreUid && existing.uid === options.ignoreUid) continue;
        const [ew, ed] = getRotatedFootprint(existing.itemId, existing.rotation);
        if (
          tx >= existing.gx &&
          tx < existing.gx + ew &&
          tz >= existing.gz &&
          tz < existing.gz + ed
        ) {
          return { valid: false, reason: 'Tile occupied' };
        }
      }
    }
  }

  return { valid: true };
}

export function placeItem(
  state: GameState,
  itemId: string,
  gx: number,
  gz: number,
  rotation: RotationQuarter,
): { ok: boolean; reason?: string; placedUid?: string } {
  const check = canPlaceItem(state, itemId, gx, gz, rotation);
  if (!check.valid) return { ok: false, reason: check.reason };

  const def = CATALOG_BY_ID[itemId]!;
  state.cash -= def.cost;

  if (def.isFloorTile && def.floorType) {
    state.floors[floorIndex(gx, gz, state.gridWidth)] = def.floorType;
    return { ok: true };
  }

  const uid = allocUid(state, 'itm');
  state.items.push({
    uid,
    itemId,
    gx,
    gz,
    rotation,
    placedAtDay: Math.floor(state.totalDays),
  });
  return { ok: true, placedUid: uid };
}

export function movePlacedItem(
  state: GameState,
  uid: string,
  gx: number,
  gz: number,
  rotation: RotationQuarter,
): { ok: boolean; reason?: string } {
  const existing = state.items.find((i) => i.uid === uid);
  if (!existing) return { ok: false, reason: 'Item not found' };

  const check = canPlaceItem(state, existing.itemId, gx, gz, rotation, {
    ignoreUid: uid,
    skipCostCheck: true,
  });
  if (!check.valid) return { ok: false, reason: check.reason };

  existing.gx = gx;
  existing.gz = gz;
  existing.rotation = rotation;
  return { ok: true };
}

export function sellPlacedItem(
  state: GameState,
  uid: string,
): { ok: boolean; refund: number } {
  const idx = state.items.findIndex((i) => i.uid === uid);
  if (idx === -1) return { ok: false, refund: 0 };

  const item = state.items[idx];
  const def = CATALOG_BY_ID[item.itemId];
  const refund = def ? Math.round(def.cost * BALANCE.sellRefundRatio) : 0;
  state.items.splice(idx, 1);
  state.cash += refund;

  // Unassign any staff sitting at this desk
  for (const s of state.staff) {
    if (s.assignedDeskUid === uid) {
      s.assignedDeskUid = null;
      s.activity = 'wandering';
    }
  }

  if (def) {
    pushNotification(state, `Sold ${def.name} for $${refund.toLocaleString()}`, 'info');
  }
  return { ok: true, refund };
}

export function findItemAtTile(state: GameState, gx: number, gz: number): PlacedItem | null {
  for (const item of state.items) {
    const [w, d] = getRotatedFootprint(item.itemId, item.rotation);
    if (gx >= item.gx && gx < item.gx + w && gz >= item.gz && gz < item.gz + d) {
      return item;
    }
  }
  return null;
}

export function getWalkableIndoorTiles(state: GameState): Array<[number, number]> {
  const occupied = new Set<string>();
  for (const item of state.items) {
    for (const [tx, tz] of getItemOccupiedTiles(item)) {
      occupied.add(`${tx},${tz}`);
    }
  }

  const walkable: Array<[number, number]> = [];
  for (let z = 0; z < state.gridHeight; z++) {
    for (let x = 0; x < state.gridWidth; x++) {
      const f: FloorType = state.floors[floorIndex(x, z, state.gridWidth)];
      if (f !== 'grass' && !occupied.has(`${x},${z}`)) {
        walkable.push([x, z]);
      }
    }
  }
  return walkable;
}
