/**
 * Pure staff generation, hiring, firing, desk assignment, mood/energy,
 * and tile-space walking state machine.
 * Zero React or Three.js imports.
 */

import { BALANCE } from '../data/balance';
import { CATALOG_BY_ID } from '../data/items';
import {
  FIRST_NAMES,
  HAIR_COLORS,
  LAST_NAMES,
  SKIN_TONES,
  STAFF_ROLES,
  STAFF_ROLE_LIST,
  STAFF_TRAITS,
  STAFF_TRAIT_BY_ID,
  type StaffRole,
} from '../data/staff';
import { autoEnsureDeskForHire } from './facility';
import { getWalkableIndoorTiles } from './grid';
import {
  allocUid,
  nextRand,
  pushNotification,
  type GameState,
  type StaffMember,
} from './types';

function pickFrom<T>(state: GameState, arr: readonly T[]): T {
  const [next, r] = nextRand(state.rngSeed);
  state.rngSeed = next;
  return arr[Math.floor(r * arr.length) % arr.length];
}

function randFloat(state: GameState): number {
  const [next, r] = nextRand(state.rngSeed);
  state.rngSeed = next;
  return r;
}

export function generateCandidate(
  state: GameState,
  forcedRole?: StaffRole,
): StaffMember {
  const roleDef = forcedRole ? STAFF_ROLES[forcedRole] : pickFrom(state, STAFF_ROLE_LIST);
  const first = pickFrom(state, FIRST_NAMES);
  const last = pickFrom(state, LAST_NAMES);
  const trait = pickFrom(state, STAFF_TRAITS);

  const eraSkillFloor = Math.min(5, 1 + state.eraIndex);
  const eraSkillCeil = Math.min(10, 4 + state.eraIndex * 2);
  const skill = Math.min(
    10,
    Math.max(1, Math.floor(eraSkillFloor + randFloat(state) * (eraSkillCeil - eraSkillFloor + 1))),
  );

  const salaryMult = trait.salaryMult ?? 1;
  const salaryPerDay = Math.round(
    roleDef.baseSalaryPerDay * (0.75 + skill * 0.14) * salaryMult,
  );
  const hireFee = Math.round(roleDef.hireFee * (0.8 + skill * 0.18));

  return {
    id: allocUid(state, 'stf'),
    name: `${first} ${last}`,
    role: roleDef.id,
    skill,
    salaryPerDay,
    hireFee,
    traitId: trait.id,
    mood: 84,
    energy: 92,
    hairColor: pickFrom(state, HAIR_COLORS),
    skinTone: pickFrom(state, SKIN_TONES),
    x: 8.5,
    z: 8.5,
    targetX: 8.5,
    targetZ: 8.5,
    facingAngle: 0,
    walkPhase: randFloat(state) * Math.PI * 2,
    activity: 'wandering',
    activityTimer: 1.5,
    assignedDeskUid: null,
  };
}

export function populateCandidates(state: GameState): void {
  state.candidates = [];
  for (let i = 0; i < BALANCE.candidatePoolSize; i++) {
    state.candidates.push(generateCandidate(state));
  }
}

export function refreshCandidates(state: GameState): { ok: boolean; reason?: string } {
  if (state.cash < BALANCE.candidateRefreshCost) {
    return { ok: false, reason: 'Insufficient funds' };
  }
  state.cash -= BALANCE.candidateRefreshCost;
  populateCandidates(state);
  return { ok: true };
}

export function countDeskSlots(state: GameState): number {
  let slots = 0;
  for (const item of state.items) {
    const def = CATALOG_BY_ID[item.itemId];
    if (def?.deskSlots) slots += def.deskSlots;
  }
  return slots;
}

