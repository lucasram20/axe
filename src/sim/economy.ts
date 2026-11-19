/**
 * Pure resource, power/cooling, economy, tech-tree, and funding calculations.
 * Zero React or Three.js imports.
 */

import { BALANCE } from '../data/balance';
import { FUNDING_ROUNDS } from '../data/funding';
import { CATALOG_BY_ID } from '../data/items';
import { STAFF_TRAIT_BY_ID } from '../data/staff';
import { TECH_BY_ID } from '../data/techs';
import { pushNotification, type GameState, type ResourceSnapshot } from './types';

export function computeResources(state: GameState): ResourceSnapshot {
  let computeRaw = state.bonusCompute;
  let powerSupply =
    BALANCE.baseGridPowerCapacity + state.extraGridPowerContracts * 20;
  let powerDemand = 0;
  let coolingSupply = BALANCE.baseCoolingCapacity;
  let heatLoad = 0;
  let deskSlots = 0;
  let researchBonusPct = 0;
  let passiveMoodBonus = 0;
  let upkeepPerDay = 0;

  // Floor bonuses
  for (const f of state.floors) {
    if (f === 'lab') {
      researchBonusPct += 0.5;
      upkeepPerDay += 1;
    } else if (f === 'server') {
      coolingSupply += 1.5;
      upkeepPerDay += 2;
    } else if (f === 'lounge') {
      passiveMoodBonus += 0.8;
      upkeepPerDay += 1;
    }
  }

  // Placed items
  for (const placed of state.items) {
    const def = CATALOG_BY_ID[placed.itemId];
    if (!def) continue;
    if (def.compute) computeRaw += def.compute;
    if (def.powerDraw) powerDemand += def.powerDraw;
    if (def.powerGen) powerSupply += def.powerGen;
    if (def.coolingGen) coolingSupply += def.coolingGen;
    if (def.heatGen) heatLoad += def.heatGen;
    if (def.deskSlots) deskSlots += def.deskSlots;
    if (def.researchBonus) researchBonusPct += def.researchBonus;
    if (def.moodBonus) passiveMoodBonus += def.moodBonus;
    upkeepPerDay += def.upkeepPerDay;
  }

  // Tech bonuses
  let computeEffBonus = 0;
  let revenueTechBonus = 0;
  for (const techId of state.unlockedTechs) {
    const tech = TECH_BY_ID[techId];
    if (!tech) continue;
    if (tech.computeEfficiencyBonus) computeEffBonus += tech.computeEfficiencyBonus;
    if (tech.revenueBonus) revenueTechBonus += tech.revenueBonus;
  }

  // Staff multipliers
  let infraCoolingBonus = 0;
  let infraComputeBonus = 0;
  let salesRevenueBonus = 0;
  let payrollPerDay = 0;
  for (const s of state.staff) {
    payrollPerDay += s.salaryPerDay;
    const moodFactor = 0.65 + (s.mood / 100) * 0.45;
    const trait = STAFF_TRAIT_BY_ID[s.traitId];
    if (s.role === 'infra_devops') {
      infraCoolingBonus += s.skill * 2.2 * moodFactor;
      infraComputeBonus += s.skill * 0.025 * moodFactor;
    }
    if (s.role === 'sales') {
      salesRevenueBonus += s.skill * 0.045 * moodFactor;
    }
    if (s.role === 'product') {
      salesRevenueBonus += s.skill * 0.02 * moodFactor;
    }
    if (trait?.revenueMult) {
      salesRevenueBonus += trait.revenueMult - 1;
    }
  }

  coolingSupply += infraCoolingBonus;

  // Temporary event penalties
  if (state.totalDays < state.powerPenaltyUntilDay) {
    powerSupply *= 0.72;
  }

  const isUnderpowered = powerDemand > powerSupply + 0.01;
  const isOverheated = heatLoad > coolingSupply + 0.01;

  let computeThrottle = 1.0;
  if (isUnderpowered) computeThrottle *= BALANCE.underpowerSpeedPenalty;
  if (isOverheated) computeThrottle *= BALANCE.overheatSpeedPenalty;
  if (state.totalDays < state.computePenaltyUntilDay) computeThrottle *= 0.75;

  const computeTotal = Math.round(
    computeRaw * (1 + computeEffBonus + infraComputeBonus) * computeThrottle,
  );
  const computeUsed = state.trainingJobs.reduce(
    (sum, job) => sum + job.computeAllocated,
    0,
  );
  const computeAvailable = Math.max(0, computeTotal - computeUsed);

  const rawProductRevenue = state.products.reduce(
    (sum, p) => sum + p.revenuePerDay,
    0,
  );
  const revenuePerDay =
    rawProductRevenue * (1 + revenueTechBonus + salesRevenueBonus);

  const powerBillPerDay = powerDemand * BALANCE.basePowerCostPerKwPerDay;
  const netPerDay = revenuePerDay - (upkeepPerDay + payrollPerDay + powerBillPerDay);
  const netPerSecond = netPerDay / BALANCE.realSecondsPerGameDay;

  return {
    computeTotal,
    computeUsed,
    computeAvailable,
    powerSupply: Math.round(powerSupply),
    powerDemand: Math.round(powerDemand),
    coolingSupply: Math.round(coolingSupply),
    heatLoad: Math.round(heatLoad),
    deskSlots,
    researchBonusPct: Math.round(researchBonusPct * 10) / 10,
    passiveMoodBonus: Math.round(passiveMoodBonus * 10) / 10,
    revenuePerDay,
    upkeepPerDay,
    payrollPerDay,
    powerBillPerDay,
    netPerDay,
    netPerSecond,
    computeThrottle,
    isUnderpowered,
    isOverheated,
  };
}

