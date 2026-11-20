/**
 * Pure deterministic 40x40 15-Building Master-Planned Campus, Multi-Story Tower
 * Upgrades (1F–6F), Land Parcel Purchasing, Auto-Furnish, and Founder Vault
 * Max 15-Building 6F Mega-Campus builder.
 * Zero React or Three.js imports.
 */

import { BALANCE } from '../data/balance';
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

export const MAX_BUILDING_STORIES = BALANCE.maxBuildingStories; // 6 stories (1F..6F)

export const STORY_UPGRADE_COSTS: readonly number[] = [
  0, // 1F (ground)
  38_000, // 2F
  95_000, // 3F
  195_000, // 4F
  360_000, // 5F
  640_000, // 6F
];

export interface BuildingFootprint {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  defaultFloor: FloorType;
  role: 'hq' | 'datacenter' | 'research' | 'annex';
  stories: number;
}

export interface LandParcelDef {
  id: LandParcelId;
  name: string;
  shortName: string;
  district: 'Central' | 'North' | 'South' | 'East' | 'West';
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

/**
 * 14 surrounding buyable land parcels + Main HQ = 15 full buildings covering
 * the entire 40x40 campus estate (5 columns x 3 rows with paved walkways between
 * every building and 2-tile outer utility boulevards on z:0..1 and z:38..39).
 */
export const LAND_PARCELS: readonly LandParcelDef[] = [
  // === INNER RING (adjacent to Main HQ) ===
  {
    id: 'east_datacenter',
    name: 'East Compute Wing',
    shortName: 'East Data Center',
    district: 'East',
    tagline: '6×14 Dedicated GPU / Quantum Data Center Building',
    cost: 45_000,
    autoGrantedAtTier: 1,
    minX: 26,
    maxX: 31,
    minZ: 13,
    maxZ: 26,
    defaultFloor: 'server',
    role: 'datacenter',
  },
  {
    id: 'north_research',
    name: 'North Research Pavilion',
    shortName: 'North Lab Wing',
    district: 'North',
    tagline: '10×10 Skylight AI Research & Alignment Building',
    cost: 95_000,
    autoGrantedAtTier: 2,
    minX: 15,
    maxX: 24,
    minZ: 2,
    maxZ: 11,
    defaultFloor: 'lab',
    role: 'research',
  },
  {
    id: 'west_annex',
    name: 'West Robotics & Exec Annex',
    shortName: 'West Annex',
    district: 'West',
    tagline: '6×14 Executive Lab, Lounge & Compute Annex',
    cost: 150_000,
    autoGrantedAtTier: 3,
    minX: 8,
    maxX: 13,
    minZ: 13,
    maxZ: 26,
    defaultFloor: 'lab',
    role: 'annex',
  },
  {
    id: 'south_plaza',
    name: 'South AI Foundry & Hub',
    shortName: 'South Hub',
    district: 'South',
    tagline: '10×9 Front-Plaza Developer Hub & Demo Center',
    cost: 165_000,
    minX: 15,
    maxX: 24,
    minZ: 28,
    maxZ: 36,
    defaultFloor: 'lab',
    role: 'research',
  },

  // === INNER CORNERS ===
  {
    id: 'ne_superpod',
    name: 'NE Frontier SuperPod Hall',
    shortName: 'NE Compute Hall',
    district: 'North',
    tagline: '6×10 Ultra-Dense Frontier Supercomputer Vault',
    cost: 220_000,
    minX: 26,
    maxX: 31,
    minZ: 2,
    maxZ: 11,
    defaultFloor: 'server',
    role: 'datacenter',
  },
  {
    id: 'nw_innovation',
    name: 'NW Innovation & Studio Park',
    shortName: 'NW Studio Wing',
    district: 'North',
    tagline: '6×10 Frontier Prototyping Studio & Lounge Hall',
    cost: 195_000,
    minX: 8,
    maxX: 13,
    minZ: 2,
    maxZ: 11,
    defaultFloor: 'lounge',
    role: 'research',
  },
  {
    id: 'se_datacenter',
    name: 'SE Cloud Inference Vault',
    shortName: 'SE Inference Hall',
    district: 'South',
    tagline: '6×9 High-Throughput API Serving & GPU Center',
    cost: 210_000,
    minX: 26,
    maxX: 31,
    minZ: 28,
    maxZ: 36,
    defaultFloor: 'server',
    role: 'datacenter',
  },
  {
    id: 'sw_campus',
    name: 'SW Talent & Startup Incubator',
    shortName: 'SW Incubator',
    district: 'South',
    tagline: '6×9 Engineering Academy & Recruiting Wing',
    cost: 185_000,
    minX: 8,
    maxX: 13,
    minZ: 28,
    maxZ: 36,
    defaultFloor: 'lab',
    role: 'annex',
  },

  // === OUTER EAST EXPANSION ESTATE ===
  {
    id: 'far_east_mega',
    name: 'Far-East Hyperscale Megahall',
    shortName: 'Far-East MegaDC',
    district: 'East',
    tagline: '6×14 Outer-Estate Exascale Compute Megahall',
    cost: 340_000,
    minX: 33,
    maxX: 38,
    minZ: 13,
    maxZ: 26,
    defaultFloor: 'server',
    role: 'datacenter',
  },
  {
    id: 'far_east_north',
    name: 'Far-East Quantum Core Tower',
    shortName: 'NE Quantum Tower',
    district: 'East',
    tagline: '6×10 Outer-Northeast Quantum & Cryo Vault',
    cost: 390_000,
    minX: 33,
    maxX: 38,
    minZ: 2,
    maxZ: 11,
    defaultFloor: 'server',
    role: 'datacenter',
  },
  {
    id: 'far_east_south',
    name: 'Far-East Neural Grid Annex',
    shortName: 'SE Neural Grid',
    district: 'East',
    tagline: '6×9 Outer-Southeast Edge Compute & Power Hub',
    cost: 310_000,
    minX: 33,
    maxX: 38,
    minZ: 28,
    maxZ: 36,
    defaultFloor: 'server',
    role: 'datacenter',
  },

  // === OUTER WEST EXPANSION ESTATE ===
  {
    id: 'far_west_labs',
    name: 'Far-West Bio-AI & Robotics Lab',
    shortName: 'Far-West Labs',
    district: 'West',
    tagline: '6×14 Outer-West Frontier Science & Robotics Wing',
    cost: 320_000,
    minX: 1,
    maxX: 6,
    minZ: 13,
    maxZ: 26,
    defaultFloor: 'lab',
    role: 'research',
  },
  {
    id: 'far_west_north',
    name: 'Far-West Alignment Observatory',
    shortName: 'NW Observatory',
    district: 'West',
    tagline: '6×10 Outer-Northwest Safety & Theory Tower',
    cost: 360_000,
    minX: 1,
    maxX: 6,
    minZ: 2,
    maxZ: 11,
    defaultFloor: 'lab',
    role: 'research',
  },
  {
    id: 'far_west_south',
    name: 'Far-West Founder Commons',
    shortName: 'SW Commons',
    district: 'West',
    tagline: '6×9 Outer-Southwest Lounge, Studio & Media Hall',
    cost: 280_000,
    minX: 1,
    maxX: 6,
    minZ: 28,
    maxZ: 36,
    defaultFloor: 'lounge',
    role: 'annex',
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
    tagline: '10×10 Main HQ Garage',
    upgradeCost: 0,
    minX: 15,
    maxX: 24,
    minZ: 15,
    maxZ: 24,
    serverSplitX: 21,
    loungeMaxX: 17,
    loungeMinZ: 22,
  },
  {
    tier: 1,
    name: 'Innovation Loft',
    tagline: '10×12 HQ + East Compute Building',
    bonusBuildingLabel: '+ East Compute Wing',
    grantsParcelId: 'east_datacenter',
    upgradeCost: 42_000,
    minX: 15,
    maxX: 24,
    minZ: 14,
    maxZ: 25,
    serverSplitX: 21,
    loungeMaxX: 17,
    loungeMinZ: 23,
  },
  {
    tier: 2,
    name: 'AI Research Campus',
    tagline: '10×13 HQ + North Research Pavilion',
    bonusBuildingLabel: '+ North Research Pavilion',
    grantsParcelId: 'north_research',
    upgradeCost: 145_000,
    minX: 15,
    maxX: 24,
    minZ: 13,
    maxZ: 25,
    serverSplitX: 21,
    loungeMaxX: 17,
    loungeMinZ: 23,
  },
  {
    tier: 3,
    name: 'Frontier Mega-Campus',
    tagline: '10×14 HQ + West Robotics Annex',
    bonusBuildingLabel: '+ West Robotics Annex',
    grantsParcelId: 'west_annex',
    upgradeCost: 420_000,
    minX: 15,
    maxX: 24,
    minZ: 13,
    maxZ: 26,
    serverSplitX: 21,
    loungeMaxX: 17,
    loungeMinZ: 24,
  },
];

export function getBuildingTierDef(tier: BuildingTier): BuildingTierDef {
  return BUILDING_TIERS[Math.max(0, Math.min(3, tier))];
}

export function getNextBuildingTier(tier: BuildingTier): BuildingTierDef | null {
  if (tier >= 3) return null;
  return BUILDING_TIERS[tier + 1];
}

export function getBuildingStories(
  state: Pick<GameState, 'buildingStories'>,
  buildingId: string,
): number {
  const raw = state.buildingStories?.[buildingId] ?? 1;
  return Math.max(1, Math.min(MAX_BUILDING_STORIES, Math.floor(raw)));
}

export function getMaxCampusStories(
  state: Pick<GameState, 'buildingTier' | 'ownedLandIds' | 'buildingStories'>,
): number {
  let max = getBuildingStories(state, 'main_hq');
  for (const id of state.ownedLandIds ?? []) {
    max = Math.max(max, getBuildingStories(state, id));
  }
  return max;
}

/**
 * Returns every currently constructed building footprint (Main HQ + all owned Land Parcels)
 * along with its current multi-story height (1..6F).
 */
export function getActiveCampusBuildings(
  state: Pick<GameState, 'buildingTier' | 'ownedLandIds' | 'buildingStories'>,
): BuildingFootprint[] {
  const tierDef = getBuildingTierDef(state.buildingTier ?? 0);
  const owned = Array.isArray(state.ownedLandIds) ? state.ownedLandIds : [];
  const buildings: BuildingFootprint[] = [
    {
      id: 'main_hq',
      name: `Main HQ (${tierDef.name})`,
      minX: tierDef.minX,
      maxX: tierDef.maxX,
      minZ: tierDef.minZ,
      maxZ: tierDef.maxZ,
      defaultFloor: 'garage',
      role: 'hq',
      stories: getBuildingStories(state, 'main_hq'),
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
        stories: getBuildingStories(state, parcel.id),
      });
    }
  }
  return buildings;
}

