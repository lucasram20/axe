/**
 * Pure simulation state types and deterministic PRNG.
 * Zero React or Three.js imports.
 */

import type { FloorType } from '../data/items';
import type { StaffRole } from '../data/staff';

export type RotationQuarter = 0 | 1 | 2 | 3;

export interface PlacedItem {
  uid: string;
  itemId: string;
  gx: number;
  gz: number;
  rotation: RotationQuarter;
  placedAtDay: number;
}

export type StaffActivity =
  | 'working'
  | 'walking_to_desk'
  | 'walking_to_coffee'
  | 'drinking_coffee'
  | 'walking_to_server'
  | 'inspecting_server'
  | 'brainstorming'
  | 'wandering';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  skill: number; // 1 - 10
  salaryPerDay: number;
  hireFee: number;
  traitId: string;
  mood: number; // 0 - 100
  energy: number; // 0 - 100
  hairColor: string;
  skinTone: string;
  // Spatial coordinates in grid tile units (0..gridWidth, 0..gridHeight)
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  facingAngle: number;
  walkPhase: number;
  activity: StaffActivity;
  activityTimer: number;
  assignedDeskUid: string | null;
}

export interface TrainingJob {
  id: string;
  modelName: string;
  archId: string;
  archName: string;
  category: 'vision' | 'language' | 'multimodal' | 'agent';
  datasetId: string;
  computeAllocated: number;
  progress: number; // 0..1
  totalDaysRequired: number;
  elapsedDays: number;
  startedDay: number;
}

export interface BenchmarkScores {
  overall: number;
  reasoning: number;
  coding: number;
  multimodal: number;
  safety: number;
}

export interface TrainedModel {
  id: string;
  name: string;
  archId: string;
  archName: string;
  category: 'vision' | 'language' | 'multimodal' | 'agent';
  datasetId: string;
  completedDay: number;
  completedYear: number;
  benchmarks: BenchmarkScores;
  shipped: boolean;
}

export interface ShippedProduct {
  id: string;
  modelId: string;
  name: string;
  category: 'vision' | 'language' | 'multimodal' | 'agent';
  quality: number;
  users: number;
  revenuePerDay: number;
  launchedDay: number;
  decayFactor: number;
}

export interface RivalLabState {
  id: string;
  name: string;
  motto: string;
  color: string;
  topBenchmark: number;
  valuation: number;
  modelsShipped: number;
  flagshipModel: string;
}

export interface ActiveEventState {
  eventId: string;
  triggeredDay: number;
}

export interface NotificationItem {
  id: string;
  text: string;
  tone: 'info' | 'good' | 'warn' | 'alert';
  day: number;
}

export interface AutomationState {
  autoQueueTraining: boolean;
  autoBuyPower: boolean;
  autoHireStaff: boolean;
  autoFurnish: boolean;
  lastArchId: string;
  lastDatasetId: string;
}

export interface QualitySettings {
  pixelScale: 1 | 2 | 3;
  outlines: boolean;
  shadows: boolean;
  paletteQuantize: boolean;
  edgeScroll: boolean;
  muted: boolean;
}

export interface ResourceSnapshot {
  computeTotal: number;
  computeUsed: number;
  computeAvailable: number;
  powerSupply: number;
  powerDemand: number;
  coolingSupply: number;
  heatLoad: number;
  deskSlots: number;
  researchBonusPct: number;
  passiveMoodBonus: number;
  revenuePerDay: number;
  upkeepPerDay: number;
  payrollPerDay: number;
  powerBillPerDay: number;
  netPerDay: number;
  netPerSecond: number;
  computeThrottle: number; // 0..1 multiplier from power/heat/events
  isUnderpowered: boolean;
  isOverheated: boolean;
}

export type BuildingTier = 0 | 1 | 2 | 3;

export type LandParcelId =
  | 'east_datacenter'
  | 'north_research'
  | 'west_annex'
  | 'ne_superpod'
  | 'nw_innovation';

export interface GameState {
  version: number;
  labName: string;
  rngSeed: number;
  nextUid: number;

  // Time & calendar
  totalDays: number; // Continuous fractional game days since Jan 1, 2010
  year: number;
  month: number;
  dayOfMonth: number;
  eraIndex: number;
  timeOfDay: number; // 0..1 (0.0 midnight, 0.25 dawn, 0.5 noon, 0.75 sunset)
  speed: 0 | 1 | 2 | 4;

  // Core finances & metrics
  cash: number;
  reputation: number; // 0..100+
  hype: number; // 0..100+
  safety: number; // 0..100
  founderEquityPct: number;
  valuation: number;
  bonusCompute: number; // Debug or special grant compute
  extraGridPowerContracts: number; // Purchased via Auto-Buy Power

  // Spatial world, HQ building tier & owned expansion land parcels
  buildingTier: BuildingTier;
  ownedLandIds: LandParcelId[];
  gridWidth: number;
  gridHeight: number;
  floors: FloorType[]; // length = gridWidth * gridHeight
  items: PlacedItem[];

  // Staff
  staff: StaffMember[];
  candidates: StaffMember[];

  // Progression & content
  unlockedTechs: string[];
  ownedDatasets: string[];
  completedFundingIds: string[];

  // Training & products
  trainingJobs: TrainingJob[];
  models: TrainedModel[];
  products: ShippedProduct[];
  modelCounter: number;

  // Rivals & events
  rivals: RivalLabState[];
  activeEvent: ActiveEventState | null;
  lastEventDay: number;
  computePenaltyUntilDay: number;
  powerPenaltyUntilDay: number;

  // Automation & UX
  automation: AutomationState;
  settings: QualitySettings;
  notifications: NotificationItem[];

  // Founder Vault live overrides stored cleanly in sim state
  cheatPerfectModels?: boolean;
  cheatFreeBuild?: boolean;

  // Pending modals emitted by sim
  lastCompletedModelId: string | null;

  // Persistence timestamp
  lastSavedAtMs: number;
}

export interface OfflineProgressSummary {
  elapsedRealSeconds: number;
  simulatedGameDays: number;
  cashEarned: number;
  modelsCompleted: number;
}

/**
 * Deterministic LCG step returning [nextSeed, float in 0..1).
 */
export function nextRand(seed: number): [number, number] {
  const next = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return [next, next / 4294967296];
}

export function allocUid(state: GameState, prefix: string): string {
  const id = `${prefix}_${state.nextUid}`;
  state.nextUid += 1;
  return id;
}

export function pushNotification(
  state: GameState,
  text: string,
  tone: NotificationItem['tone'] = 'info',
): void {
  const id = allocUid(state, 'ntf');
  state.notifications.unshift({
    id,
    text,
    tone,
    day: Math.floor(state.totalDays),
  });
  if (state.notifications.length > 24) {
    state.notifications.length = 24;
  }
}
