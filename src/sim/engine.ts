/**
 * Master fixed-timestep deterministic simulation engine.
 * Zero React or Three.js imports.
 */

import { BALANCE } from '../data/balance';
import { GAME_EVENTS } from '../data/events';
import { RIVAL_TEMPLATES } from '../data/rivals';
import { ERAS } from '../data/techs';
import { computeResources } from './economy';
import { countDeskSlots, hireCandidate, stepStaffSimulation } from './staffSim';
import { getUnlockedArchitectures, startTrainingJob, stepTrainingJobs } from './training';
import {
  nextRand,
  pushNotification,
  type GameState,
  type OfflineProgressSummary,
} from './types';

function updateCalendarAndEra(state: GameState): void {
  const wholeDays = Math.floor(state.totalDays);
  const daysPerYear = BALANCE.daysPerMonth * BALANCE.monthsPerYear;
  const yearOffset = Math.floor(wholeDays / daysPerYear);
  const dayInYear = wholeDays % daysPerYear;
  const monthIdx = Math.floor(dayInYear / BALANCE.daysPerMonth);
  const dayOfMonth = (dayInYear % BALANCE.daysPerMonth) + 1;

  state.year = BALANCE.startYear + yearOffset;
  state.month = monthIdx + 1;
  state.dayOfMonth = dayOfMonth;

  // Visual day/night cycle
  state.timeOfDay =
    ((state.totalDays % BALANCE.daysPerVisualCycle) / BALANCE.daysPerVisualCycle + 0.35) % 1;

  // Advance era based on current year
  let newEra = state.eraIndex;
  for (const era of ERAS) {
    if (state.year >= era.startYear && era.index > newEra) {
      newEra = era.index;
    }
  }
  if (newEra > state.eraIndex) {
    state.eraIndex = newEra;
    const eraDef = ERAS[newEra];
    pushNotification(
      state,
      `New Era Unlocked (${eraDef.startYear}): ${eraDef.name}!`,
      'good',
    );
  }
}

function updateRivals(state: GameState): void {
  const yearsElapsed = state.totalDays / (BALANCE.daysPerMonth * BALANCE.monthsPerYear);
  const era = ERAS[Math.min(state.eraIndex, ERAS.length - 1)];

  for (let i = 0; i < state.rivals.length; i++) {
    const r = state.rivals[i];
    const tmpl = RIVAL_TEMPLATES.find((t) => t.id === r.id);
    if (!tmpl) continue;

    const targetBench = Math.min(
      99,
      Math.round(tmpl.startBenchmark + yearsElapsed * tmpl.growthPerYear),
    );
    r.topBenchmark = Math.min(era.benchmarkCeiling + 5, targetBench);
    r.valuation = Math.round(
      tmpl.startValuation * Math.pow(1.48, yearsElapsed),
    );
    r.modelsShipped = Math.max(1, Math.floor(1 + yearsElapsed * 1.1));
    const gen = Math.max(1, Math.floor(1 + yearsElapsed * 0.7));
    r.flagshipModel = `${tmpl.flagshipPrefix}-${gen}.0`;
  }
}

function updateProducts(state: GameState, gameDaysDelta: number): void {
  let productStaffBonus = 0;
  for (const s of state.staff) {
    if (s.role === 'product') productStaffBonus += s.skill * 0.015;
  }

  for (const p of state.products) {
    const monthsDelta = gameDaysDelta / BALANCE.daysPerMonth;
    // Slight organic growth from hype & product team, counterbalanced by tech obsolescence decay
    const growth = (state.hype * 0.0018 + productStaffBonus) * monthsDelta;
    const decay = BALANCE.productDecayPerMonth * monthsDelta;
    p.decayFactor = Math.max(0.45, Math.min(2.4, p.decayFactor + growth - decay));

    const targetUsers = Math.max(
      40,
      Math.round(p.users * (1 + (growth - decay * 0.5))),
    );
    p.users = targetUsers;
    p.revenuePerDay =
      p.users * BALANCE.baseRevenuePerUserPerDay * (0.7 + p.quality / 60) * p.decayFactor;
  }
}

