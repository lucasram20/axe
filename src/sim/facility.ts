/**
 * Pure deterministic Facility Building Tier upgrades, Auto-Furnish workspace manager,
 * and Founder Vault Max Hyperscale HQ + GPU Data Center builder.
 * Zero React or Three.js imports.
 */

import { CATALOG_BY_ID, type FloorType } from '../data/items';
import { computeResources } from './economy';
import {
  canPlaceItem,
  floorIndex,
  getItemOccupiedTiles,
  getRotatedFootprint,
  getWalkableIndoorTiles,
  isItemUnlocked,
} from './grid';
import {
  allocUid,
  pushNotification,
  type BuildingTier,
  type GameState,
  type RotationQuarter,
} from './types';

export interface BuildingTierDef {
  tier: BuildingTier;
  name: string;
  tagline: string;
  upgradeCost: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  serverSplitX: number;
  loungeMaxX: number;
  loungeMinZ: number;
}

export const BUILDING_TIERS: readonly BuildingTierDef[] = [
  {
    tier: 0,
    name: 'Garage Startup',
    tagline: '10×9 Cozy Research Garage',
    upgradeCost: 0,
    minX: 4,
    maxX: 13,
    minZ: 4,
    maxZ: 12,
    serverSplitX: 10,
    loungeMaxX: 6,
    loungeMinZ: 10,
  },
  {
    tier: 1,
    name: 'Innovation Loft',
    tagline: '12×12 Open Studio + Server Wing',
    upgradeCost: 35_000,
    minX: 3,
    maxX: 14,
    minZ: 3,
    maxZ: 14,
    serverSplitX: 11,
    loungeMaxX: 6,
    loungeMinZ: 11,
  },
  {
    tier: 2,
    name: 'AI Research Campus',
    tagline: '14×14 Lab + Dedicated Compute Hall',
    upgradeCost: 160_000,
    minX: 2,
    maxX: 15,
    minZ: 2,
    maxZ: 15,
    serverSplitX: 11,
    loungeMaxX: 6,
    loungeMinZ: 12,
  },
  {
    tier: 3,
    name: 'Frontier Hyperscale HQ',
    tagline: '16×16 Mega HQ + GPU Data Center',
    upgradeCost: 550_000,
    minX: 1,
    maxX: 16,
    minZ: 1,
    maxZ: 16,
    serverSplitX: 10,
    loungeMaxX: 5,
    loungeMinZ: 13,
  },
];

export function getBuildingTierDef(tier: BuildingTier): BuildingTierDef {
  return BUILDING_TIERS[Math.max(0, Math.min(3, tier))];
}

export function getNextBuildingTier(tier: BuildingTier): BuildingTierDef | null {
  if (tier >= 3) return null;
  return BUILDING_TIERS[tier + 1];
}

export function applyTierFloorPlan(state: GameState, tier: BuildingTier): void {
  const def = getBuildingTierDef(tier);
  const w = state.gridWidth;
  const h = state.gridHeight;

  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const inside = x >= def.minX && x <= def.maxX && z >= def.minZ && z <= def.maxZ;
      const idx = floorIndex(x, z, w);
      if (!inside) {
        // Keep outdoor lawn around perimeter for utility pads & landscaping
        if (state.floors[idx] !== 'grass') {
          state.floors[idx] = 'grass';
        }
        continue;
      }

      // Preserve intentional server/lounge/lab zones if upgrading, or paint clean architectural zones
      let zone: FloorType = 'garage';
      if (x >= def.serverSplitX && z <= def.maxZ - 2) {
        zone = 'server';
      } else if (x <= def.loungeMaxX && z >= def.loungeMinZ) {
        zone = 'lounge';
      } else if (x >= def.minX + 1 && x < def.serverSplitX && z >= def.minZ + 1 && z < def.loungeMinZ) {
        zone = 'lab';
      }
      state.floors[idx] = zone;
    }
  }
}

