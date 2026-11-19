/**
 * Pure model training pipeline, benchmark generation, dataset licensing,
 * and product/API revenue launching.
 * Zero React or Three.js imports.
 */

import { BALANCE } from '../data/balance';
import { DATASET_BY_ID } from '../data/datasets';
import { STAFF_TRAIT_BY_ID } from '../data/staff';
import { ERAS, TECH_BY_ID, TECH_NODES } from '../data/techs';
import { computeResources } from './economy';
import {
  allocUid,
  nextRand,
  pushNotification,
  type BenchmarkScores,
  type GameState,
  type TrainedModel,
} from './types';

export interface UnlockedArchitecture {
  id: string;
  name: string;
  baseQuality: number;
  computeReq: number;
  trainingDays: number;
  category: 'vision' | 'language' | 'multimodal' | 'agent';
  techId: string;
}

export function getUnlockedArchitectures(state: GameState): UnlockedArchitecture[] {
  const list: UnlockedArchitecture[] = [];
  for (const node of TECH_NODES) {
    if (node.unlocksArchitecture && state.unlockedTechs.includes(node.id)) {
      list.push({
        ...node.unlocksArchitecture,
        techId: node.id,
      });
    }
  }
  return list;
}

export function acquireDataset(
  state: GameState,
  datasetId: string,
): { ok: boolean; reason?: string } {
  const ds = DATASET_BY_ID[datasetId];
  if (!ds) return { ok: false, reason: 'Unknown dataset' };
  if (state.ownedDatasets.includes(datasetId)) {
    return { ok: false, reason: 'Already licensed' };
  }
  if (state.eraIndex < ds.unlockEra) {
    return { ok: false, reason: 'Locked until later Era' };
  }
  if (state.cash < ds.cost) {
    return { ok: false, reason: 'Insufficient funds' };
  }
  state.cash -= ds.cost;
  state.ownedDatasets.push(datasetId);
  pushNotification(state, `Licensed dataset: ${ds.name}`, 'good');
  return { ok: true };
}

export function startTrainingJob(
  state: GameState,
  archId: string,
  datasetId: string,
  computeBudget: number,
  customName?: string,
): { ok: boolean; reason?: string; jobId?: string } {
  if (state.trainingJobs.length >= BALANCE.maxActiveTrainingJobs) {
    return { ok: false, reason: `Max ${BALANCE.maxActiveTrainingJobs} concurrent runs` };
  }

  const arch = getUnlockedArchitectures(state).find((a) => a.id === archId);
  if (!arch) return { ok: false, reason: 'Architecture not unlocked' };

  if (!state.ownedDatasets.includes(datasetId)) {
    return { ok: false, reason: 'Dataset not owned' };
  }

  const res = computeResources(state);
  const clampedBudget = Math.max(arch.computeReq, Math.round(computeBudget));
  if (res.computeAvailable < arch.computeReq) {
    return {
      ok: false,
      reason: `Need at least ${arch.computeReq} free TF (have ${res.computeAvailable})`,
    };
  }
  const actualAlloc = Math.min(clampedBudget, res.computeAvailable);

  state.modelCounter += 1;
  const modelName =
    customName && customName.trim().length > 0
      ? customName.trim()
      : `${arch.name.split(' ')[0]}-${state.modelCounter}.0`;

  const jobId = allocUid(state, 'job');
  state.trainingJobs.push({
    id: jobId,
    modelName,
    archId: arch.id,
    archName: arch.name,
    category: arch.category,
    datasetId,
    computeAllocated: actualAlloc,
    progress: 0,
    totalDaysRequired: arch.trainingDays,
    elapsedDays: 0,
    startedDay: state.totalDays,
  });

  state.automation.lastArchId = arch.id;
  state.automation.lastDatasetId = datasetId;
  pushNotification(
    state,
    `Training started: ${modelName} (${actualAlloc} TF)`,
    'info',
  );
  return { ok: true, jobId };
}