export function hireCandidate(
  state: GameState,
  candidateId: string,
): { ok: boolean; reason?: string } {
  const idx = state.candidates.findIndex((c) => c.id === candidateId);
  if (idx === -1) return { ok: false, reason: 'Candidate unavailable' };

  const candidate = state.candidates[idx];
  if (!state.cheatFreeBuild && state.cash < candidate.hireFee) {
    return { ok: false, reason: 'Insufficient cash' };
  }

  let deskSlots = countDeskSlots(state);
  if (state.staff.length >= Math.max(deskSlots, 1)) {
    if (state.automation.autoFurnish) {
      const autoDesk = autoEnsureDeskForHire(state);
      if (autoDesk.ok) {
        deskSlots = countDeskSlots(state);
        pushNotification(
          state,
          `Auto-Furnish added a ${autoDesk.placedItemName ?? 'desk'} for ${candidate.name}.`,
          'info',
        );
      }
    }
    if (state.staff.length >= Math.max(deskSlots, 1)) {
      return { ok: false, reason: 'Upgrade HQ or add space for more desks' };
    }
  }

  if (!state.cheatFreeBuild) {
    if (state.cash < candidate.hireFee) {
      return { ok: false, reason: 'Insufficient cash' };
    }
    state.cash -= candidate.hireFee;
  }
  state.candidates.splice(idx, 1);

  const walkable = getWalkableIndoorTiles(state);
  if (walkable.length > 0) {
    const [wx, wz] = walkable[Math.floor(randFloat(state) * walkable.length)];
    candidate.x = wx + 0.5;
    candidate.z = wz + 0.5;
    candidate.targetX = candidate.x;
    candidate.targetZ = candidate.z;
  }

  state.staff.push(candidate);
  state.candidates.push(generateCandidate(state));
  pushNotification(
    state,
    `Hired ${candidate.name} (${STAFF_ROLES[candidate.role].shortLabel} Lv.${candidate.skill})`,
    'good',
  );
  return { ok: true };
}

export function fireStaff(state: GameState, staffId: string): boolean {
  const idx = state.staff.findIndex((s) => s.id === staffId);
  if (idx === -1) return false;
  const [removed] = state.staff.splice(idx, 1);
  pushNotification(state, `${removed.name} left the lab.`, 'info');
  return true;
}

function findDeskForStaff(state: GameState, staff: StaffMember): string | null {
  // Keep current desk if it still exists
  if (
    staff.assignedDeskUid &&
    state.items.some((i) => i.uid === staff.assignedDeskUid)
  ) {
    return staff.assignedDeskUid;
  }

  // Count occupancy per desk
  const occupancy = new Map<string, number>();
  for (const s of state.staff) {
    if (s.assignedDeskUid) {
      occupancy.set(s.assignedDeskUid, (occupancy.get(s.assignedDeskUid) ?? 0) + 1);
    }
  }

  for (const item of state.items) {
    const def = CATALOG_BY_ID[item.itemId];
    if (!def?.deskSlots) continue;
    const used = occupancy.get(item.uid) ?? 0;
    if (used < def.deskSlots) {
      return item.uid;
    }
  }
  return null;
}