/**
 * Finds which active building contains tile (gx, gz), or null if outdoor/walkway.
 */
export function getBuildingAtTile(
  state: Pick<GameState, 'buildingTier' | 'ownedLandIds' | 'buildingStories'>,
  gx: number,
  gz: number,
): BuildingFootprint | null {
  const buildings = getActiveCampusBuildings(state);
  for (const b of buildings) {
    if (gx >= b.minX && gx <= b.maxX && gz >= b.minZ && gz <= b.maxZ) {
      return b;
    }
  }
  return null;
}

export function getNextStoryCost(currentStories: number): number {
  if (currentStories >= MAX_BUILDING_STORIES) return 0;
  return STORY_UPGRADE_COSTS[currentStories] ?? 640_000;
}

export function canAddBuildingStory(
  state: GameState,
  buildingId: string,
): { ok: boolean; reason?: string; currentStories: number; nextStories: number; cost: number } {
  const isOwned =
    buildingId === 'main_hq' ||
    (Array.isArray(state.ownedLandIds) && state.ownedLandIds.includes(buildingId as LandParcelId));
  const currentStories = getBuildingStories(state, buildingId);
  const nextStories = Math.min(MAX_BUILDING_STORIES, currentStories + 1);
  const cost = state.cheatFreeBuild ? 0 : getNextStoryCost(currentStories);

  if (!isOwned) {
    return { ok: false, reason: 'Buy land parcel first', currentStories, nextStories, cost };
  }
  if (currentStories >= MAX_BUILDING_STORIES) {
    return { ok: false, reason: `Max ${MAX_BUILDING_STORIES}F reached`, currentStories, nextStories, cost: 0 };
  }
  if (state.cash < cost) {
    return { ok: false, reason: `Need $${cost.toLocaleString()}`, currentStories, nextStories, cost };
  }
  return { ok: true, currentStories, nextStories, cost };
}