export function canUpgradeBuilding(state: GameState): {
  ok: boolean;
  reason?: string;
  nextTier?: BuildingTierDef;
} {
  const next = getNextBuildingTier(state.buildingTier);
  if (!next) return { ok: false, reason: 'Already at Max HQ Tier' };
  const isFree = Boolean(state.cheatFreeBuild);
  if (!isFree && state.cash < next.upgradeCost) {
    return { ok: false, reason: `Need $${next.upgradeCost.toLocaleString()}`, nextTier: next };
  }
  return { ok: true, nextTier: next };
}

function buildOccupiedSet(state: GameState): Set<string> {
  const set = new Set<string>();
  for (const item of state.items) {
    for (const [tx, tz] of getItemOccupiedTiles(item)) {
      set.add(`${tx},${tz}`);
    }
  }
  return set;
}

function forcePlaceItem(
  state: GameState,
  itemId: string,
  gx: number,
  gz: number,
  rotation: RotationQuarter = 0,
): string {
  const uid = allocUid(state, 'itm');
  state.items.push({
    uid,
    itemId,
    gx,
    gz,
    rotation,
    placedAtDay: Math.floor(state.totalDays),
  });
  return uid;
}

function tryAutoPlace(
  state: GameState,
  itemId: string,
  preferredFloors: FloorType[],
  opts?: { free?: boolean; spacing?: boolean; rotation?: RotationQuarter },
): boolean {
  const def = CATALOG_BY_ID[itemId];
  if (!def) return false;
  const free = Boolean(opts?.free || state.cheatFreeBuild);
  if (!free && !isItemUnlocked(state, itemId)) return false;
  if (!free && state.cash < def.cost) return false;

  const rot: RotationQuarter = opts?.rotation ?? 0;
  const [fw, fd] = getRotatedFootprint(itemId, rot);
  const occupied = buildOccupiedSet(state);
  const tierDef = getBuildingTierDef(state.buildingTier);

  const allowOutdoor = itemId === 'power_gen' || itemId === 'substation' || itemId === 'cooling_tower';
  const minX = allowOutdoor && preferredFloors.includes('grass') ? 0 : tierDef.minX + 1;
  const maxX = allowOutdoor && preferredFloors.includes('grass') ? state.gridWidth - fw : tierDef.maxX - fw;
  const minZ = allowOutdoor && preferredFloors.includes('grass') ? 0 : tierDef.minZ + 1;
  const maxZ = allowOutdoor && preferredFloors.includes('grass') ? state.gridHeight - fd : tierDef.maxZ - fd;

  const tryPass = (requireAisle: boolean): boolean => {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        // Keep neat row cadence when placing desks/furniture so interior never turns into clutter
        if (requireAisle && (z - minZ) % 2 !== 0) continue;
        if (requireAisle && fw === 1 && (x - minX) % 2 !== 0) continue;

        let ok = true;
        for (let dx = 0; dx < fw && ok; dx++) {
          for (let dz = 0; dz < fd && ok; dz++) {
            const tx = x + dx;
            const tz = z + dz;
            if (tx < 0 || tz < 0 || tx >= state.gridWidth || tz >= state.gridHeight) {
              ok = false;
              break;
            }
            const f = state.floors[floorIndex(tx, tz, state.gridWidth)];
            if (!preferredFloors.includes(f)) {
              ok = false;
              break;
            }
            if (occupied.has(`${tx},${tz}`)) {
              ok = false;
              break;
            }
          }
        }
        if (!ok) continue;

        if (!free) {
          const check = canPlaceItem(state, itemId, x, z, rot, { skipCostCheck: false });
          if (!check.valid) continue;
          state.cash -= def.cost;
        }
        forcePlaceItem(state, itemId, x, z, rot);
        return true;
      }
    }
    return false;
  };

  if (opts?.spacing && tryPass(true)) return true;
  return tryPass(false);
}

/**
 * Automatically ensures an open desk slot exists before hiring a new team member.
 * Places a neatly spaced desk (and power/cooling if needed) when autoFurnish is enabled.
 */
