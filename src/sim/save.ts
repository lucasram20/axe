/**
 * Initial 2010 Garage Startup factory, versioned multi-slot localStorage serialization,
 * and automatic schema migration (including legacy 18x18 -> 28x28 campus expansion).
 * Zero React or Three.js imports.
 */

import { BALANCE } from '../data/balance';
import type { FloorType } from '../data/items';
import { RIVAL_TEMPLATES } from '../data/rivals';
import { applyTierFloorPlan } from './facility';
import { floorIndex } from './grid';
import { generateCandidate, populateCandidates } from './staffSim';
import { allocUid, type BuildingTier, type GameState, type LandParcelId } from './types';

export const SAVE_STORAGE_KEY = 'project_labs_save_v1';
export const SAVE_VERSION = 3;

export type SaveSlotId = 'autosave' | 'slot_1' | 'slot_2' | 'slot_3';

export const SAVE_SLOT_KEYS: Record<SaveSlotId, string> = {
  autosave: SAVE_STORAGE_KEY,
  slot_1: 'project_labs_slot_1',
  slot_2: 'project_labs_slot_2',
  slot_3: 'project_labs_slot_3',
};

export const SAVE_SLOT_LABELS: Record<SaveSlotId, string> = {
  autosave: 'Auto-Save',
  slot_1: 'Slot 1',
  slot_2: 'Slot 2',
  slot_3: 'Slot 3',
};

export const RANDOM_LAB_NAMES: readonly string[] = [
  'AetherMind Labs',
  'NeuralForge AI',
  'Helios Tensor Works',
  'Kestrel Intelligence',
  'NovaMind Foundry',
  'Cortex Dynamics',
  'Aperture Deep Labs',
  'Solstice Research',
  'Vanguard AI Studio',
  'Obsidian Tensor Co.',
  'Lumina Reasoning Labs',
  'Hyperion AI Works',
];

export interface SaveSlotSummary {
  slotId: SaveSlotId;
  label: string;
  exists: boolean;
  labName?: string;
  year?: number;
  eraIndex?: number;
  cash?: number;
  buildingCount?: number;
  savedAtMs?: number;
}

export function sanitizeLabName(raw?: string): string {
  const cleaned = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 28);
  return cleaned.length > 0 ? cleaned : 'Garage Tensor Works';
}