export function stepStaffSimulation(
  state: GameState,
  dtRealSec: number,
  gameDaysDelta: number,
  passiveMoodBonus: number,
): void {
  const coffeeItems = state.items.filter((i) => CATALOG_BY_ID[i.itemId]?.isCoffee);
  const serverItems = state.items.filter((i) => CATALOG_BY_ID[i.itemId]?.isServerProp);
  const whiteboardItems = state.items.filter(
    (i) => CATALOG_BY_ID[i.itemId]?.isWhiteboard,
  );
  const walkable = getWalkableIndoorTiles(state);

  const walkSpeed = 1.65; // tiles per real second (scaled with game speed via dtRealSec)

  for (let i = 0; i < state.staff.length; i++) {
    const s = state.staff[i];
    const trait = STAFF_TRAIT_BY_ID[s.traitId];
    const moodDecayMult = trait?.moodDecayMult ?? 1;

    // Assign desk if needed
    s.assignedDeskUid = findDeskForStaff(state, s);

    // Passive needs
    const moodRecover = Math.min(4, passiveMoodBonus * 0.18);
    s.mood = Math.max(
      15,
      Math.min(
        100,
        s.mood + (moodRecover - BALANCE.staffMoodDecayPerDay * moodDecayMult) * gameDaysDelta,
      ),
    );
    s.energy = Math.max(
      5,
      Math.min(100, s.energy - BALANCE.staffEnergyDecayPerDay * gameDaysDelta),
    );

    // Movement toward target
    const dx = s.targetX - s.x;
    const dz = s.targetZ - s.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.08) {
      const step = Math.min(dist, walkSpeed * dtRealSec);
      s.x += (dx / dist) * step;
      s.z += (dz / dist) * step;
      s.facingAngle = Math.atan2(dx, dz);
      s.walkPhase += step * 8.5;
      continue;
    }

    // Arrived at target — handle state transitions
    if (s.activity === 'walking_to_coffee') {
      s.activity = 'drinking_coffee';
      s.activityTimer = 2.4;
      continue;
    }
    if (s.activity === 'walking_to_desk') {
      s.activity = 'working';
      s.activityTimer = 6.5 + randFloat(state) * 6;
      continue;
    }
    if (s.activity === 'walking_to_server') {
      s.activity = 'inspecting_server';
      s.activityTimer = 3.5 + randFloat(state) * 2.5;
      continue;
    }

    // Tick current stationary activity
    s.activityTimer -= dtRealSec;
    if (s.activity === 'drinking_coffee') {
      s.energy = Math.min(100, s.energy + (BALANCE.coffeeRestoreEnergy / 2.4) * dtRealSec);
      s.mood = Math.min(100, s.mood + (BALANCE.coffeeRestoreMood / 2.4) * dtRealSec);
    }

    if (s.activityTimer > 0) continue;

    // Pick next destination
    if (s.energy < 42 && coffeeItems.length > 0) {
      const c = coffeeItems[Math.floor(randFloat(state) * coffeeItems.length)];
      s.targetX = c.gx + 0.5 + (randFloat(state) - 0.5) * 0.4;
      s.targetZ = c.gz + 0.9;
      s.activity = 'walking_to_coffee';
      continue;
    }

    const roll = randFloat(state);
    if (
      (s.role === 'infra_devops' || s.role === 'ml_engineer') &&
      roll < 0.28 &&
      serverItems.length > 0
    ) {
      const srv = serverItems[Math.floor(randFloat(state) * serverItems.length)];
      s.targetX = srv.gx + 0.5;
      s.targetZ = srv.gz + 1.05;
      s.activity = 'walking_to_server';
      continue;
    }

    if (s.role === 'researcher' && roll < 0.25 && whiteboardItems.length > 0) {
      const wb = whiteboardItems[Math.floor(randFloat(state) * whiteboardItems.length)];
      s.targetX = wb.gx + 0.5;
      s.targetZ = wb.gz + 0.95;
      s.activity = 'brainstorming';
      s.activityTimer = 4.2;
      continue;
    }

    if (s.assignedDeskUid && roll < 0.82) {
      const desk = state.items.find((it) => it.uid === s.assignedDeskUid);
      if (desk) {
        // Offset second seat slightly on 2-slot desks
        const seatOffset = (i % 2) * 0.55;
        s.targetX = desk.gx + 0.35 + seatOffset;
        s.targetZ = desk.gz + 0.85;
        s.activity = 'walking_to_desk';
        continue;
      }
    }

    // Fallback wander inside lab
    if (walkable.length > 0) {
      const [wx, wz] = walkable[Math.floor(randFloat(state) * walkable.length)];
      s.targetX = wx + 0.5;
      s.targetZ = wz + 0.5;
      s.activity = 'wandering';
      s.activityTimer = 2.0 + randFloat(state) * 3.0;
    } else {
      s.activityTimer = 2.0;
    }
  }
}
