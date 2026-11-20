/**
 * Single tunable economy and simulation balance config.
 * Adjust numbers here to rebalance progression, costs, and offline pacing.
 */

export const BALANCE = {
  // Grid dimensions (isometric tiles — 40x40 15-building multi-story mega-campus)
  gridWidth: 40,
  gridHeight: 40,
  maxBuildingStories: 6,
  maxStaffCap: 320,

  // Starting state (Year 2010 garage startup)
  startingCash: 48_000,
  startingReputation: 8,
  startingHype: 5,
  startingSafety: 78,
  startYear: 2010,
  startMonth: 1,
  startDay: 1,

  // Time & calendar pacing (at 1x speed)
  // 1 game day = 6 real seconds; 1 game month (30 days) = 3 minutes at 1x, 45s at 4x.
  realSecondsPerGameDay: 6,
  daysPerMonth: 30,
  monthsPerYear: 12,
  // Full day/night visual cycle = 1 game day (or 4 game days for calm transitions)
  daysPerVisualCycle: 3,

  // Economy & upkeep
  sellRefundRatio: 0.72,
  basePowerCostPerKwPerDay: 1.6,
  baseGridPowerCapacity: 12, // Free wall outlets in the garage
  baseCoolingCapacity: 10, // Natural garage ventilation
  autoPowerCostPerUnit: 2_800,
  underpowerSpeedPenalty: 0.45,
  overheatSpeedPenalty: 0.55,
  overheatSafetyDrainPerDay: 0.35,

  // Staff simulation
  maxStaffCapBase: 6, // Increased by desks
  candidatePoolSize: 5,
  candidateRefreshCost: 600,
  staffMoodDecayPerDay: 2.2,
  staffEnergyDecayPerDay: 8.5,
  coffeeRestoreEnergy: 48,
  coffeeRestoreMood: 14,
  loungeRestoreMoodPerSec: 4.5,
  deskWorkSpeedPerSkill: 0.04,

  // Training pipeline
  baseTrainingDays: 14,
  computeSpeedFactor: 0.14,
  researchBonusPerTech: 0.12,
  maxActiveTrainingJobs: 2,
  benchmarkMaxScore: 100,

  // Products & revenue
  baseRevenuePerUserPerDay: 0.48,
  productDecayPerMonth: 0.015,
  hypeToUsersMultiplier: 18,
  repToUsersMultiplier: 26,

  // Events
  minDaysBetweenEvents: 22,
  eventTriggerChancePerDay: 0.045,

  // Idle / offline progress
  offlineCapSeconds: 8 * 3600, // 8 hours max offline progress
  offlineEfficiency: 0.75, // 75% efficiency while away
  minOfflineSecondsForModal: 45,

  // Autosave interval (real seconds)
  autoSaveIntervalSec: 12,
} as const;

export type BalanceConfig = typeof BALANCE;