function evaluateTrainedModel(
  state: GameState,
  job: GameState['trainingJobs'][number],
  researchBonusPct: number,
): TrainedModel {
  const arch = getUnlockedArchitectures(state).find((a) => a.id === job.archId);
  const ds = DATASET_BY_ID[job.datasetId];
  const era = ERAS[Math.min(state.eraIndex, ERAS.length - 1)];

  let researchStaffPower = 0;
  let dataStaffPower = 0;
  let safetyStaffBonus = 0;

  for (const s of state.staff) {
    const moodFactor = 0.7 + (s.mood / 100) * 0.35;
    const trait = STAFF_TRAIT_BY_ID[s.traitId];
    const rMult = trait?.researchMult ?? 1;
    if (s.role === 'researcher') researchStaffPower += s.skill * 1.45 * moodFactor * rMult;
    if (s.role === 'ml_engineer') researchStaffPower += s.skill * 0.75 * moodFactor * rMult;
    if (s.role === 'data_engineer') dataStaffPower += s.skill * 1.3 * moodFactor;
    if (trait?.safetyBonus) safetyStaffBonus += trait.safetyBonus;
  }

  const baseArchQuality = arch?.baseQuality ?? 25;
  const dsQuality = ds?.quality ?? 40;
  const computeRatio = arch ? Math.min(2.2, job.computeAllocated / Math.max(1, arch.computeReq)) : 1;
  const computeBoost = (computeRatio - 1) * 9;

  // Deterministic slight jitter
  const [nextSeed, r1] = nextRand(state.rngSeed);
  const [nextSeed2, r2] = nextRand(nextSeed);
  state.rngSeed = nextSeed2;
  const jitter = (r1 - 0.45) * 4.5;

  const rawOverall =
    baseArchQuality * 0.56 +
    dsQuality * 0.30 +
    Math.min(18, researchStaffPower * 0.55) +
    Math.min(10, dataStaffPower * 0.45) +
    researchBonusPct * 0.18 +
    computeBoost +
    jitter;

  const ceiling = Math.min(BALANCE.benchmarkMaxScore, era.benchmarkCeiling + 6);
  const overall = Math.round(Math.max(10, Math.min(ceiling, rawOverall)));

  const catBonus = {
    reasoning: job.category === 'agent' || job.category === 'language' ? 5 : -2,
    coding: job.category === 'language' || job.category === 'agent' ? 4 : -3,
    multimodal: job.category === 'vision' || job.category === 'multimodal' ? 7 : -4,
  };

  const clampScore = (v: number) => Math.round(Math.max(5, Math.min(100, v)));
  const riskPenalty = (ds?.legalityRisk ?? 0) * 0.45;
  const safetyScore = clampScore(
    state.safety * 0.75 + safetyStaffBonus + Math.min(12, dataStaffPower * 0.5) - riskPenalty + (r2 - 0.5) * 5,
  );

  const benchmarks: BenchmarkScores = {
    overall,
    reasoning: clampScore(overall + catBonus.reasoning + (r1 - 0.5) * 6),
    coding: clampScore(overall + catBonus.coding + (r2 - 0.5) * 6),
    multimodal: clampScore(overall + catBonus.multimodal + (r1 - r2) * 5),
    safety: safetyScore,
  };

  // Slight risk check for risky datasets
  if (ds && ds.legalityRisk >= 15 && r2 < 0.25) {
    state.safety = Math.max(10, state.safety - 4);
    pushNotification(
      state,
      `Audit warning on ${job.modelName} due to ${ds.name} licensing risk.`,
      'warn',
    );
  }

  const model: TrainedModel = {
    id: allocUid(state, 'mdl'),
    name: job.modelName,
    archId: job.archId,
    archName: job.archName,
    category: job.category,
    datasetId: job.datasetId,
    completedDay: Math.floor(state.totalDays),
    completedYear: state.year,
    benchmarks,
    shipped: false,
  };

  return model;
}