/**
 * Builds an additional vertical story (+1F, up to 6F) on any constructed building,
 * dramatically expanding its 3D tower height AND multiplying its indoor workspace & compute capacity!
 */
export function addBuildingStory(
  state: GameState,
  buildingId: string,
  opts?: { free?: boolean; silent?: boolean },
): { ok: boolean; reason?: string; stories?: number } {
  const check = canAddBuildingStory(state, buildingId);
  if (!check.ok && !(opts?.free && check.currentStories < MAX_BUILDING_STORIES && check.reason?.startsWith('Need'))) {
    return { ok: false, reason: check.reason };
  }

  const free = Boolean(opts?.free || state.cheatFreeBuild);
  if (!free) {
    state.cash -= check.cost;
  }

  if (!state.buildingStories) state.buildingStories = { main_hq: 1 };
  const newStories = check.currentStories + 1;
  state.buildingStories[buildingId] = newStories;

  const bName =
    buildingId === 'main_hq'
      ? 'Main HQ'
      : LAND_PARCEL_BY_ID[buildingId as LandParcelId]?.name ?? buildingId;

  if (!opts?.silent) {
    pushNotification(
      state,
      `Constructed Floor ${newStories}F on ${bName}! Vertical workspaces & compute capacity expanded!`,
      'good',
    );
  }
  return { ok: true, stories: newStories };
}