export function canUnlockTech(
  state: GameState,
  techId: string,
): { ok: boolean; reason?: string } {
  const tech = TECH_BY_ID[techId];
  if (!tech) return { ok: false, reason: 'Unknown tech' };
  if (state.unlockedTechs.includes(techId)) {
    return { ok: false, reason: 'Already researched' };
  }
  if (state.eraIndex < tech.eraIndex) {
    return { ok: false, reason: 'Reach required Era first' };
  }
  if (tech.requires) {
    for (const req of tech.requires) {
      if (!state.unlockedTechs.includes(req)) {
        const reqName = TECH_BY_ID[req]?.name ?? req;
        return { ok: false, reason: `Requires ${reqName}` };
      }
    }
  }
  if (state.cash < tech.costCash) {
    return { ok: false, reason: 'Insufficient cash' };
  }
  if (state.reputation < tech.costRep) {
    return { ok: false, reason: `Requires ${tech.costRep} Reputation` };
  }
  return { ok: true };
}

export function unlockTech(
  state: GameState,
  techId: string,
): { ok: boolean; reason?: string } {
  const check = canUnlockTech(state, techId);
  if (!check.ok) return check;

  const tech = TECH_BY_ID[techId]!;
  state.cash -= tech.costCash;
  state.unlockedTechs.push(techId);
  if (tech.safetyBonus) {
    state.safety = Math.min(100, state.safety + tech.safetyBonus);
  }
  if (tech.unlocksAutomation) {
    state.automation[tech.unlocksAutomation] = true;
  }
  state.reputation = Math.min(100, state.reputation + 2);
  pushNotification(state, `Researched ${tech.name}!`, 'good');
  return { ok: true };
}

export function getTopBenchmark(state: GameState): number {
  if (state.models.length === 0) return 0;
  return state.models.reduce((max, m) => Math.max(max, m.benchmarks.overall), 0);
}

export function canRaiseFundingRound(
  state: GameState,
  roundId: string,
): { ok: boolean; reason?: string } {
  const round = FUNDING_ROUNDS.find((r) => r.id === roundId);
  if (!round) return { ok: false, reason: 'Unknown round' };
  if (state.completedFundingIds.includes(roundId)) {
    return { ok: false, reason: 'Already raised' };
  }
  const topBench = getTopBenchmark(state);
  if (state.reputation < round.minRep) {
    return { ok: false, reason: `Need ${round.minRep} Rep` };
  }
  if (topBench < round.minTopBenchmark) {
    return { ok: false, reason: `Need ${round.minTopBenchmark}+ Benchmark` };
  }
  if (state.products.length < round.minModelsShipped) {
    return { ok: false, reason: `Ship ${round.minModelsShipped} product(s)` };
  }
  return { ok: true };
}

export function raiseFundingRound(
  state: GameState,
  roundId: string,
): { ok: boolean; reason?: string } {
  const check = canRaiseFundingRound(state, roundId);
  if (!check.ok) return check;
  const round = FUNDING_ROUNDS.find((r) => r.id === roundId)!;

  state.cash += round.cashAward;
  state.founderEquityPct = Math.max(
    10,
    Math.round((state.founderEquityPct * (1 - round.equityDilutionPct / 100)) * 10) / 10,
  );
  state.valuation = Math.max(state.valuation, round.valuationPostMoney);
  state.hype = Math.min(100, state.hype + 12);
  state.completedFundingIds.push(roundId);
  pushNotification(
    state,
    `Closed ${round.name}: +$${round.cashAward.toLocaleString()}!`,
    'good',
  );
  return { ok: true };
}