export function stepTrainingJobs(
  state: GameState,
  gameDaysDelta: number,
  computeThrottle: number,
  researchBonusPct: number,
): TrainedModel[] {
  const completed: TrainedModel[] = [];

  // Speed multiplier from ML Engineers + Techs
  let speedMult = 1;
  for (const techId of state.unlockedTechs) {
    const tech = TECH_BY_ID[techId];
    if (tech?.trainingSpeedBonus) speedMult += tech.trainingSpeedBonus;
  }
  for (const s of state.staff) {
    const trait = STAFF_TRAIT_BY_ID[s.traitId];
    const moodFactor = 0.7 + (s.mood / 100) * 0.35;
    if (s.role === 'ml_engineer') {
      speedMult += s.skill * 0.04 * moodFactor;
    } else if (s.role === 'researcher') {
      speedMult += s.skill * 0.02 * moodFactor;
    }
    if (trait?.speedMult) speedMult += (trait.speedMult - 1) * 0.5;
  }

  for (let i = state.trainingJobs.length - 1; i >= 0; i--) {
    const job = state.trainingJobs[i];
    const arch = getUnlockedArchitectures(state).find((a) => a.id === job.archId);
    const computeOverdrive = arch
      ? 1 + Math.max(0, job.computeAllocated / Math.max(1, arch.computeReq) - 1) * 0.5
      : 1;

    const effectiveDays = gameDaysDelta * speedMult * computeOverdrive * computeThrottle;
    job.elapsedDays += effectiveDays;
    job.progress = Math.min(1, job.elapsedDays / Math.max(1, job.totalDaysRequired));

    if (job.progress >= 1) {
      state.trainingJobs.splice(i, 1);
      const model = evaluateTrainedModel(state, job, researchBonusPct);
      state.models.unshift(model);
      state.lastCompletedModelId = model.id;
      state.reputation = Math.min(100, state.reputation + Math.max(2, Math.round(model.benchmarks.overall / 14)));
      state.hype = Math.min(100, state.hype + Math.max(2, Math.round(model.benchmarks.overall / 18)));
      completed.push(model);
      pushNotification(
        state,
        `Model trained: ${model.name} (Score ${model.benchmarks.overall}/100)`,
        'good',
      );
    }
  }

  return completed;
}

export function shipModelAsProduct(
  state: GameState,
  modelId: string,
  productName?: string,
): { ok: boolean; reason?: string } {
  const model = state.models.find((m) => m.id === modelId);
  if (!model) return { ok: false, reason: 'Model not found' };
  if (model.shipped) return { ok: false, reason: 'Already shipped' };

  model.shipped = true;
  const initialUsers = Math.round(
    180 +
      model.benchmarks.overall * 24 +
      state.reputation * BALANCE.repToUsersMultiplier +
      state.hype * BALANCE.hypeToUsersMultiplier,
  );
  const revPerDay =
    initialUsers * BALANCE.baseRevenuePerUserPerDay * (0.7 + model.benchmarks.overall / 60);

  const suffix =
    model.category === 'vision'
      ? 'Vision API'
      : model.category === 'agent'
        ? 'Agent Cloud'
        : model.category === 'multimodal'
          ? 'Omni Studio'
          : 'Chat & API';

  const name =
    productName && productName.trim().length > 0
      ? productName.trim()
      : `${model.name} ${suffix}`;

  state.products.unshift({
    id: allocUid(state, 'prd'),
    modelId: model.id,
    name,
    category: model.category,
    quality: model.benchmarks.overall,
    users: initialUsers,
    revenuePerDay: revPerDay,
    launchedDay: Math.floor(state.totalDays),
    decayFactor: 1.0,
  });

  state.hype = Math.min(100, state.hype + 6);
  state.reputation = Math.min(100, state.reputation + 3);
  state.valuation = Math.max(
    state.valuation,
    Math.round(state.valuation + revPerDay * 180 + model.benchmarks.overall * 5_000),
  );
  pushNotification(
    state,
    `Shipped ${name}! Est. +$${Math.round(revPerDay).toLocaleString()}/day`,
    'good',
  );
  return { ok: true };
}