/**
 * Upgrades EVERY currently constructed campus building to MAX 6F Skyscrapers!
 */
export function upgradeAllBuildingsToMaxStories(state: GameState): number {
  if (!state.buildingStories) state.buildingStories = { main_hq: 1 };
  const buildings = getActiveCampusBuildings(state);
  let upgraded = 0;
  for (const b of buildings) {
    if (b.stories < MAX_BUILDING_STORIES) {
      state.buildingStories[b.id] = MAX_BUILDING_STORIES;
      upgraded++;
    }
  }
  pushNotification(
    state,
    `ALL ${buildings.length} CAMPUS BUILDINGS UPGRADED TO ${MAX_BUILDING_STORIES}F SKYSCRAPERS!`,
    'good',
  );
  return upgraded;
}

export function applyParcelFloorPlan(state: GameState, parcel: LandParcelDef): void {
  const w = state.gridWidth;
  for (let z = parcel.minZ; z <= parcel.maxZ; z++) {
    for (let x = parcel.minX; x <= parcel.maxX; x++) {
      let f: FloorType = parcel.defaultFloor;
      if ((parcel.id === 'west_annex' || parcel.id === 'sw_campus') && z >= parcel.maxZ - 2) {
        f = 'lounge';
      } else if (parcel.id === 'north_research' && (x === parcel.minX || x === parcel.maxX)) {
        f = 'garage';
      } else if ((parcel.id === 'nw_innovation' || parcel.id === 'far_west_south') && z <= parcel.minZ + 4) {
        f = 'lab';
      } else if (parcel.id === 'south_plaza' && z >= parcel.maxZ - 2) {
        f = 'lounge';
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
  opts?: { free?: boolean; silent?: boolean },
): { placedCount: number } {
  let placedCount = 0;
  const tier = state.buildingTier;
  const buildingCount = 1 + (state.ownedLandIds?.length ?? 0);
  const free = Boolean(opts?.free || state.cheatFreeBuild);

  const countById = (id: string) => state.items.filter((i) => i.itemId === id).length;

  // 1. Ensure enough desks for staff + headroom scaling across all constructed buildings
  const targetDesks = Math.max(
    state.staff.length + 2,
    3 + tier * 3 + Math.min(24, (buildingCount - 1) * 2),
  );
  let res = computeResources(state);
  let guard = 0;
  while (res.deskSlots < targetDesks && guard < 24) {
    guard++;
    const deskRes = autoEnsureDeskForHire(state, { free });
    if (!deskRes.ok) break;
    placedCount++;
    res = computeResources(state);
  }

  // 2. Amenities scaled cleanly across campus buildings
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

  // 3. Auto-balance power & cooling if currently strained (skip when unlimited power is active)
  res = computeResources(state);
  let infraGuard = 0;
  while (res.isUnderpowered && infraGuard < 10) {
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
  while (res.isOverheated && infraGuard < 10) {
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

  if (placedCount > 0 && !opts?.silent) {
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
  if (!state.buildingStories) state.buildingStories = { main_hq: 1 };
  if (!state.buildingStories[parcelId]) state.buildingStories[parcelId] = 1;
  applyParcelFloorPlan(state, parcel);

  // Relocate any outdoor utilities standing inside the newly constructed parcel
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
  if (!state.buildingStories) state.buildingStories = { main_hq: 1 };
  // Upgrading HQ Tier also adds a free bonus floor up to tier+1!
  state.buildingStories.main_hq = Math.max(state.buildingStories.main_hq ?? 1, next.tier + 1);

  if (next.grantsParcelId && !state.ownedLandIds.includes(next.grantsParcelId)) {
    state.ownedLandIds.push(next.grantsParcelId);
    if (!state.buildingStories[next.grantsParcelId]) {
      state.buildingStories[next.grantsParcelId] = 1;
    }
  }
  applyTierFloorPlan(state, next.tier);

  if (state.automation.autoFurnish) {
    autoFurnishLab(state, { free });
  }

  const parcelName = next.grantsParcelId ? LAND_PARCEL_BY_ID[next.grantsParcelId].name : '';
  pushNotification(
    state,
    parcelName
      ? `HQ Upgraded to ${next.name} (${state.buildingStories.main_hq}F) + NEW BUILDING: ${parcelName}!`
      : `HQ Upgraded to ${next.name} (${next.tagline})!`,
    'good',
  );
  return { ok: true, newTier: next };
}

/**
 * Unlocks ALL 14 expansion land parcels (15 total buildings!) & Tier 4 Main HQ without wiping items.
 */
export function unlockAllCampusLand(state: GameState): void {
  state.buildingTier = 3;
  if (!state.buildingStories) state.buildingStories = { main_hq: 1 };
  for (const p of LAND_PARCELS) {
    if (!state.ownedLandIds.includes(p.id)) {
      state.ownedLandIds.push(p.id);
    }
    if (!state.buildingStories[p.id]) {
      state.buildingStories[p.id] = 1;
    }
  }
  applyTierFloorPlan(state, 3);
  if (state.automation.autoFurnish) {
    autoFurnishLab(state, { free: true });
  }
  pushNotification(
    state,
    'ENTIRE 15-BUILDING AI ESTATE UNLOCKED! All 14 expansion land parcels constructed!',
    'good',
  );
}

/**
 * Founder Vault Ultimate Cheat:
 * Constructs ALL 15 Campus Buildings across the entire 40x40 estate, upgrades EVERY
 * building into a towering 6-Story (6F) Skyscraper, and populates every Data Center &
 * Research Wing with era-matched clusters, desks, lounges, and balanced power/cooling!
 */
export function applyMaxHyperscaleHQ(state: GameState): void {
  state.buildingTier = 3;
  state.ownedLandIds = LAND_PARCELS.map((p) => p.id);
  state.buildingStories = { main_hq: MAX_BUILDING_STORIES };
  for (const p of LAND_PARCELS) {
    // Architectural skyline variation: main HQ + core towers at 6F, data centers at 4F-5F, outer wings 4F-6F
    // Wait: user requested max building stories -> make ALL 15 buildings full MAX 6F!
    state.buildingStories[p.id] = MAX_BUILDING_STORIES;
  }
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

  const layout: Array<{ itemId: string; gx: number; gz: number; rot: RotationQuarter }> = [];
  const occupied = new Set<string>();

  const tryStamp = (itemId: string, gx: number, gz: number, rot: RotationQuarter = 0) => {
    const [fw, fd] = getRotatedFootprint(itemId, rot);
    for (let dx = 0; dx < fw; dx++) {
      for (let dz = 0; dz < fd; dz++) {
        const tx = gx + dx;
        const tz = gz + dz;
        if (tx < 0 || tz < 0 || tx >= state.gridWidth || tz >= state.gridHeight) return;
        if (occupied.has(`${tx},${tz}`)) return;
      }
    }
    for (let dx = 0; dx < fw; dx++) {
      for (let dz = 0; dz < fd; dz++) {
        occupied.add(`${gx + dx},${gz + dz}`);
      }
    }
    layout.push({ itemId, gx, gz, rot });
  };

  // Populate EVERY single one of the 15 buildings cleanly by architectural role!
  const buildings = getActiveCampusBuildings(state);
  for (const b of buildings) {
    if (b.role === 'hq') {
      // Main HQ (x: 15..24, z: 13..26): Research Bays + Compute Spine + Lounge
      for (const gz of [15, 17, 19, 21]) {
        tryStamp(deskType, b.minX + 1, gz, 0);
        tryStamp(deskType, b.minX + 3, gz, 0);
      }
      tryStamp('whiteboard', b.minX + 2, b.minZ, 0);
      tryStamp('whiteboard', b.minX + 5, b.minZ, 0);
      tryStamp('bookshelf_posters', b.minX, b.minZ + 3, 1);
      tryStamp(flagshipCore, b.maxX - 2, b.minZ + 1, 0);
      tryStamp(flagshipCore, b.maxX - 2, b.minZ + 4, 0);
      tryStamp(flagshipCore, b.maxX - 2, b.minZ + 7, 0);
      tryStamp('coffee_machine', b.minX + 1, b.maxZ - 1, 0);
      tryStamp('potted_plant', b.minX, b.maxZ, 0);
      tryStamp('potted_plant', b.maxX, b.maxZ, 0);
    } else if (b.role === 'datacenter') {
      // Dedicated Data Center Towers: rows of flagship 3x2 SuperPod/Quantum/Singularity clusters
      for (let gz = b.minZ; gz <= b.maxZ - 2; gz += 3) {
        tryStamp(flagshipCore, b.minX, gz, 0);
        tryStamp(flagshipCore, b.minX + 3, gz, 0);
      }
      tryStamp('server_rack', b.minX + 1, b.maxZ, 0);
      tryStamp('ac_unit', b.maxX - 1, b.maxZ, 0);
    } else {
      // Research & Annex Towers: spacious rows of dual/holo workstations + whiteboards + coffee lounge
      for (let gz = b.minZ + 2; gz <= b.maxZ - 2; gz += 2) {
        for (let gx = b.minX + 1; gx <= b.maxX - 2; gx += 3) {
          tryStamp(deskType, gx, gz, 0);
        }
      }
      tryStamp('whiteboard', b.minX + 2, b.minZ, 0);
      tryStamp('bookshelf_posters', b.minX, b.minZ + 1, 1);
      tryStamp('coffee_machine', b.minX + 1, b.maxZ - 1, 0);
      tryStamp('potted_plant', b.maxX, b.maxZ, 0);
    }
  }

  // North & South Outdoor Utility Boulevards (z: 0..1 and z: 38..39)
  for (let gx = 1; gx <= state.gridWidth - 3; gx += 3) {
    tryStamp(powerType, gx, 0, 0);
    // Leave main driveway opening clear at x: 18..21 on south edge
    if (gx < 17 || gx > 21) {
      tryStamp(coolType, gx, state.gridHeight - 2, 0);
    }
  }

  for (const p of layout) {
    forcePlaceItem(state, p.itemId, p.gx, p.gz, p.rot);
  }

  state.extraGridPowerContracts = Math.max(state.extraGridPowerContracts, 240);

  // Guarantee zero thermal throttling & zero power deficit across every Era (2010..2100)
  let balanceGuard = 0;
  let postRes = computeResources(state);
  while (postRes.isOverheated && balanceGuard < 32) {
    balanceGuard++;
    const placedChiller =
      tryAutoPlace(state, coolType, ['grass', 'server'], { free: true }) ||
      tryAutoPlace(state, 'cryo_spire', ['grass', 'server'], { free: true }) ||
      tryAutoPlace(state, 'ac_unit', ['server', 'garage', 'lounge'], { free: true });
    if (!placedChiller) break;
    postRes = computeResources(state);
  }
  while (postRes.isUnderpowered && balanceGuard < 64) {
    balanceGuard++;
    state.extraGridPowerContracts += 40;
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
      ? '2100 SINGULARITY 15-BUILDING 6F SKYLINE ONLINE! All 15 towers & Matrioshka Cores deployed!'
      : '15-BUILDING 6F MEGA-CAMPUS BUILT! All 14 land parcels & 6-story towers online!',
    'good',
  );
}