export function autoEnsureDeskForHire(
  state: GameState,
  opts?: { free?: boolean },
): { ok: boolean; placedItemName?: string } {
  const preferHolo =
    isItemUnlocked(state, 'desk_holo') &&
    (opts?.free || state.cheatFreeBuild || state.cash >= 18_000);
  if (preferHolo) {
    const placedHolo = tryAutoPlace(state, 'desk_holo', ['lab', 'garage'], {
      free: opts?.free,
      spacing: true,
    });
    if (placedHolo) {
      return { ok: true, placedItemName: 'Holo-Neural Bay' };
    }
  }

  const preferPro =
    isItemUnlocked(state, 'desk_pro') &&
    (opts?.free || state.cheatFreeBuild || state.cash >= 3_600);
  if (preferPro) {
    const placedPro = tryAutoPlace(state, 'desk_pro', ['lab', 'garage'], {
      free: opts?.free,
      spacing: true,
    });
    if (placedPro) {
      return { ok: true, placedItemName: 'Dual-Screen Station' };
    }
  }

  const placedBasic = tryAutoPlace(state, 'desk_basic', ['lab', 'garage'], {
    free: opts?.free,
    spacing: true,
  });
  if (placedBasic) {
    return { ok: true, placedItemName: 'Startup Desk' };
  }

  return { ok: false };
}

/**
 * Neatly auto-furnishes the active HQ with spaced workstations, whiteboards,
 * coffee bar, bookshelves, plants, and power/cooling balance so players never
 * have to tediously decorate or micromanage furniture by hand.
 */
export function autoFurnishLab(
  state: GameState,
  opts?: { free?: boolean },
): { placedCount: number } {
  let placedCount = 0;
  const tier = state.buildingTier;
  const free = Boolean(opts?.free || state.cheatFreeBuild);

  const countById = (id: string) => state.items.filter((i) => i.itemId === id).length;

  // 1. Ensure enough desks for staff + comfortable headroom for the tier
  const targetDesks = Math.max(state.staff.length + 2, 3 + tier * 3);
  let res = computeResources(state);
  let guard = 0;
  while (res.deskSlots < targetDesks && guard < 12) {
    guard++;
    const deskRes = autoEnsureDeskForHire(state, { free });
    if (!deskRes.ok) break;
    placedCount++;
    res = computeResources(state);
  }

  // 2. Essential cozy & research amenities per tier
  const wantCoffee = 1 + Math.floor(tier / 2);
  while (countById('coffee_machine') < wantCoffee) {
    if (!tryAutoPlace(state, 'coffee_machine', ['lounge', 'garage'], { free })) break;
    placedCount++;
  }

  const wantWhiteboards = 1 + tier;
  while (countById('whiteboard') < wantWhiteboards) {
    if (!tryAutoPlace(state, 'whiteboard', ['lab', 'garage'], { free, spacing: true })) break;
    placedCount++;
  }

  const wantShelves = 1 + tier;
  while (countById('bookshelf_posters') < wantShelves) {
    if (!tryAutoPlace(state, 'bookshelf_posters', ['lab', 'garage', 'lounge'], { free, spacing: true })) break;
    placedCount++;
  }

  const wantPlants = 2 + tier;
  while (countById('potted_plant') < wantPlants) {
    if (!tryAutoPlace(state, 'potted_plant', ['lounge', 'garage', 'lab'], { free, spacing: true })) break;
    placedCount++;
  }

  // 3. Auto-balance power & cooling if currently strained
  res = computeResources(state);
  let infraGuard = 0;
  while (res.isUnderpowered && infraGuard < 6) {
    infraGuard++;
    const useFusion =
      (free || isItemUnlocked(state, 'fusion_reactor')) &&
      tryAutoPlace(state, 'fusion_reactor', ['grass'], { free });
    const useSub =
      !useFusion &&
      (free || isItemUnlocked(state, 'substation')) &&
      tryAutoPlace(state, 'substation', ['grass'], { free });
    const useGen = !useFusion && !useSub && tryAutoPlace(state, 'power_gen', ['grass', 'server'], { free });
    if (!useFusion && !useSub && !useGen) break;
    placedCount++;
    res = computeResources(state);
  }

  infraGuard = 0;
  while (res.isOverheated && infraGuard < 6) {
    infraGuard++;
    const useCryo =
      (free || isItemUnlocked(state, 'cryo_spire')) &&
      tryAutoPlace(state, 'cryo_spire', ['grass'], { free });
    const useTower =
      !useCryo &&
      (free || isItemUnlocked(state, 'cooling_tower')) &&
      tryAutoPlace(state, 'cooling_tower', ['grass'], { free });
    const useAc = !useCryo && !useTower && tryAutoPlace(state, 'ac_unit', ['server', 'garage'], { free });
    if (!useCryo && !useTower && !useAc) break;
    placedCount++;
    res = computeResources(state);
  }

  if (placedCount > 0) {
    pushNotification(
      state,
      `Auto-Furnish neatly installed ${placedCount} lab upgrade${placedCount === 1 ? '' : 's'}.`,
      'good',
    );
  }
  return { placedCount };
}

