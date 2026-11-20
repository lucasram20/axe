import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState, deserializeSave, serializeSave } from './save';
import { canPlaceItem, movePlacedItem, placeItem, sellPlacedItem } from './grid';
import { computeResources, raiseFundingRound, unlockTech } from './economy';
import { hireCandidate, fireStaff } from './staffSim';
import { acquireDataset, maxAllTrainedModels, shipModelAsProduct, startTrainingJob } from './training';
import { calculateOfflineProgress, resolveActiveEvent, stepSimulation, triggerRandomEventNow } from './engine';
import { applyMaxHyperscaleHQ, autoFurnishLab, upgradeBuildingTier } from './facility';
import { ERAS, TECH_NODES } from '../data/techs';
import { DATASETS } from '../data/datasets';

test('initial state boots in 2010 with valid compute, desks, and starter staff', () => {
  const state = createInitialState(1_000_000);
  assert.equal(state.year, 2010);
  assert.equal(state.eraIndex, 0);
  assert.equal(state.buildingTier, 0);
  assert.equal(state.automation.autoFurnish, true);
  assert.equal(state.staff.length, 2);
  const res = computeResources(state);
  assert.ok(res.computeTotal >= 50, `Expected starter compute >= 50, got ${res.computeTotal}`);
  assert.equal(res.isUnderpowered, false);
  assert.equal(res.isOverheated, false);
  assert.equal(res.deskSlots, 3);
});

test('grid placement, rotation, move, and sell refund work accurately', () => {
  const state = createInitialState(1_000_000);
  const startCash = state.cash;

  // Cannot place indoor desk on grass
  const grassCheck = canPlaceItem(state, 'desk_basic', 0, 0, 0);
  assert.equal(grassCheck.valid, false);

  // Place GPU rig on empty garage tile (9, 9)
  const placed = placeItem(state, 'gpu_rig_2010', 9, 9, 1);
  assert.equal(placed.ok, true);
  assert.ok(placed.placedUid);
  assert.equal(state.cash, startCash - 3_200);

  // Move it to (9, 10)
  const moved = movePlacedItem(state, placed.placedUid!, 9, 10, 2);
  assert.equal(moved.ok, true);
  const movedItem = state.items.find((i) => i.uid === placed.placedUid);
  assert.equal(movedItem?.gx, 9);
  assert.equal(movedItem?.gz, 10);
  assert.equal(movedItem?.rotation, 2);

  // Sell it and verify partial refund
  const sold = sellPlacedItem(state, placed.placedUid!);
  assert.equal(sold.ok, true);
  assert.ok(sold.refund > 0 && sold.refund < 3_200);
  assert.equal(state.items.some((i) => i.uid === placed.placedUid), false);
});

test('staff hiring respects manual desk capacity and auto-furnishes when enabled', () => {
  const state = createInitialState(1_000_000);
  state.cash = 50_000;
  state.automation.autoFurnish = false;

  const beforePayroll = computeResources(state).payrollPerDay;
  const candId = state.candidates[0].id;
  const hired = hireCandidate(state, candId);
  assert.equal(hired.ok, true);
  assert.equal(state.staff.length, 3);
  assert.ok(computeResources(state).payrollPerDay > beforePayroll);

  // With autoFurnish OFF and desk slots = 3, hiring a 4th fails
  const fourthBlocked = hireCandidate(state, state.candidates[0].id);
  assert.equal(fourthBlocked.ok, false);

  // With autoFurnish ON, hiring a 4th automatically adds a desk and succeeds!
  state.automation.autoFurnish = true;
  const fourthAuto = hireCandidate(state, state.candidates[0].id);
  assert.equal(fourthAuto.ok, true);
  assert.equal(state.staff.length, 4);
  assert.ok(computeResources(state).deskSlots >= 4);

  // Fire one staff
  assert.equal(fireStaff(state, state.staff[2].id), true);
  assert.equal(state.staff.length, 3);
});

test('training pipeline completes a model and shipping generates product revenue', () => {
  const state = createInitialState(1_000_000);
  const res = computeResources(state);
  const started = startTrainingJob(state, 'arch_convnet', 'ds_academic_vision', res.computeAvailable);
  assert.equal(started.ok, true);
  assert.equal(state.trainingJobs.length, 1);

  // Step simulation forward until training finishes
  let completedTotal = 0;
  for (let i = 0; i < 400; i++) {
    const out = stepSimulation(state, 0.25);
    completedTotal += out.completedModels;
    if (completedTotal > 0) break;
  }

  assert.equal(completedTotal, 1);
  assert.equal(state.models.length, 1);
  const model = state.models[0];
  assert.ok(model.benchmarks.overall >= 15 && model.benchmarks.overall <= 100);

  const shipped = shipModelAsProduct(state, model.id);
  assert.equal(shipped.ok, true);
  assert.equal(state.products.length, 1);
  assert.ok(computeResources(state).revenuePerDay > 0);
});

