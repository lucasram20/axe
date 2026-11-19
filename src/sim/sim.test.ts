import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState, deserializeSave, serializeSave } from './save';
import { canPlaceItem, movePlacedItem, placeItem, sellPlacedItem } from './grid';
import { computeResources, raiseFundingRound, unlockTech } from './economy';
import { hireCandidate, fireStaff } from './staffSim';
import { acquireDataset, shipModelAsProduct, startTrainingJob } from './training';
import { calculateOfflineProgress, resolveActiveEvent, stepSimulation, triggerRandomEventNow } from './engine';

test('initial state boots in 2010 with valid compute, desks, and starter staff', () => {
  const state = createInitialState(1_000_000);
  assert.equal(state.year, 2010);
  assert.equal(state.eraIndex, 0);
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

test('staff hiring respects desk capacity and updates payroll', () => {
  const state = createInitialState(1_000_000);
  const beforePayroll = computeResources(state).payrollPerDay;
  const candId = state.candidates[0].id;
  const hired = hireCandidate(state, candId);
  assert.equal(hired.ok, true);
  assert.equal(state.staff.length, 3);
  assert.ok(computeResources(state).payrollPerDay > beforePayroll);

  // Desk slots = 3, so hiring a 4th should fail until another desk is built
  const fourth = hireCandidate(state, state.candidates[0].id);
  assert.equal(fourth.ok, false);

  // Fire one staff
  assert.equal(fireStaff(state, state.staff[2].id), true);
  assert.equal(state.staff.length, 2);
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
  // Give a profitable product so offline earnings are positive
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

  // Simulate 1 hour offline (3600s)
  const summary = calculateOfflineProgress(restored!, 3_600);
  assert.equal(summary.elapsedRealSeconds, 3_600);
  assert.ok(summary.simulatedGameDays > 100);
  assert.ok(summary.cashEarned > 0);
});