export function upgradeBuildingTier(
  state: GameState,
  opts?: { free?: boolean },
): { ok: boolean; reason?: string; newTier?: BuildingTierDef } {
  const next = getNextBuildingTier(state.buildingTier);
  if (!next) return { ok: false, reason: 'Already at Max HQ Tier' };

  const free = Boolean(opts?.free || state.cheatFreeBuild);
  if (!free && state.cash < next.upgradeCost) {
    return { ok: false, reason: `Need $${next.upgradeCost.toLocaleString()}` };
  }

  if (!free) {
    state.cash -= next.upgradeCost;
  }

  state.buildingTier = next.tier;
  applyTierFloorPlan(state, next.tier);

  // Move any outdoor generators that now collide with expanded interior edges safely to perimeter grass
  for (const item of state.items) {
    if (
      item.itemId === 'power_gen' ||
      item.itemId === 'substation' ||
      item.itemId === 'cooling_tower' ||
      item.itemId === 'fusion_reactor' ||
      item.itemId === 'cryo_spire'
    ) {
      const f = state.floors[floorIndex(item.gx, item.gz, state.gridWidth)];
      if (f !== 'grass' && next.tier < 3) {
        const nx = Math.min(state.gridWidth - 1, next.maxX + 1);
        if (state.floors[floorIndex(nx, item.gz, state.gridWidth)] === 'grass') {
          item.gx = nx;
        }
      }
    }
  }

  if (state.automation.autoFurnish) {
    autoFurnishLab(state, { free });
  }

  pushNotification(
    state,
    `HQ Upgraded to ${next.name} (${next.tagline})!`,
    'good',
  );
  return { ok: true, newTier: next };
}

/**
 * Founder Vault Ultimate Cheat:
 * Upgrades the garage immediately into a Tier 3 Frontier Hyperscale HQ (16x16)
 * with an era-aware maxed GPU / Quantum / Singularity Data Center,
 * Research Wing, Executive Lounge, and balanced utility perimeter.
 */
