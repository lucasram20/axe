/**
 * Pure deterministic Multi-Building Campus Land Expansion, HQ Tier Upgrades,
 * Auto-Furnish workspace manager, and Founder Vault Max Mega-Campus builder.
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
  type LandParcelId,
  type RotationQuarter,
} from './types';

export interface BuildingFootprint {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  defaultFloor: FloorType;
  role: 'hq' | 'datacenter' | 'research' | 'annex';
}

export interface LandParcelDef {
  id: LandParcelId;
  name: string;
  shortName: string;
  tagline: string;
  cost: number;
  autoGrantedAtTier?: BuildingTier;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  defaultFloor: FloorType;
  role: 'datacenter' | 'research' | 'annex';
}

export const LAND_PARCELS: readonly LandParcelDef[] = [
  {
    id: 'east_datacenter',
    name: 'East Compute Wing',
    shortName: 'East Data Center',
    tagline: '6×14 Dedicated GPU / Quantum Data Center Building',
    cost: 45_000,
    autoGrantedAtTier: 1,
    minX: 21,
    maxX: 26,
    minZ: 11,
    maxZ: 24,
    defaultFloor: 'server',
    role: 'datacenter',
  },
  {
    id: 'north_research',
    name: 'North Research Pavilion',
    shortName: 'North Lab Wing',
    tagline: '12×7 Skylight AI Research & Alignment Building',
    cost: 95_000,
    autoGrantedAtTier: 2,
    minX: 8,
    maxX: 19,
    minZ: 2,
    maxZ: 8,
    defaultFloor: 'lab',
    role: 'research',
  },
  {
    id: 'west_annex',
    name: 'West Robotics & Exec Annex',
    shortName: 'West Annex',
    tagline: '6×14 Executive Lab, Lounge & Compute Annex',
    cost: 160_000,
    autoGrantedAtTier: 3,
    minX: 1,
    maxX: 6,
    minZ: 11,
    maxZ: 24,
    defaultFloor: 'lab',
    role: 'annex',
  },
  {
    id: 'ne_superpod',
    name: 'NE Frontier SuperPod Hall',
    shortName: 'NE Compute Hall',
    tagline: '6×7 Ultra-Dense Frontier Supercomputer Vault',
    cost: 260_000,
    minX: 21,
    maxX: 26,
    minZ: 2,
    maxZ: 8,
    defaultFloor: 'server',
    role: 'datacenter',
  },
  {
    id: 'nw_innovation',
    name: 'NW Innovation & Studio Park',
    shortName: 'NW Studio Wing',
    tagline: '6×7 Frontier Prototyping Studio & Lounge Hall',
    cost: 220_000,
    minX: 1,
    maxX: 6,
    minZ: 2,
    maxZ: 8,
    defaultFloor: 'lounge',
    role: 'research',
  },
];

export const LAND_PARCEL_BY_ID: Record<LandParcelId, LandParcelDef> = Object.fromEntries(
  LAND_PARCELS.map((p) => [p.id, p]),
) as Record<LandParcelId, LandParcelDef>;

export interface BuildingTierDef {
  tier: BuildingTier;
  name: string;
  tagline: string;
  bonusBuildingLabel?: string;
  grantsParcelId?: LandParcelId;
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
    tagline: '12×10 Main HQ Garage',
    upgradeCost: 0,
    minX: 8,
    maxX: 19,
    minZ: 11,
    maxZ: 20,
    serverSplitX: 16,
    loungeMaxX: 10,
    loungeMinZ: 18,
  },
  {
    tier: 1,
    name: 'Innovation Loft',
    tagline: '12×12 HQ + East Compute Building',
    bonusBuildingLabel: '+ East Compute Wing',
    grantsParcelId: 'east_datacenter',
    upgradeCost: 42_000,
    minX: 8,
    maxX: 19,
    minZ: 11,
    maxZ: 22,
    serverSplitX: 16,
    loungeMaxX: 10,
    loungeMinZ: 19,
  },
  {
    tier: 2,
    name: 'AI Research Campus',
    tagline: '12×14 HQ + North Research Pavilion',
    bonusBuildingLabel: '+ North Research Pavilion',
    grantsParcelId: 'north_research',
    upgradeCost: 145_000,
    minX: 8,
    maxX: 19,
    minZ: 10,
    maxZ: 23,
    serverSplitX: 16,
    loungeMaxX: 10,
    loungeMinZ: 20,
  },
  {
    tier: 3,
    name: 'Frontier Mega-Campus',
    tagline: '12×16 HQ + West Robotics Annex',
    bonusBuildingLabel: '+ West Robotics Annex',
    grantsParcelId: 'west_annex',
    upgradeCost: 420_000,
    minX: 8,
    maxX: 19,
    minZ: 10,
    maxZ: 25,
    serverSplitX: 16,
    loungeMaxX: 10,
    loungeMinZ: 22,
  },
];

export function getBuildingTierDef(tier: BuildingTier): BuildingTierDef {
  return BUILDING_TIERS[Math.max(0, Math.min(3, tier))];
}

export function getNextBuildingTier(tier: BuildingTier): BuildingTierDef | null {
  if (tier >= 3) return null;
  return BUILDING_TIERS[tier + 1];
}

/**
 * Returns every currently constructed building footprint (Main HQ + all owned Land Parcel buildings).
 * Used both by simulation placement and by LabScene.ts to build separate 3D architectural shells!
 */
