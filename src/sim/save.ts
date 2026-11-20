/**
 * Initial 2010 Garage Startup factory, versioned localStorage serialization,
 * and schema migration stub.
 * Zero React or Three.js imports.
 */

import { BALANCE } from '../data/balance';
import type { FloorType } from '../data/items';
import { RIVAL_TEMPLATES } from '../data/rivals';
import { floorIndex } from './grid';
import { generateCandidate, populateCandidates } from './staffSim';
import { allocUid, type GameState } from './types';

export const SAVE_STORAGE_KEY = 'project_labs_save_v1';
export const SAVE_VERSION = 1;

export function createInitialState(nowMs: number = Date.now()): GameState {
  const w = BALANCE.gridWidth;
  const h = BALANCE.gridHeight;
  const floors: FloorType[] = new Array<FloorType>(w * h).fill('grass');

  // Carve an inviting 10x9 starting garage + server nook in the center of the 18x18 plot
  for (let z = 4; z <= 12; z++) {
    for (let x = 4; x <= 13; x++) {
      let f: FloorType = 'garage';
      if (x >= 10 && z <= 7) f = 'server';
      else if (x <= 6 && z >= 10) f = 'lounge';
      else if (x >= 7 && x <= 9 && z >= 5 && z <= 9) f = 'lab';
      floors[floorIndex(x, z, w)] = f;
    }
  }

  const state: GameState = {
    version: SAVE_VERSION,
    labName: 'Garage Tensor Works',
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
        text: 'Welcome to 2010! Train your first ConvNet, upgrade your HQ, or hire researchers (Auto-Furnish is ON).',
        tone: 'good',
        day: 0,
      },
    ],

    cheatPerfectModels: false,
    cheatFreeBuild: false,

    lastCompletedModelId: null,
    lastSavedAtMs: nowMs,
  };

  // Seed a clean, airy, well-spaced starter 2010 garage AI lab!
  // Architectural perimeter walls are now rendered dynamically with camera-aware cutaway in LabScene.ts.
  const starterProps: Array<{ itemId: string; gx: number; gz: number; rot: 0 | 1 | 2 | 3 }> = [
    // Research workstations with clean walking aisles
    { itemId: 'desk_basic', gx: 5, gz: 6, rot: 0 },
    { itemId: 'desk_basic', gx: 7, gz: 6, rot: 0 },
    { itemId: 'desk_basic', gx: 5, gz: 8, rot: 0 },
    { itemId: 'whiteboard', gx: 6, gz: 4, rot: 0 },
    { itemId: 'bookshelf_posters', gx: 4, gz: 5, rot: 1 },

    // Starter GPU corner + cooling + power
    { itemId: 'gpu_rig_2010', gx: 11, gz: 5, rot: 0 },
    { itemId: 'gpu_rig_2010', gx: 12, gz: 5, rot: 0 },
    { itemId: 'server_rack', gx: 12, gz: 7, rot: 0 },
    { itemId: 'ac_unit', gx: 10, gz: 4, rot: 0 },
    { itemId: 'power_gen', gx: 14, gz: 5, rot: 0 },

    // Cozy lounge corner
    { itemId: 'coffee_machine', gx: 4, gz: 10, rot: 0 },
    { itemId: 'potted_plant', gx: 4, gz: 12, rot: 0 },
    { itemId: 'potted_plant', gx: 12, gz: 11, rot: 0 },
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
  founder1.x = 5.5;
  founder1.z = 6.9;
  founder1.targetX = 5.5;
  founder1.targetZ = 6.9;
  founder1.activity = 'working';
  founder1.activityTimer = 4.5;

  const founder2 = generateCandidate(state, 'ml_engineer');
  founder2.name = 'Kenji Sato';
  founder2.skill = 3;
  founder2.x = 7.5;
  founder2.z = 7.4;
  founder2.targetX = 11.5;
  founder2.targetZ = 6.2;
  founder2.activity = 'walking_to_server';

  state.staff.push(founder1, founder2);
  populateCandidates(state);

  return state;
}

/**
 * Versioned migration stub for future schema updates (e.g., v1 -> v2 era packs).
 */
export function migrateSave(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<GameState>;
  if (typeof obj.version !== 'number') return null;

  // Baseline merge with defaults so added fields never crash older saves
  const base = createInitialState();
  const migrated: GameState = {
    ...base,
    ...obj,
    version: SAVE_VERSION,
    buildingTier: (obj.buildingTier ?? 0) as 0 | 1 | 2 | 3,
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

  if (
    !Array.isArray(migrated.floors) ||
    migrated.floors.length !== migrated.gridWidth * migrated.gridHeight
  ) {
    return null;
  }

  // Clean out legacy starter perimeter wall_glass items at (x=4 or z=4) so the new
  // dynamic architectural cutaway walls shine cleanly even on loaded old saves!
  if (obj.buildingTier === undefined && Array.isArray(migrated.items)) {
    migrated.items = migrated.items.filter(
      (it) => !(it.itemId === 'wall_glass' && (it.gx === 4 || it.gz === 4)),
    );
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