export function createInitialState(
  nowMs: number = Date.now(),
  customLabName?: string,
): GameState {
  const w = BALANCE.gridWidth;
  const h = BALANCE.gridHeight;
  const floors: FloorType[] = new Array<FloorType>(w * h).fill('grass');
  const labName = sanitizeLabName(customLabName);

  const state: GameState = {
    version: SAVE_VERSION,
    labName,
    rngSeed: 20100101,
    nextUid: 1,

    totalDays: 0,
    year: BALANCE.startYear,
    month: BALANCE.startMonth,
    dayOfMonth: BALANCE.startDay,
    eraIndex: 0,
    timeOfDay: 0.38, // Crisp mid-morning sunlight on start
    speed: 1,

    cash: BALANCE.startingCash,
    reputation: BALANCE.startingReputation,
    hype: BALANCE.startingHype,
    safety: BALANCE.startingSafety,
    founderEquityPct: 100,
    valuation: 220_000,
    bonusCompute: 0,
    extraGridPowerContracts: 0,

    buildingTier: 0,
    ownedLandIds: [],
    buildingStories: { main_hq: 1 },
    gridWidth: w,
    gridHeight: h,
    floors,
    items: [],

    staff: [],
    candidates: [],

    unlockedTechs: ['tech_convnet'],
    ownedDatasets: ['ds_academic_vision'],
    completedFundingIds: [],

    trainingJobs: [],
    models: [],
    products: [],
    modelCounter: 0,

    rivals: RIVAL_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      motto: t.motto,
      color: t.color,
      topBenchmark: t.startBenchmark,
      valuation: t.startValuation,
      modelsShipped: 1,
      flagshipModel: `${t.flagshipPrefix}-1.0`,
    })),

    activeEvent: null,
    lastEventDay: 0,
    computePenaltyUntilDay: 0,
    powerPenaltyUntilDay: 0,

    automation: {
      autoQueueTraining: false,
      autoBuyPower: false,
      autoHireStaff: false,
      autoFurnish: true,
      lastArchId: 'arch_convnet',
      lastDatasetId: 'ds_academic_vision',
    },

    settings: {
      pixelScale: 1, // Crisp low-poly pixel look (full clarity on mobile & desktop)
      outlines: true,
      shadows: true,
      paletteQuantize: false,
      edgeScroll: false,
      muted: false,
    },

    notifications: [
      {
        id: 'ntf_welcome',
        text: `Welcome to 2010, ${labName}! Train a ConvNet, upgrade your HQ, or buy campus land.`,
        tone: 'good',
        day: 0,
      },
    ],

    cheatPerfectModels: false,
    cheatFreeBuild: false,
    cheatUnlimitedCompute: false,
    cheatUnlimitedPower: false,
    cheatUnlimitedModels: false,

    lastCompletedModelId: null,
    lastSavedAtMs: nowMs,
  };

  // Paint Tier 0 Main HQ floor zones cleanly (x: 15..24, z: 15..24)
  applyTierFloorPlan(state, 0);

  // Seed a clean, airy, well-spaced starter 2010 garage AI lab inside x: 15..24, z: 15..24
  const starterProps: Array<{ itemId: string; gx: number; gz: number; rot: 0 | 1 | 2 | 3 }> = [
    // Research workstations with spacious aisles
    { itemId: 'desk_basic', gx: 17, gz: 17, rot: 0 },
    { itemId: 'desk_basic', gx: 19, gz: 17, rot: 0 },
    { itemId: 'desk_basic', gx: 17, gz: 19, rot: 0 },
    { itemId: 'whiteboard', gx: 18, gz: 15, rot: 0 },
    { itemId: 'bookshelf_posters', gx: 15, gz: 17, rot: 1 },

    // Starter GPU corner + cooling + outdoor generator
    { itemId: 'gpu_rig_2010', gx: 21, gz: 16, rot: 0 },
    { itemId: 'gpu_rig_2010', gx: 23, gz: 16, rot: 0 },
    { itemId: 'server_rack', gx: 22, gz: 19, rot: 0 },
    { itemId: 'ac_unit', gx: 21, gz: 15, rot: 0 },
    { itemId: 'power_gen', gx: 23, gz: 25, rot: 0 },

    // Cozy lounge corner
    { itemId: 'coffee_machine', gx: 15, gz: 22, rot: 0 },
    { itemId: 'potted_plant', gx: 15, gz: 24, rot: 0 },
    { itemId: 'potted_plant', gx: 23, gz: 23, rot: 0 },
  ];

  for (const p of starterProps) {
    state.items.push({
      uid: allocUid(state, 'itm'),
      itemId: p.itemId,
      gx: p.gx,
      gz: p.gz,
      rotation: p.rot,
      placedAtDay: 0,
    });
  }

  // Seed 2 founding engineers so the lab is alive on frame 1
  const founder1 = generateCandidate(state, 'researcher');
  founder1.name = 'Ada Chen';
  founder1.skill = 4;
  founder1.x = 17.5;
  founder1.z = 17.9;
  founder1.targetX = 17.5;
  founder1.targetZ = 17.9;
  founder1.activity = 'working';
  founder1.activityTimer = 4.5;

  const founder2 = generateCandidate(state, 'ml_engineer');
  founder2.name = 'Kenji Sato';
  founder2.skill = 3;
  founder2.x = 19.5;
  founder2.z = 18.4;
  founder2.targetX = 21.5;
  founder2.targetZ = 17.2;
  founder2.activity = 'walking_to_server';

  state.staff.push(founder1, founder2);
  populateCandidates(state);

  return state;
}

/**
 * Versioned migration supporting legacy v1 (18x18) -> v2 (28x28 multi-building campus).
 */