function runAutomation(state: GameState, res: ReturnType<typeof computeResources>): void {

  // Auto-buy grid power contracts if underpowered
  if (
    state.automation.autoBuyPower &&
    res.isUnderpowered &&
    state.cash >= BALANCE.autoPowerCostPerUnit
  ) {
    state.cash -= BALANCE.autoPowerCostPerUnit;
    state.extraGridPowerContracts += 1;
    pushNotification(
      state,
      'Smart Grid expanded power capacity (+20kW).',
      'info',
    );
  }

  // Auto-queue training if idle
  if (
    state.automation.autoQueueTraining &&
    state.trainingJobs.length === 0
  ) {
    const archs = getUnlockedArchitectures(state);
    const chosenArch =
      archs.find((a) => a.id === state.automation.lastArchId) ??
      archs[archs.length - 1];
    const chosenDataset =
      state.ownedDatasets.includes(state.automation.lastDatasetId)
        ? state.automation.lastDatasetId
        : state.ownedDatasets[state.ownedDatasets.length - 1];

    if (chosenArch && chosenDataset && res.computeAvailable >= chosenArch.computeReq) {
      startTrainingJob(state, chosenArch.id, chosenDataset, res.computeAvailable);
    }
  }

  // Auto-hire if desks open and plenty of cash cushion
  if (state.automation.autoHireStaff) {
    const slots = countDeskSlots(state);
    if (state.staff.length < slots && state.candidates.length > 0) {
      const affordable = state.candidates.find((c) => state.cash >= c.hireFee * 3.5);
      if (affordable) {
        hireCandidate(state, affordable.id);
      }
    }
  }
}

function maybeTriggerEvent(state: GameState, gameDaysDelta: number): void {
  if (state.activeEvent) return;
  if (state.totalDays - state.lastEventDay < BALANCE.minDaysBetweenEvents) return;

  const [nextSeed, r] = nextRand(state.rngSeed);
  state.rngSeed = nextSeed;

  if (r < BALANCE.eventTriggerChancePerDay * gameDaysDelta) {
    const eligible = GAME_EVENTS.filter(
      (e) => e.minEra === undefined || state.eraIndex >= e.minEra,
    );
    if (eligible.length === 0) return;
    const [nextSeed2, r2] = nextRand(state.rngSeed);
    state.rngSeed = nextSeed2;
    const picked = eligible[Math.floor(r2 * eligible.length) % eligible.length];
    state.activeEvent = {
      eventId: picked.id,
      triggeredDay: Math.floor(state.totalDays),
    };
    state.lastEventDay = Math.floor(state.totalDays);
    pushNotification(state, `Event: ${picked.title}`, 'alert');
  }
}

export function resolveActiveEvent(
  state: GameState,
  choiceId: string,
): { ok: boolean; outcomeText?: string } {
  if (!state.activeEvent) return { ok: false };
  const def = GAME_EVENTS.find((e) => e.id === state.activeEvent!.eventId);
  if (!def) {
    state.activeEvent = null;
    return { ok: false };
  }
  const choice = def.choices.find((c) => c.id === choiceId) ?? def.choices[0];
  const eff = choice.effect;

  if (eff.cashDelta) state.cash = Math.max(0, state.cash + eff.cashDelta);
  if (eff.repDelta) state.reputation = Math.max(0, Math.min(100, state.reputation + eff.repDelta));
  if (eff.hypeDelta) state.hype = Math.max(0, Math.min(100, state.hype + eff.hypeDelta));
  if (eff.safetyDelta) state.safety = Math.max(0, Math.min(100, state.safety + eff.safetyDelta));
  if (eff.moodDelta) {
    for (const s of state.staff) {
      s.mood = Math.max(10, Math.min(100, s.mood + eff.moodDelta));
    }
  }
  if (eff.tempComputePenaltyDays) {
    state.computePenaltyUntilDay = state.totalDays + eff.tempComputePenaltyDays;
  }
  if (eff.tempPowerPenaltyDays) {
    state.powerPenaltyUntilDay = state.totalDays + eff.tempPowerPenaltyDays;
  }

  state.activeEvent = null;
  pushNotification(state, `${def.title}: ${choice.label}`, 'info');
  return { ok: true, outcomeText: choice.outcomeText };
}