export function getActiveCampusBuildings(
  state: Pick<GameState, 'buildingTier' | 'ownedLandIds'>,
): BuildingFootprint[] {
  const tierDef = getBuildingTierDef(state.buildingTier ?? 0);
  const owned = Array.isArray(state.ownedLandIds) ? state.ownedLandIds : [];
  const buildings: BuildingFootprint[] = [
    {
      id: 'main_hq',
      name: tierDef.name,
      minX: tierDef.minX,
      maxX: tierDef.maxX,
      minZ: tierDef.minZ,
      maxZ: tierDef.maxZ,
      defaultFloor: 'garage',
      role: 'hq',
    },
  ];

  for (const parcel of LAND_PARCELS) {
    if (owned.includes(parcel.id)) {
      buildings.push({
        id: parcel.id,
        name: parcel.name,
        minX: parcel.minX,
        maxX: parcel.maxX,
        minZ: parcel.minZ,
        maxZ: parcel.maxZ,
        defaultFloor: parcel.defaultFloor,
        role: parcel.role,
      });
    }
  }
  return buildings;
}

export function applyParcelFloorPlan(state: GameState, parcel: LandParcelDef): void {
  const w = state.gridWidth;
  for (let z = parcel.minZ; z <= parcel.maxZ; z++) {
    for (let x = parcel.minX; x <= parcel.maxX; x++) {
      let f: FloorType = parcel.defaultFloor;
      if (parcel.id === 'west_annex' && z >= parcel.maxZ - 3) {
        f = 'lounge';
      } else if (parcel.id === 'north_research' && (x === parcel.minX || x === parcel.maxX)) {
        f = 'garage';
      } else if (parcel.id === 'nw_innovation' && z <= parcel.minZ + 3) {
        f = 'lab';
      }
      state.floors[floorIndex(x, z, w)] = f;
    }
  }
}