test('tech tree, datasets, funding rounds, and events mutate state cleanly', () => {
  const state = createInitialState(1_000_000);
  state.cash = 100_000;
  state.reputation = 25;

  // License dataset
  const dsRes = acquireDataset(state, 'ds_web_crawl');
  assert.equal(dsRes.ok, true);
  assert.ok(state.ownedDatasets.includes('ds_web_crawl'));

  // Unlock Era 0 tech
  const techRes = unlockTech(state, 'tech_gpu_kernels');
  assert.equal(techRes.ok, true);
  assert.ok(state.unlockedTechs.includes('tech_gpu_kernels'));

  // Trigger and resolve event
  triggerRandomEventNow(state);
  assert.ok(state.activeEvent !== null);
  const resolved = resolveActiveEvent(state, 'nonexistent_falls_back_to_first');
  assert.equal(resolved.ok, true);
  assert.equal(state.activeEvent, null);

  // Add a model so Angel Pre-Seed passes benchmark requirement
  state.models.push({
    id: 'mdl_test',
    name: 'TestNet-1',
    archId: 'arch_convnet',
    archName: 'DeepVision ConvNet',
    category: 'vision',
    datasetId: 'ds_academic_vision',
    completedDay: 10,
    completedYear: 2010,
    benchmarks: { overall: 28, reasoning: 25, coding: 22, multimodal: 35, safety: 80 },
    shipped: false,
  });
  const cashPreFund = state.cash;
  const fundRes = raiseFundingRound(state, 'round_angel');
  assert.equal(fundRes.ok, true);
  assert.equal(state.cash, cashPreFund + 35_000);
  assert.ok(state.founderEquityPct < 100);
});

test('save serialization, migration, and capped offline progress work deterministically', () => {
  const state = createInitialState(1_000_000);
  state.products.push({
    id: 'prd_1',
    modelId: 'mdl_1',
    name: 'VisionAPI',
    category: 'vision',
    quality: 40,
    users: 2_500,
    revenuePerDay: 1_800,
    launchedDay: 1,
    decayFactor: 1,
  });

  const savedJson = serializeSave(state, 1_000_000);
  const restored = deserializeSave(savedJson);
  assert.ok(restored !== null);
  assert.equal(restored!.cash, state.cash);
  assert.equal(restored!.items.length, state.items.length);

  const summary = calculateOfflineProgress(restored!, 3_600);
  assert.equal(summary.elapsedRealSeconds, 3_600);
  assert.ok(summary.simulatedGameDays > 100);
  assert.ok(summary.cashEarned > 0);
});

test('building tiers upgrade space, auto-furnish balances lab, and Max Hyperscale HQ deploys huge compute', () => {
  const state = createInitialState(1_000_000);
  state.cash = 1_000_000;

  const up1 = upgradeBuildingTier(state);
  assert.equal(up1.ok, true);
  assert.equal(state.buildingTier, 1);

  const furnished = autoFurnishLab(state);
  assert.ok(furnished.placedCount >= 0);

  // Max Hyperscale HQ cheat works even from 2010 era AND scales to 2100 Singularity
  applyMaxHyperscaleHQ(state);
  assert.equal(state.buildingTier, 3);
  const res2010 = computeResources(state);
  assert.ok(res2010.computeTotal >= 4_500, `Expected Max HQ compute >= 4500, got ${res2010.computeTotal}`);
  assert.equal(res2010.isUnderpowered, false);
  assert.equal(res2010.isOverheated, false);

  state.eraIndex = 6;
  applyMaxHyperscaleHQ(state);
  const res2100 = computeResources(state);
  assert.ok(res2100.computeTotal >= 35_000, `Expected 2100 Singularity HQ compute >= 35000, got ${res2100.computeTotal}`);
});

test('perfect model quality override scores 100 across all aspects and eras span 2010 to 2100 with rich archs & datasets', () => {
  // Verify every Era (0..6, up to 2100) has >= 2 architectures and >= 3 datasets
  assert.equal(ERAS[ERAS.length - 1].startYear, 2100);
  for (const era of ERAS) {
    const eraArchs = TECH_NODES.filter((t) => t.eraIndex === era.index && t.unlocksArchitecture);
    const eraData = DATASETS.filter((d) => d.unlockEra === era.index);
    assert.ok(eraArchs.length >= 2, `Era ${era.startYear} should have >=2 architectures, found ${eraArchs.length}`);
    assert.ok(eraData.length >= 3, `Era ${era.startYear} should have >=3 datasets, found ${eraData.length}`);
  }

  // Verify cheatPerfectModels produces 100/100 in all 5 aspects
  const state = createInitialState(1_000_000);
  state.cheatPerfectModels = true;
  const res = computeResources(state);
  startTrainingJob(state, 'arch_convnet', 'ds_academic_vision', res.computeAvailable);
  for (let i = 0; i < 400 && state.models.length === 0; i++) {
    stepSimulation(state, 0.25);
  }
  assert.equal(state.models.length, 1);
  assert.deepEqual(state.models[0].benchmarks, {
    overall: 100,
    reasoning: 100,
    coding: 100,
    multimodal: 100,
    safety: 100,
  });

  // Verify maxAllTrainedModels upgrades imperfect existing models & products to 100
  state.models[0].benchmarks.overall = 42;
  state.models[0].benchmarks.safety = 60;
  shipModelAsProduct(state, state.models[0].id);
  maxAllTrainedModels(state);
  assert.equal(state.models[0].benchmarks.overall, 100);
  assert.equal(state.models[0].benchmarks.safety, 100);
  assert.equal(state.products[0].quality, 100);
});