export function triggerRandomEventNow(state: GameState): void {
  const [nextSeed, r] = nextRand(state.rngSeed);
  state.rngSeed = nextSeed;
  const picked = GAME_EVENTS[Math.floor(r * GAME_EVENTS.length) % GAME_EVENTS.length];
  state.activeEvent = {
    eventId: picked.id,
    triggeredDay: Math.floor(state.totalDays),
  };
  state.lastEventDay = Math.floor(state.totalDays);
}

/**
 * Deterministic fixed-timestep simulation step.
 * `dtRealSeconds` is clamped by caller (<= 0.1s) and scaled by `state.speed`.
 */
export function stepSimulation(
  state: GameState,
  dtRealSeconds: number,
  options?: { allowEvents?: boolean; ignoreSpeed?: boolean },
): { completedModels: number } {
  const speed = options?.ignoreSpeed ? 1 : state.speed;
  if (speed === 0 || dtRealSeconds <= 0) {
    return { completedModels: 0 };
  }

  const effectiveRealSec = dtRealSeconds * speed;
  const gameDaysDelta = effectiveRealSec / BALANCE.realSecondsPerGameDay;

  state.totalDays += gameDaysDelta;
  updateCalendarAndEra(state);

  const res = computeResources(state);

  // Cashflow update
  state.cash = Math.max(0, state.cash + res.netPerDay * gameDaysDelta);

  // Overheat safety drift
  if (res.isOverheated) {
    state.safety = Math.max(
      10,
      state.safety - BALANCE.overheatSafetyDrainPerDay * gameDaysDelta,
    );
  }

  // Staff movement & needs
  stepStaffSimulation(state, effectiveRealSec, gameDaysDelta, res.passiveMoodBonus);

  // Products & rivals
  updateProducts(state, gameDaysDelta);
  updateRivals(state);

  // Training progress
  const completed = stepTrainingJobs(
    state,
    gameDaysDelta,
    res.computeThrottle,
    res.researchBonusPct,
  );

  // Automation
  runAutomation(state, res);

  // Dynamic valuation floor
  const impliedVal = Math.round(
    state.cash * 2.5 +
      res.revenuePerDay * 320 +
      state.reputation * 6_000 +
      res.computeTotal * 450,
  );
  if (impliedVal > state.valuation) {
    state.valuation = impliedVal;
  }

  // Random events (paused when an event modal is already open)
  if (options?.allowEvents !== false) {
    maybeTriggerEvent(state, gameDaysDelta);
  }

  return { completedModels: completed.length };
}

/**
 * Computes capped offline idle progress since last save timestamp.
 */
export function calculateOfflineProgress(
  state: GameState,
  elapsedRealSeconds: number,
): OfflineProgressSummary {
  const clampedSec = Math.max(0, Math.min(BALANCE.offlineCapSeconds, elapsedRealSeconds));
  const effectiveSec = clampedSec * BALANCE.offlineEfficiency;

  const cashBefore = state.cash;
  const daysBefore = state.totalDays;
  let modelsCompleted = 0;

  // Chunk into coarse deterministic steps (max 600 steps) to keep catch-up instant & accurate
  const chunkSec = Math.max(2, effectiveSec / 300);
  let remaining = effectiveSec;
  while (remaining > 0.001) {
    const step = Math.min(chunkSec, remaining);
    const { completedModels } = stepSimulation(state, step, {
      allowEvents: false,
      ignoreSpeed: true,
    });
    modelsCompleted += completedModels;
    remaining -= step;
  }

  return {
    elapsedRealSeconds: Math.round(clampedSec),
    simulatedGameDays: Math.round((state.totalDays - daysBefore) * 10) / 10,
    cashEarned: Math.round(state.cash - cashBefore),
    modelsCompleted,
  };
}