export function applyMaxHyperscaleHQ(state: GameState): void {
  state.buildingTier = 3;
  applyTierFloorPlan(state, 3);

  state.items = [];
  for (const s of state.staff) {
    s.assignedDeskUid = null;
  }

  // Choose top-of-the-line era-matched supercomputer cores & workstations!
  const flagshipCore =
    state.eraIndex >= 6
      ? 'singularity_core'
      : state.eraIndex >= 5
        ? 'quantum_core'
        : 'liquid_cluster';
  const deskType = state.eraIndex >= 5 ? 'desk_holo' : 'desk_pro';
  const powerType = state.eraIndex >= 5 ? 'fusion_reactor' : 'substation';
  const coolType = state.eraIndex >= 5 ? 'cryo_spire' : 'cooling_tower';

  const layout: Array<{ itemId: string; gx: number; gz: number; rot: RotationQuarter }> = [
    // === EAST HYPERSCALE DATA CENTER HALL (x: 10..16, z: 1..14) ===
    // 12 Flagship Supercomputer Cores in authentic paired hot/cold aisles!
    { itemId: flagshipCore, gx: 11, gz: 1, rot: 0 },
    { itemId: flagshipCore, gx: 14, gz: 1, rot: 0 },
    { itemId: flagshipCore, gx: 11, gz: 3, rot: 0 },
    { itemId: flagshipCore, gx: 14, gz: 3, rot: 0 },
    { itemId: flagshipCore, gx: 11, gz: 6, rot: 0 },
    { itemId: flagshipCore, gx: 14, gz: 6, rot: 0 },
    { itemId: flagshipCore, gx: 11, gz: 8, rot: 0 },
    { itemId: flagshipCore, gx: 14, gz: 8, rot: 0 },
    { itemId: flagshipCore, gx: 11, gz: 11, rot: 0 },
    { itemId: flagshipCore, gx: 14, gz: 11, rot: 0 },
    { itemId: flagshipCore, gx: 11, gz: 13, rot: 0 },
    { itemId: flagshipCore, gx: 14, gz: 13, rot: 0 },

    // Precision Blade Server Racks & AC spine
    { itemId: 'server_rack', gx: 10, gz: 2, rot: 1 },
    { itemId: 'server_rack', gx: 10, gz: 4, rot: 1 },
    { itemId: 'server_rack', gx: 10, gz: 7, rot: 1 },
    { itemId: 'server_rack', gx: 10, gz: 9, rot: 1 },
    { itemId: 'ac_unit', gx: 10, gz: 11, rot: 0 },
    { itemId: 'ac_unit', gx: 10, gz: 13, rot: 0 },
    { itemId: 'ac_unit', gx: 10, gz: 15, rot: 0 },

    // === WEST / CENTRAL RESEARCH WING (x: 2..9, z: 2..11) ===
    { itemId: deskType, gx: 3, gz: 3, rot: 0 },
    { itemId: deskType, gx: 6, gz: 3, rot: 0 },
    { itemId: deskType, gx: 3, gz: 5, rot: 0 },
    { itemId: deskType, gx: 6, gz: 5, rot: 0 },
    { itemId: deskType, gx: 3, gz: 7, rot: 0 },
    { itemId: deskType, gx: 6, gz: 7, rot: 0 },
    { itemId: deskType, gx: 3, gz: 9, rot: 0 },
    { itemId: deskType, gx: 6, gz: 9, rot: 0 },

    // Research Whiteboards & Archive Bookshelves framing back walls
    { itemId: 'whiteboard', gx: 3, gz: 1, rot: 0 },
    { itemId: 'whiteboard', gx: 5, gz: 1, rot: 0 },
    { itemId: 'whiteboard', gx: 7, gz: 1, rot: 0 },
    { itemId: 'bookshelf_posters', gx: 1, gz: 3, rot: 1 },
    { itemId: 'bookshelf_posters', gx: 1, gz: 6, rot: 1 },
    { itemId: 'bookshelf_posters', gx: 1, gz: 9, rot: 1 },

    // === SOUTH-WEST EXECUTIVE LOUNGE (x: 1..5, z: 13..16) ===
    { itemId: 'coffee_machine', gx: 2, gz: 13, rot: 0 },
    { itemId: 'coffee_machine', gx: 4, gz: 13, rot: 0 },
    { itemId: 'potted_plant', gx: 1, gz: 15, rot: 0 },
    { itemId: 'potted_plant', gx: 5, gz: 15, rot: 0 },
    { itemId: 'potted_plant', gx: 9, gz: 1, rot: 0 },

    // === PERIMETER UTILITY PAD (Substations/Fusion + Chillers/Cryo Spires) ===
    { itemId: powerType, gx: 17, gz: 2, rot: 1 },
    { itemId: powerType, gx: 17, gz: 5, rot: 1 },
    { itemId: powerType, gx: 17, gz: 8, rot: 1 },
    { itemId: powerType, gx: 17, gz: 11, rot: 1 },
    { itemId: powerType, gx: 17, gz: 14, rot: 1 },
    { itemId: powerType, gx: 2, gz: 0, rot: 0 },
    { itemId: powerType, gx: 5, gz: 0, rot: 0 },
    { itemId: powerType, gx: 8, gz: 0, rot: 0 },
    { itemId: powerType, gx: 11, gz: 0, rot: 0 },

    // 7 High-Capacity Chillers / Cryo Spires (non-overlapping 2x2 footprints)
    { itemId: coolType, gx: 11, gz: 15, rot: 0 },
    { itemId: coolType, gx: 13, gz: 15, rot: 0 },
    { itemId: coolType, gx: 15, gz: 15, rot: 0 },
    { itemId: coolType, gx: 6, gz: 15, rot: 0 },
    { itemId: coolType, gx: 8, gz: 15, rot: 0 },
    { itemId: coolType, gx: 6, gz: 12, rot: 0 },
    { itemId: coolType, gx: 8, gz: 12, rot: 0 },
  ];

  const occupied = new Set<string>();
  for (const p of layout) {
    const [fw, fd] = getRotatedFootprint(p.itemId, p.rot);
    let fits = true;
    for (let dx = 0; dx < fw && fits; dx++) {
      for (let dz = 0; dz < fd && fits; dz++) {
        const tx = p.gx + dx;
        const tz = p.gz + dz;
        if (tx < 0 || tz < 0 || tx >= state.gridWidth || tz >= state.gridHeight) {
          fits = false;
        } else if (occupied.has(`${tx},${tz}`)) {
          fits = false;
        }
      }
    }
    if (!fits) continue;
    for (let dx = 0; dx < fw; dx++) {
      for (let dz = 0; dz < fd; dz++) {
        occupied.add(`${p.gx + dx},${p.gz + dz}`);
      }
    }
    forcePlaceItem(state, p.itemId, p.gx, p.gz, p.rot);
  }

  state.extraGridPowerContracts = Math.max(state.extraGridPowerContracts, 40);

  // Guarantee zero thermal throttling & zero power deficit across every Era (2010..2100)
  let balanceGuard = 0;
  let postRes = computeResources(state);
  while (postRes.isOverheated && balanceGuard < 20) {
    balanceGuard++;
    const placedChiller =
      tryAutoPlace(state, coolType, ['server', 'garage', 'grass'], { free: true }) ||
      tryAutoPlace(state, 'cryo_spire', ['server', 'garage', 'grass'], { free: true }) ||
      tryAutoPlace(state, 'ac_unit', ['server', 'garage', 'lounge'], { free: true });
    if (!placedChiller) break;
    postRes = computeResources(state);
  }
  while (postRes.isUnderpowered && balanceGuard < 40) {
    balanceGuard++;
    state.extraGridPowerContracts += 10;
    postRes = computeResources(state);
  }

  const walkable = getWalkableIndoorTiles(state);
  if (walkable.length > 0) {
    state.staff.forEach((s, idx) => {
      const [wx, wz] = walkable[(idx * 5) % walkable.length];
      s.x = wx + 0.5;
      s.z = wz + 0.5;
      s.targetX = s.x;
      s.targetZ = s.z;
      s.activity = 'wandering';
      s.activityTimer = 0.5;
    });
  }

  pushNotification(
    state,
    state.eraIndex >= 6
      ? '2100 SINGULARITY MEGA-HQ ONLINE! Matrioshka Cores & Holo-Bays deployed!'
      : 'FRONTIER HYPERSCALE HQ BUILT! Max Tier 3 facility + SuperPod GPU Data Center online!',
    'good',
  );
}