export function migrateSave(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<GameState>;
  if (typeof obj.version !== 'number') return null;

  const base = createInitialState(Date.now(), obj.labName);
  const tier = Math.max(0, Math.min(3, obj.buildingTier ?? 0)) as BuildingTier;
  const rawW = obj.gridWidth ?? 18;
  const rawH = obj.gridHeight ?? 18;

  let floors = Array.isArray(obj.floors) ? [...obj.floors] : [];
  let items = Array.isArray(obj.items) ? obj.items.map((it) => ({ ...it })) : [];
  let staff = Array.isArray(obj.staff) ? obj.staff.map((st) => ({ ...st })) : [];

  // Seamlessly migrate legacy 18x18 (v1) or 28x28 (v2) plots centered inside the 40x40 mega-campus!
  const migratedFromSmaller =
    (rawW === 18 && rawH === 18 && floors.length === 18 * 18) ||
    (rawW === 28 && rawH === 28 && floors.length === 28 * 28);
  if (migratedFromSmaller) {
    const newW = BALANCE.gridWidth;
    const newH = BALANCE.gridHeight;
    const dx = Math.floor((newW - rawW) / 2); // +11 for 18x18, +6 for 28x28
    const dz = rawW === 28 ? 4 : Math.floor((newH - rawH) / 2); // +11 for 18x18, +4 for 28x28
    const expandedFloors: FloorType[] = new Array<FloorType>(newW * newH).fill('grass');
    for (let z = 0; z < rawH; z++) {
      for (let x = 0; x < rawW; x++) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx >= 0 && nx < newW && nz >= 0 && nz < newH) {
          expandedFloors[floorIndex(nx, nz, newW)] = floors[floorIndex(x, z, rawW)];
        }
      }
    }
    floors = expandedFloors;
    items = items.map((it) => ({
      ...it,
      gx: Math.max(0, Math.min(newW - 1, it.gx + dx)),
      gz: Math.max(0, Math.min(newH - 1, it.gz + dz)),
    }));
    staff = staff.map((st) => ({
      ...st,
      x: Math.max(0.5, Math.min(newW - 0.5, st.x + dx)),
      z: Math.max(0.5, Math.min(newH - 0.5, st.z + dz)),
      targetX: Math.max(0.5, Math.min(newW - 0.5, st.targetX + dx)),
      targetZ: Math.max(0.5, Math.min(newH - 0.5, st.targetZ + dz)),
    }));
  }

  if (floors.length !== BALANCE.gridWidth * BALANCE.gridHeight) {
    return null;
  }

  const defaultOwned: LandParcelId[] = [];
  if (tier >= 1) defaultOwned.push('east_datacenter');
  if (tier >= 2) defaultOwned.push('north_research');
  if (tier >= 3) defaultOwned.push('west_annex');

  const resolvedOwned = Array.isArray(obj.ownedLandIds) ? obj.ownedLandIds : defaultOwned;
  const resolvedStories: Record<string, number> = {
    main_hq: 1,
    ...(obj.buildingStories ?? {}),
  };
  for (const id of resolvedOwned) {
    if (!resolvedStories[id]) resolvedStories[id] = 1;
  }

  const migrated: GameState = {
    ...base,
    ...obj,
    version: SAVE_VERSION,
    labName: sanitizeLabName(obj.labName),
    buildingTier: tier,
    ownedLandIds: resolvedOwned,
    buildingStories: resolvedStories,
    gridWidth: BALANCE.gridWidth,
    gridHeight: BALANCE.gridHeight,
    floors,
    items,
    staff,
    automation: {
      ...base.automation,
      ...(obj.automation ?? {}),
      autoFurnish: obj.automation?.autoFurnish ?? true,
    },
    settings: {
      ...base.settings,
      ...(obj.settings ?? {}),
      pixelScale:
        obj.buildingTier === undefined || (obj.settings?.pixelScale as number) === 4
          ? 1
          : (Math.min(3, Math.max(1, obj.settings?.pixelScale ?? 1)) as 1 | 2 | 3),
      paletteQuantize:
        obj.buildingTier === undefined ? false : Boolean(obj.settings?.paletteQuantize),
    },
  };

  // Repaint building floor zones cleanly when migrating from smaller grids
  if (migratedFromSmaller || (!Array.isArray(obj.ownedLandIds) && defaultOwned.length > 0)) {
    applyTierFloorPlan(migrated, tier);
  }

  // Clean out legacy starter perimeter wall_glass items from very old v1 saves
  if (obj.buildingTier === undefined && Array.isArray(migrated.items)) {
    migrated.items = migrated.items.filter((it) => it.itemId !== 'wall_glass');
  }

  return migrated;
}

export function serializeSave(state: GameState, nowMs: number = Date.now()): string {
  const payload: GameState = {
    ...state,
    lastSavedAtMs: nowMs,
  };
  return JSON.stringify(payload);
}

export function deserializeSave(json: string): GameState | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    return migrateSave(parsed);
  } catch {
    return null;
  }
}

export function saveGameToSlot(slotId: SaveSlotId, state: GameState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVE_SLOT_KEYS[slotId], serializeSave(state, Date.now()));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

export function loadGameFromSlot(slotId: SaveSlotId): GameState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVE_SLOT_KEYS[slotId]);
    if (!raw) return null;
    return deserializeSave(raw);
  } catch {
    return null;
  }
}

export function deleteGameSlot(slotId: SaveSlotId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SAVE_SLOT_KEYS[slotId]);
  } catch {
    // Ignore errors
  }
}

export function listSaveSlots(): SaveSlotSummary[] {
  const ids: SaveSlotId[] = ['autosave', 'slot_1', 'slot_2', 'slot_3'];
  return ids.map((slotId) => {
    const loaded = loadGameFromSlot(slotId);
    if (!loaded) {
      return {
        slotId,
        label: SAVE_SLOT_LABELS[slotId],
        exists: false,
      };
    }
    return {
      slotId,
      label: SAVE_SLOT_LABELS[slotId],
      exists: true,
      labName: loaded.labName,
      year: loaded.year,
      eraIndex: loaded.eraIndex,
      cash: loaded.cash,
      buildingCount: 1 + (loaded.ownedLandIds?.length ?? 0),
      savedAtMs: loaded.lastSavedAtMs,
    };
  });
}