export function applyTierFloorPlan(state: GameState, tier: BuildingTier): void {
  const def = getBuildingTierDef(tier);
  const w = state.gridWidth;

  for (let z = def.minZ; z <= def.maxZ; z++) {
    for (let x = def.minX; x <= def.maxX; x++) {
      let zone: FloorType = 'garage';
      if (x >= def.serverSplitX && z <= def.maxZ - 2) {
        zone = 'server';
      } else if (x <= def.loungeMaxX && z >= def.loungeMinZ) {
        zone = 'lounge';
      } else if (x >= def.minX + 1 && x < def.serverSplitX && z >= def.minZ + 1 && z < def.loungeMinZ) {
        zone = 'lab';
      }
      state.floors[floorIndex(x, z, w)] = zone;
    }
  }

  // Ensure every owned expansion parcel keeps its indoor floor plan painted cleanly
  const owned = Array.isArray(state.ownedLandIds) ? state.ownedLandIds : [];
  for (const parcel of LAND_PARCELS) {
    if (owned.includes(parcel.id)) {
      applyParcelFloorPlan(state, parcel);
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

export function canBuyLandParcel(
  state: GameState,
  parcelId: LandParcelId,
): { ok: boolean; reason?: string; parcel?: LandParcelDef } {
  const parcel = LAND_PARCEL_BY_ID[parcelId];
  if (!parcel) return { ok: false, reason: 'Unknown land parcel' };
  if (state.ownedLandIds.includes(parcelId)) {
    return { ok: false, reason: 'Already owned', parcel };
  }
  const isFree = Boolean(state.cheatFreeBuild);
  if (!isFree && state.cash < parcel.cost) {
    return { ok: false, reason: `Need $${parcel.cost.toLocaleString()}`, parcel };
  }
  return { ok: true, parcel };
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

function tryAutoPlaceInBounds(
  state: GameState,
  itemId: string,
  preferredFloors: FloorType[],
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
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

  const minX = Math.max(0, bounds.minX);
  const maxX = Math.min(state.gridWidth - fw, bounds.maxX - fw + 1);
  const minZ = Math.max(0, bounds.minZ);
  const maxZ = Math.min(state.gridHeight - fd, bounds.maxZ - fd + 1);

  const tryPass = (requireAisle: boolean): boolean => {
    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
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

function tryAutoPlace(
  state: GameState,
  itemId: string,
  preferredFloors: FloorType[],
  opts?: { free?: boolean; spacing?: boolean; rotation?: RotationQuarter },
): boolean {
  const allowOutdoor =
    itemId === 'power_gen' ||
    itemId === 'substation' ||
    itemId === 'cooling_tower' ||
    itemId === 'fusion_reactor' ||
    itemId === 'cryo_spire';

  if (allowOutdoor && preferredFloors.includes('grass')) {
    // Prefer north/south 2-tile-deep utility boulevards first so 2x2 units stay clean outside buildings!
    if (
      tryAutoPlaceInBounds(
        state,
        itemId,
        ['grass'],
        { minX: 1, maxX: state.gridWidth - 2, minZ: 0, maxZ: 1 },
        opts,
      )
    ) {
      return true;
    }
    if (
      tryAutoPlaceInBounds(
        state,
        itemId,
        ['grass'],
        { minX: 1, maxX: state.gridWidth - 2, minZ: state.gridHeight - 2, maxZ: state.gridHeight - 1 },
        opts,
      )
    ) {
      return true;
    }
    return tryAutoPlaceInBounds(
      state,
      itemId,
      preferredFloors,
      { minX: 0, maxX: state.gridWidth - 1, minZ: 0, maxZ: state.gridHeight - 1 },
      opts,
    );
  }

  // Search across Main HQ + all owned campus buildings!
  const buildings = getActiveCampusBuildings(state);
  for (const b of buildings) {
    if (
      tryAutoPlaceInBounds(
        state,
        itemId,
        preferredFloors,
        { minX: b.minX + 1, maxX: b.maxX - 1, minZ: b.minZ + 1, maxZ: b.maxZ - 1 },
        opts,
      )
    ) {
      return true;
    }
  }
  for (const b of buildings) {
    if (
      tryAutoPlaceInBounds(
        state,
        itemId,
        preferredFloors,
        { minX: b.minX, maxX: b.maxX, minZ: b.minZ, maxZ: b.maxZ },
        opts,
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Automatically ensures an open desk slot exists before hiring a new team member.
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
    if (placedHolo) return { ok: true, placedItemName: 'Holo-Neural Bay' };
  }

  const preferPro =
    isItemUnlocked(state, 'desk_pro') &&
    (opts?.free || state.cheatFreeBuild || state.cash >= 3_600);
  if (preferPro) {
    const placedPro = tryAutoPlace(state, 'desk_pro', ['lab', 'garage'], {
      free: opts?.free,
      spacing: true,
    });
    if (placedPro) return { ok: true, placedItemName: 'Dual-Screen Station' };
  }

  const placedBasic = tryAutoPlace(state, 'desk_basic', ['lab', 'garage'], {
    free: opts?.free,
    spacing: true,
  });
  if (placedBasic) return { ok: true, placedItemName: 'Startup Desk' };

  return { ok: false };
}

/**
 * Neatly auto-furnishes all constructed campus buildings with workstations,
 * whiteboards, coffee bars, bookshelves, plants, and power/cooling balance.
 */
export function autoFurnishLab(
  state: GameState,
  opts?: { free?: boolean },
): { placedCount: number } {
  let placedCount = 0;
  const tier = state.buildingTier;
  const buildingCount = 1 + (state.ownedLandIds?.length ?? 0);
  const free = Boolean(opts?.free || state.cheatFreeBuild);

  const countById = (id: string) => state.items.filter((i) => i.itemId === id).length;

  // 1. Ensure enough desks for staff + headroom scaling with campus size
  const targetDesks = Math.max(state.staff.length + 2, 3 + tier * 3 + Math.min(8, (buildingCount - 1) * 2));
  let res = computeResources(state);
  let guard = 0;
  while (res.deskSlots < targetDesks && guard < 16) {
    guard++;
    const deskRes = autoEnsureDeskForHire(state, { free });
    if (!deskRes.ok) break;
    placedCount++;
    res = computeResources(state);
  }

  // 2. Cozy & research amenities scaled across campus buildings
  const wantCoffee = 1 + Math.floor(buildingCount / 2);
  while (countById('coffee_machine') < wantCoffee) {
    if (!tryAutoPlace(state, 'coffee_machine', ['lounge', 'garage'], { free })) break;
    placedCount++;
  }

  const wantWhiteboards = 1 + tier + Math.floor(buildingCount / 2);
  while (countById('whiteboard') < wantWhiteboards) {
    if (!tryAutoPlace(state, 'whiteboard', ['lab', 'garage'], { free, spacing: true })) break;
    placedCount++;
  }

  const wantShelves = 1 + tier + Math.floor(buildingCount / 2);
  while (countById('bookshelf_posters') < wantShelves) {
    if (!tryAutoPlace(state, 'bookshelf_posters', ['lab', 'garage', 'lounge'], { free, spacing: true })) break;
    placedCount++;
  }

  const wantPlants = 2 + buildingCount;
  while (countById('potted_plant') < wantPlants) {
    if (!tryAutoPlace(state, 'potted_plant', ['lounge', 'garage', 'lab'], { free, spacing: true })) break;
    placedCount++;
  }

  // 3. Auto-balance power & cooling if currently strained
  res = computeResources(state);
  let infraGuard = 0;
  while (res.isUnderpowered && infraGuard < 8) {
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
  while (res.isOverheated && infraGuard < 8) {
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
      `Auto-Furnish neatly installed ${placedCount} campus upgrade${placedCount === 1 ? '' : 's'}.`,
      'good',
    );
  }
  return { placedCount };
}

/**
 * Purchases a surrounding campus land parcel and constructs its dedicated new building!
 */
export function buyLandParcel(
  state: GameState,
  parcelId: LandParcelId,
  opts?: { free?: boolean; silent?: boolean },
): { ok: boolean; reason?: string; parcel?: LandParcelDef } {
  const parcel = LAND_PARCEL_BY_ID[parcelId];
  if (!parcel) return { ok: false, reason: 'Unknown land parcel' };
  if (state.ownedLandIds.includes(parcelId)) {
    return { ok: false, reason: 'Parcel already owned', parcel };
  }

  const free = Boolean(opts?.free || state.cheatFreeBuild);
  if (!free && state.cash < parcel.cost) {
    return { ok: false, reason: `Need $${parcel.cost.toLocaleString()}`, parcel };
  }

  if (!free) {
    state.cash -= parcel.cost;
  }

  state.ownedLandIds.push(parcelId);
  applyParcelFloorPlan(state, parcel);

  // Safely relocate any outdoor utilities standing inside the newly constructed parcel
  for (const item of state.items) {
    const inside =
      item.gx >= parcel.minX &&
      item.gx <= parcel.maxX &&
      item.gz >= parcel.minZ &&
      item.gz <= parcel.maxZ;
    if (
      inside &&
      (item.itemId === 'power_gen' ||
        item.itemId === 'substation' ||
        item.itemId === 'cooling_tower' ||
        item.itemId === 'fusion_reactor' ||
        item.itemId === 'cryo_spire')
    ) {
      item.gz = 0;
    }
  }

  if (state.automation.autoFurnish && !opts?.silent) {
    autoFurnishLab(state, { free });
  }

  if (!opts?.silent) {
    pushNotification(
      state,
      `New Building Constructed: ${parcel.name} (${parcel.tagline})!`,
      'good',
    );
  }
  return { ok: true, parcel };
}

/**
 * Upgrades Main HQ to the next Tier AND automatically constructs a brand-new
 * campus building on every tier progress!
 */
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
  if (next.grantsParcelId && !state.ownedLandIds.includes(next.grantsParcelId)) {
    state.ownedLandIds.push(next.grantsParcelId);
  }
  applyTierFloorPlan(state, next.tier);

  if (state.automation.autoFurnish) {
    autoFurnishLab(state, { free });
  }

  const parcelName = next.grantsParcelId ? LAND_PARCEL_BY_ID[next.grantsParcelId].name : '';
  pushNotification(
    state,
    parcelName
      ? `HQ Upgraded to ${next.name} + NEW BUILDING: ${parcelName} constructed!`
      : `HQ Upgraded to ${next.name} (${next.tagline})!`,
    'good',
  );
  return { ok: true, newTier: next };
}

/**
 * Unlocks all 5 expansion land parcels & Tier 4 Main HQ without wiping player items.
 */
export function unlockAllCampusLand(state: GameState): void {
  state.buildingTier = 3;
  for (const p of LAND_PARCELS) {
    if (!state.ownedLandIds.includes(p.id)) {
      state.ownedLandIds.push(p.id);
    }
  }
  applyTierFloorPlan(state, 3);
  if (state.automation.autoFurnish) {
    autoFurnishLab(state, { free: true });
  }
  pushNotification(
    state,
    'FULL 6-BUILDING AI CAMPUS UNLOCKED! All expansion land parcels & wings constructed!',
    'good',
  );
}

/**
 * Founder Vault Ultimate Cheat:
 * Constructs ALL 6 Campus Buildings (Tier 4 Main HQ + East Data Center + North Research Pavilion
 * + West Robotics Annex + NE Frontier SuperPod Hall + NW Innovation Park) and fills them with
 * era-matched SuperPods / Quantum Cores / Matrioshka Singularity Cores, workstations & balanced power/cooling!
 */
export function applyMaxHyperscaleHQ(state: GameState): void {
  state.buildingTier = 3;
  state.ownedLandIds = LAND_PARCELS.map((p) => p.id);
  applyTierFloorPlan(state, 3);

  state.items = [];
  for (const s of state.staff) {
    s.assignedDeskUid = null;
  }

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
    // === BUILDING 1: MAIN HQ (x: 8..19, z: 10..25) — Command Center, Research Floor & Compute Spine ===
    // Research bays
    { itemId: deskType, gx: 9, gz: 12, rot: 0 },
    { itemId: deskType, gx: 12, gz: 12, rot: 0 },
    { itemId: deskType, gx: 9, gz: 14, rot: 0 },
    { itemId: deskType, gx: 12, gz: 14, rot: 0 },
    { itemId: deskType, gx: 9, gz: 16, rot: 0 },
    { itemId: deskType, gx: 12, gz: 16, rot: 0 },
    { itemId: deskType, gx: 9, gz: 18, rot: 0 },
    { itemId: deskType, gx: 12, gz: 18, rot: 0 },
    // Whiteboards & archive shelves
    { itemId: 'whiteboard', gx: 10, gz: 10, rot: 0 },
    { itemId: 'whiteboard', gx: 13, gz: 10, rot: 0 },
    { itemId: 'bookshelf_posters', gx: 8, gz: 13, rot: 1 },
    { itemId: 'bookshelf_posters', gx: 8, gz: 16, rot: 1 },
    // HQ Server Wing (x: 16..19)
    { itemId: flagshipCore, gx: 16, gz: 11, rot: 0 },
    { itemId: flagshipCore, gx: 16, gz: 14, rot: 0 },
    { itemId: flagshipCore, gx: 16, gz: 17, rot: 0 },
    { itemId: flagshipCore, gx: 16, gz: 20, rot: 0 },
    { itemId: 'ac_unit', gx: 18, gz: 23, rot: 0 },
    // HQ Lounge (x: 8..10, z: 22..25)
    { itemId: 'coffee_machine', gx: 9, gz: 22, rot: 0 },
    { itemId: 'potted_plant', gx: 8, gz: 24, rot: 0 },
    { itemId: 'potted_plant', gx: 11, gz: 24, rot: 0 },

    // === BUILDING 2: EAST COMPUTE WING / DATA CENTER (x: 21..26, z: 11..24) ===
    { itemId: flagshipCore, gx: 21, gz: 11, rot: 0 },
    { itemId: flagshipCore, gx: 24, gz: 11, rot: 0 },
    { itemId: flagshipCore, gx: 21, gz: 14, rot: 0 },
    { itemId: flagshipCore, gx: 24, gz: 14, rot: 0 },
    { itemId: flagshipCore, gx: 21, gz: 17, rot: 0 },
    { itemId: flagshipCore, gx: 24, gz: 17, rot: 0 },
    { itemId: flagshipCore, gx: 21, gz: 20, rot: 0 },
    { itemId: flagshipCore, gx: 24, gz: 20, rot: 0 },
    { itemId: 'server_rack', gx: 21, gz: 23, rot: 0 },
    { itemId: 'server_rack', gx: 23, gz: 23, rot: 0 },
    { itemId: 'server_rack', gx: 25, gz: 23, rot: 0 },

    // === BUILDING 3: NORTH RESEARCH PAVILION (x: 8..19, z: 2..8) ===
    { itemId: deskType, gx: 9, gz: 4, rot: 0 },
    { itemId: deskType, gx: 12, gz: 4, rot: 0 },
    { itemId: deskType, gx: 15, gz: 4, rot: 0 },
    { itemId: deskType, gx: 9, gz: 6, rot: 0 },
    { itemId: deskType, gx: 12, gz: 6, rot: 0 },
    { itemId: deskType, gx: 15, gz: 6, rot: 0 },
    { itemId: 'whiteboard', gx: 10, gz: 2, rot: 0 },
    { itemId: 'whiteboard', gx: 14, gz: 2, rot: 0 },
    { itemId: 'bookshelf_posters', gx: 18, gz: 3, rot: 3 },
    { itemId: 'potted_plant', gx: 8, gz: 7, rot: 0 },
    { itemId: 'potted_plant', gx: 19, gz: 7, rot: 0 },

    // === BUILDING 4: WEST ROBOTICS & EXEC ANNEX (x: 1..6, z: 11..24) ===
    { itemId: deskType, gx: 2, gz: 12, rot: 0 },
    { itemId: deskType, gx: 2, gz: 15, rot: 0 },
    { itemId: deskType, gx: 2, gz: 18, rot: 0 },
    { itemId: 'whiteboard', gx: 3, gz: 11, rot: 0 },
    { itemId: 'bookshelf_posters', gx: 1, gz: 14, rot: 1 },
    { itemId: 'coffee_machine', gx: 2, gz: 21, rot: 0 },
    { itemId: 'coffee_machine', gx: 4, gz: 21, rot: 0 },
    { itemId: 'potted_plant', gx: 1, gz: 23, rot: 0 },
    { itemId: 'potted_plant', gx: 5, gz: 23, rot: 0 },

    // === BUILDING 5: NE FRONTIER SUPERPOD HALL (x: 21..26, z: 2..8) ===
    { itemId: flagshipCore, gx: 21, gz: 2, rot: 0 },
    { itemId: flagshipCore, gx: 24, gz: 2, rot: 0 },
    { itemId: flagshipCore, gx: 21, gz: 5, rot: 0 },
    { itemId: flagshipCore, gx: 24, gz: 5, rot: 0 },
    { itemId: 'ac_unit', gx: 22, gz: 8, rot: 0 },
    { itemId: 'ac_unit', gx: 25, gz: 8, rot: 0 },

    // === BUILDING 6: NW INNOVATION STUDIO (x: 1..6, z: 2..8) ===
    { itemId: deskType, gx: 2, gz: 3, rot: 0 },
    { itemId: deskType, gx: 2, gz: 5, rot: 0 },
    { itemId: 'whiteboard', gx: 3, gz: 2, rot: 0 },
    { itemId: 'coffee_machine', gx: 2, gz: 7, rot: 0 },
    { itemId: 'potted_plant', gx: 5, gz: 7, rot: 0 },

    // === NORTH & SOUTH UTILITY BOULEVARDS (z: 0..1 and z: 26..27) ===
    { itemId: powerType, gx: 2, gz: 0, rot: 0 },
    { itemId: powerType, gx: 5, gz: 0, rot: 0 },
    { itemId: powerType, gx: 9, gz: 0, rot: 0 },
    { itemId: powerType, gx: 12, gz: 0, rot: 0 },
    { itemId: powerType, gx: 15, gz: 0, rot: 0 },
    { itemId: powerType, gx: 18, gz: 0, rot: 0 },
    { itemId: powerType, gx: 21, gz: 0, rot: 0 },
    { itemId: powerType, gx: 24, gz: 0, rot: 0 },

    { itemId: coolType, gx: 1, gz: 26, rot: 0 },
    { itemId: coolType, gx: 4, gz: 26, rot: 0 },
    { itemId: coolType, gx: 7, gz: 26, rot: 0 },
    { itemId: coolType, gx: 10, gz: 26, rot: 0 },
    { itemId: coolType, gx: 17, gz: 26, rot: 0 },
    { itemId: coolType, gx: 20, gz: 26, rot: 0 },
    { itemId: coolType, gx: 23, gz: 26, rot: 0 },
    { itemId: coolType, gx: 25, gz: 26, rot: 0 },
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

  state.extraGridPowerContracts = Math.max(state.extraGridPowerContracts, 60);

  // Guarantee zero thermal throttling & zero power deficit across every Era (2010..2100)
  let balanceGuard = 0;
  let postRes = computeResources(state);
  while (postRes.isOverheated && balanceGuard < 24) {
    balanceGuard++;
    const placedChiller =
      tryAutoPlace(state, coolType, ['grass', 'server'], { free: true }) ||
      tryAutoPlace(state, 'cryo_spire', ['grass', 'server'], { free: true }) ||
      tryAutoPlace(state, 'ac_unit', ['server', 'garage', 'lounge'], { free: true });
    if (!placedChiller) break;
    postRes = computeResources(state);
  }
  while (postRes.isUnderpowered && balanceGuard < 48) {
    balanceGuard++;
    state.extraGridPowerContracts += 15;
    postRes = computeResources(state);
  }

  const walkable = getWalkableIndoorTiles(state);
  if (walkable.length > 0) {
    state.staff.forEach((s, idx) => {
      const [wx, wz] = walkable[(idx * 7) % walkable.length];
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
      ? '2100 SINGULARITY 6-BUILDING MEGA-CAMPUS ONLINE! 16 Matrioshka Cores & Holo-Labs deployed!'
      : 'FRONTIER 6-BUILDING MEGA-CAMPUS BUILT! All land parcels & SuperPod Data Centers online!',
    'good',
  );
}
