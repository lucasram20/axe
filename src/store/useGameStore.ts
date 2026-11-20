/**
 * Zustand store bridging the pure deterministic `/sim` engine with React HUD
 * and the Three.js isometric pixel-art renderer.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { audioManager } from '../audio/audioManager';
import { BALANCE } from '../data/balance';
import { DATASETS } from '../data/datasets';
import { ERAS, TECH_NODES } from '../data/techs';
import {
  computeResources,
  raiseFundingRound,
  unlockTech,
} from '../sim/economy';
import {
  calculateOfflineProgress,
  resolveActiveEvent,
  stepSimulation,
  triggerRandomEventNow,
} from '../sim/engine';
import {
  addBuildingStory,
  applyMaxHyperscaleHQ,
  autoFurnishLab,
  buyLandParcel,
  unlockAllCampusLand,
  upgradeAllBuildingsToMaxStories,
  upgradeBuildingTier,
} from '../sim/facility';
import { movePlacedItem, placeItem, sellPlacedItem } from '../sim/grid';
import {
  createInitialState,
  deleteGameSlot,
  loadGameFromSlot,
  sanitizeLabName,
  SAVE_STORAGE_KEY,
  saveGameToSlot,
  type SaveSlotId,
} from '../sim/save';
import {
  fillCampusWithGeniuses,
  fireStaff,
  generateCandidate,
  hireCandidate,
  refreshCandidates,
} from '../sim/staffSim';
import {
  acquireDataset,
  maxAllTrainedModels,
  shipModelAsProduct,
  startTrainingJob,
  stepTrainingJobs,
} from '../sim/training';
import {
  pushNotification,
  type GameState,
  type LandParcelId,
  type OfflineProgressSummary,
  type QualitySettings,
  type RotationQuarter,
} from '../sim/types';

export type ScreenMode = 'title' | 'playing' | 'paused';
export type DrawerTab =
  | null
  | 'build'
  | 'staff'
  | 'research'
  | 'data'
  | 'models'
  | 'finance'
  | 'rivals'
  | 'settings';

export type BuildToolMode = 'select' | 'place' | 'move' | 'sell';

export interface CameraViewportBounds {
  centerX: number;
  centerZ: number;
  halfW: number;
  halfH: number;
}

export type CameraCommandType = 'zoom_in' | 'zoom_out' | 'rotate_left' | 'rotate_right' | 'center';

interface GameStore {
  game: GameState;
  hasExistingSave: boolean;
  screen: ScreenMode;
  activeDrawer: DrawerTab;

  // Build / interaction state
  buildTool: BuildToolMode;
  buildItemId: string | null;
  buildRotation: RotationQuarter;
  movingItemUid: string | null;
  selectedItemUid: string | null;
  selectedStaffId: string | null;
  hoveredTile: [number, number] | null;

  // Camera sync for minimap & touch controls
  cameraBounds: CameraViewportBounds;
  cameraJumpTarget: { x: number; z: number; nonce: number } | null;
  cameraCommand: { type: CameraCommandType; nonce: number } | null;

  // Modals, debug & secret cheat menu
  debugOpen: boolean;
  cheatMenuOpen: boolean;
  cheatGodMood: boolean;
  cheatHyperTraining: boolean;
  cheatFreeCash: boolean;
  muteTrainingPopups: boolean;
  activeSaveSlot: SaveSlotId;
  saveSlotsNonce: number;
  offlineSummary: OfflineProgressSummary | null;
  trainingResultModelId: string | null;
  lastEventOutcome: string | null;

  // Lifecycle & loop
  startNewLab: (customLabName?: string, slotId?: SaveSlotId) => void;
  continueLab: () => void;
  loadSaveSlot: (slotId: SaveSlotId) => boolean;
  saveToSlot: (slotId: SaveSlotId) => void;
  deleteSaveSlot: (slotId: SaveSlotId) => void;
  renameLab: (newName: string) => void;
  setScreen: (screen: ScreenMode) => void;
  tickSim: (dtRealSec: number) => void;
  setSpeed: (speed: 0 | 1 | 2 | 4) => void;

  // Navigation & build actions
  setActiveDrawer: (tab: DrawerTab) => void;
  selectBuildItem: (itemId: string) => void;
  setBuildTool: (tool: BuildToolMode) => void;
  rotateBuild: () => void;
  cancelBuild: () => void;
  startMovingItem: (uid: string) => void;
  placeAtTile: (gx: number, gz: number) => boolean;
  sellItemByUid: (uid: string) => void;
  selectItemUid: (uid: string | null) => void;
  selectStaffId: (id: string | null) => void;
  setHoveredTile: (tile: [number, number] | null) => void;

  // Management actions
  hireStaff: (candidateId: string) => void;
  fireStaffMember: (staffId: string) => void;
  refreshStaffPool: () => void;
  unlockTechNode: (techId: string) => void;
  buyDataset: (datasetId: string) => void;
  startTraining: (archId: string, datasetId: string, computeBudget: number, customName?: string) => boolean;
  shipModel: (modelId: string) => void;
  raiseFunding: (roundId: string) => void;
  chooseEventOption: (choiceId: string) => void;
  toggleAutomation: (key: 'autoQueueTraining' | 'autoBuyPower' | 'autoHireStaff' | 'autoFurnish') => void;
  upgradeBuilding: () => boolean;
  buyLand: (parcelId: LandParcelId) => boolean;
  addStory: (buildingId: string) => boolean;
  autoFurnishNow: () => void;

  // Settings & persistence
  updateSettings: (patch: Partial<QualitySettings>) => void;
  toggleMuteTrainingPopups: () => void;
  saveNow: () => void;
  resetSave: () => void;

  // Camera / minimap & mobile touch camera controls
  setCameraBounds: (bounds: CameraViewportBounds) => void;
  jumpCameraTo: (x: number, z: number) => void;
  triggerCameraCommand: (type: CameraCommandType) => void;

  // Modals & debug
  toggleDebug: () => void;
  dismissOfflineSummary: () => void;
  dismissTrainingResult: () => void;
  dismissEventOutcome: () => void;
  debugAddCash: (amount: number) => void;
  debugAddCompute: (amount: number) => void;
  debugSkipDays: (days: number) => void;
  debugTriggerEvent: () => void;
  debugUnlockAllTechs: () => void;
  debugSpawnStaffBatch: (count: number) => void;

  // Secret cheat menu (keyboard-only + 5-tap mobile date gesture)
  toggleCheatMenu: () => void;
  closeCheatMenu: () => void;
  cheatAddCash: (amount: number) => void;
  cheatSetCash: (amount: number) => void;
  cheatAddCompute: (amount: number) => void;
  cheatAddGridPower: (contracts: number) => void;
  cheatMaxMetrics: () => void;
  cheatCompleteAllTraining: () => void;
  cheatUnlockAllResearchAndData: () => void;
  cheatMaxStaffMood: () => void;
  cheatMaxAllStaffSkill: () => void;
  cheatSpawnGeniuses: (count: number) => void;
  cheatFillCampusWithGeniuses: () => void;
  cheatJumpToFrontierEra: () => void;
  cheatJumpToEra: (eraIndex: number) => void;
  cheatMaxBuildingAndDataCenter: () => void;
  cheatUnlockAllLand: () => void;
  cheatMaxAllStories: () => void;
  cheatMaxAllModels: () => void;
  cheatTogglePerfectModels: () => void;
  cheatToggleUnlimitedCompute: () => void;
  cheatToggleUnlimitedPower: () => void;
  cheatToggleUnlimitedModels: () => void;
  cheatToggleFreeBuild: () => void;
  cheatToggleGodMood: () => void;
  cheatToggleHyperTraining: () => void;
  cheatToggleFreeCash: () => void;
}

function loadSavedFromStorage(): GameState | null {
  return loadGameFromSlot('autosave');
}

function writeSaveToStorage(state: GameState, slotId: SaveSlotId = 'autosave'): void {
  saveGameToSlot('autosave', state);
  if (slotId !== 'autosave') {
    saveGameToSlot(slotId, state);
  }
}

function syncBodyState(screen: ScreenMode): void {
  if (typeof document !== 'undefined') {
    document.body.dataset.state = screen;
  }
}

const existingSave = loadSavedFromStorage();
const isAutostart =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('autostart') === '1';

const initialScreen: ScreenMode = isAutostart ? 'playing' : 'title';
const bootGame = existingSave && isAutostart ? existingSave : createInitialState();

if (bootGame.settings.muted) {
  audioManager.setMuted(true);
}
syncBodyState(initialScreen);

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    game: bootGame,
    hasExistingSave: existingSave !== null,
    screen: initialScreen,
    activeDrawer: null,

    buildTool: 'select',
    buildItemId: null,
    buildRotation: 0,
    movingItemUid: null,
    selectedItemUid: null,
    selectedStaffId: null,
    hoveredTile: null,

    cameraBounds: { centerX: 14, centerZ: 15, halfW: 8, halfH: 6 },
    cameraJumpTarget: null,
    cameraCommand: null,

    debugOpen: false,
    cheatMenuOpen: false,
    cheatGodMood: false,
    cheatHyperTraining: false,
    cheatFreeCash: false,
    muteTrainingPopups: false,
    activeSaveSlot: 'autosave',
    saveSlotsNonce: 0,
    offlineSummary: null,
    trainingResultModelId: null,
    lastEventOutcome: null,

    startNewLab: (customLabName, slotId = 'autosave') => {
      audioManager.play('click');
      const fresh = createInitialState(Date.now(), customLabName);
      writeSaveToStorage(fresh, slotId);
      syncBodyState('playing');
      set((s) => {
        s.game = fresh;
        s.hasExistingSave = true;
        s.activeSaveSlot = slotId;
        s.saveSlotsNonce += 1;
        s.screen = 'playing';
        s.activeDrawer = null;
        s.buildTool = 'select';
        s.buildItemId = null;
        s.movingItemUid = null;
        s.selectedItemUid = null;
        s.selectedStaffId = null;
        s.offlineSummary = null;
        s.trainingResultModelId = null;
        s.lastEventOutcome = null;
      });
    },

    continueLab: () => {
      const ok = get().loadSaveSlot('autosave');
      if (!ok) {
        get().startNewLab();
      }
    },

    loadSaveSlot: (slotId) => {
      audioManager.play('click');
      const loaded = loadGameFromSlot(slotId);
      if (!loaded) return false;
      const elapsedSec = Math.max(0, (Date.now() - loaded.lastSavedAtMs) / 1000);
      let summary: OfflineProgressSummary | null = null;
      if (elapsedSec >= BALANCE.minOfflineSecondsForModal) {
        summary = calculateOfflineProgress(loaded, elapsedSec);
      }
      saveGameToSlot('autosave', loaded);
      audioManager.setMuted(loaded.settings.muted);
      syncBodyState('playing');
      set((s) => {
        s.game = loaded;
        s.hasExistingSave = true;
        s.activeSaveSlot = slotId;
        s.saveSlotsNonce += 1;
        s.screen = 'playing';
        s.offlineSummary = summary;
        s.trainingResultModelId = null;
        s.lastEventOutcome = null;
        s.activeDrawer = null;
      });
      return true;
    },

    saveToSlot: (slotId) => {
      const g = get().game;
      writeSaveToStorage(g, slotId);
      set((s) => {
        s.hasExistingSave = true;
        s.activeSaveSlot = slotId;
        s.saveSlotsNonce += 1;
        s.game.lastSavedAtMs = Date.now();
        pushNotification(
          s.game,
          `Saved "${s.game.labName}" to ${slotId === 'autosave' ? 'Auto-Save' : slotId.replace('_', ' ').toUpperCase()}.`,
          'good',
        );
      });
      audioManager.play('click');
    },

    deleteSaveSlot: (slotId) => {
      audioManager.play('click');
      deleteGameSlot(slotId);
      set((s) => {
        s.hasExistingSave = loadSavedFromStorage() !== null;
        s.saveSlotsNonce += 1;
      });
    },

    renameLab: (newName) => {
      const cleaned = sanitizeLabName(newName);
      set((s) => {
        s.game.labName = cleaned;
        pushNotification(s.game, `AI Lab renamed to "${cleaned}".`, 'info');
      });
      writeSaveToStorage(get().game, get().activeSaveSlot);
      set((s) => {
        s.saveSlotsNonce += 1;
      });
      audioManager.play('click');
    },

    setScreen: (screen) => {
      syncBodyState(screen);
      set((s) => {
        s.screen = screen;
      });
    },

    tickSim: (dtRealSec) => {
      const state = get();
      if (state.screen === 'paused') return;
      // On title screen, animate gentle ambient staff movement without advancing calendar/cash
      if (state.screen === 'title') {
        set((s) => {
          stepSimulation(s.game, Math.min(0.1, dtRealSec) * 0.4, {
            allowEvents: false,
          });
          // Keep starting cash & day clean on title showcase
          s.game.totalDays = 0;
          s.game.cash = BALANCE.startingCash;
        });
        return;
      }

      // Pause sim while any blocking modal is open so fast compute / auto-train NEVER re-triggers stuck modals!
      if (state.game.activeEvent || state.offlineSummary || state.trainingResultModelId) return;

      let completedModelId: string | null = null;
      const hadEvent = state.game.activeEvent !== null;
      set((s) => {
        s.game.lastCompletedModelId = null;
        const clampedDt = Math.min(0.15, dtRealSec);
        stepSimulation(s.game, clampedDt);

        if (s.cheatGodMood) {
          for (const member of s.game.staff) {
            member.mood = 100;
            member.energy = 100;
          }
        }
        if (s.cheatFreeCash) {
          s.game.cash = Math.max(s.game.cash, 999_999_999);
        }
        if (s.cheatHyperTraining && s.game.speed > 0 && s.game.trainingJobs.length > 0) {
          const boostDays = (clampedDt * s.game.speed * 9) / BALANCE.realSecondsPerGameDay;
          const res = computeResources(s.game);
          stepTrainingJobs(s.game, boostDays, 1, res.researchBonusPct);
        }

        if (s.game.lastCompletedModelId) {
          completedModelId = s.game.lastCompletedModelId;
          s.game.lastCompletedModelId = null;
          // Never spam blocking completion popups when Auto-Queue Training is ON or popups are muted!
          if (!s.game.automation.autoQueueTraining && !s.muteTrainingPopups) {
            s.trainingResultModelId = completedModelId;
          }
        }
      });

      if (completedModelId) {
        audioManager.play('train_complete');
      }
      if (!hadEvent && get().game.activeEvent !== null) {
        audioManager.play('alert');
      }
    },

    setSpeed: (speed) => {
      audioManager.play('click');
      set((s) => {
        s.game.speed = speed;
      });
    },

    setActiveDrawer: (tab) => {
      audioManager.play('click');
      set((s) => {
        s.activeDrawer = s.activeDrawer === tab ? null : tab;
        if (s.activeDrawer !== 'build') {
          s.buildTool = 'select';
          s.buildItemId = null;
          s.movingItemUid = null;
        }
      });
    },

    selectBuildItem: (itemId) => {
      audioManager.play('click');
      set((s) => {
        s.buildTool = 'place';
        s.buildItemId = itemId;
        s.movingItemUid = null;
        s.selectedItemUid = null;
        s.selectedStaffId = null;
        if (typeof window !== 'undefined' && (window.innerWidth < 768 || window.innerHeight < 520)) {
          s.activeDrawer = null;
        }
      });
    },

    setBuildTool: (tool) => {
      audioManager.play('click');
      set((s) => {
        s.buildTool = tool;
        if (tool !== 'place') s.buildItemId = null;
        if (tool !== 'move') s.movingItemUid = null;
        if (tool === 'sell' && typeof window !== 'undefined' && (window.innerWidth < 768 || window.innerHeight < 520)) {
          s.activeDrawer = null;
        }
      });
    },

    rotateBuild: () => {
      audioManager.play('click');
      set((s) => {
        s.buildRotation = ((s.buildRotation + 1) % 4) as RotationQuarter;
      });
    },

    cancelBuild: () => {
      set((s) => {
        s.buildTool = 'select';
        s.buildItemId = null;
        s.movingItemUid = null;
      });
    },

    startMovingItem: (uid) => {
      audioManager.play('click');
      set((s) => {
        const found = s.game.items.find((i) => i.uid === uid);
        if (!found) return;
        s.buildTool = 'move';
        s.movingItemUid = uid;
        s.buildItemId = found.itemId;
        s.buildRotation = found.rotation;
        s.selectedItemUid = null;
      });
    },

    placeAtTile: (gx, gz) => {
      const st = get();
      if (st.buildTool === 'move' && st.movingItemUid) {
        let ok = false;
        set((s) => {
          const res = movePlacedItem(s.game, s.movingItemUid!, gx, gz, s.buildRotation);
          ok = res.ok;
          if (res.ok) {
            s.buildTool = 'select';
            s.movingItemUid = null;
            s.buildItemId = null;
          }
        });
        audioManager.play(ok ? 'place' : 'invalid');
        return ok;
      }

      if (st.buildTool === 'place' && st.buildItemId) {
        let ok = false;
        let reason: string | undefined;
        set((s) => {
          const res = placeItem(s.game, s.buildItemId!, gx, gz, s.buildRotation);
          ok = res.ok;
          reason = res.reason;
          if (!res.ok && reason) {
            pushNotification(s.game, `Cannot place: ${reason}`, 'warn');
          }
        });
        audioManager.play(ok ? 'place' : 'invalid');
        return ok;
      }
      return false;
    },

    sellItemByUid: (uid) => {
      let ok = false;
      set((s) => {
        const res = sellPlacedItem(s.game, uid);
        ok = res.ok;
        if (s.selectedItemUid === uid) s.selectedItemUid = null;
      });
      if (ok) audioManager.play('sell');
    },

    selectItemUid: (uid) => {
      if (uid) audioManager.play('click');
      set((s) => {
        s.selectedItemUid = uid;
        if (uid) s.selectedStaffId = null;
      });
    },

    selectStaffId: (id) => {
      if (id) audioManager.play('click');
      set((s) => {
        s.selectedStaffId = id;
        if (id) s.selectedItemUid = null;
      });
    },

    setHoveredTile: (tile) => {
      const prev = get().hoveredTile;
      if (prev && tile && prev[0] === tile[0] && prev[1] === tile[1]) return;
      if (!prev && !tile) return;
      set((s) => {
        s.hoveredTile = tile;
      });
    },

    hireStaff: (candidateId) => {
      let ok = false;
      set((s) => {
        const res = hireCandidate(s.game, candidateId);
        ok = res.ok;
        if (!res.ok && res.reason) {
          pushNotification(s.game, res.reason, 'warn');
        }
      });
      audioManager.play(ok ? 'hire' : 'invalid');
    },

    fireStaffMember: (staffId) => {
      audioManager.play('click');
      set((s) => {
        fireStaff(s.game, staffId);
        if (s.selectedStaffId === staffId) s.selectedStaffId = null;
      });
    },

    refreshStaffPool: () => {
      let ok = false;
      set((s) => {
        const res = refreshCandidates(s.game);
        ok = res.ok;
        if (!res.ok && res.reason) pushNotification(s.game, res.reason, 'warn');
      });
      audioManager.play(ok ? 'click' : 'invalid');
    },

    unlockTechNode: (techId) => {
      let ok = false;
      set((s) => {
        const res = unlockTech(s.game, techId);
        ok = res.ok;
        if (!res.ok && res.reason) pushNotification(s.game, res.reason, 'warn');
      });
      audioManager.play(ok ? 'research' : 'invalid');
    },

    buyDataset: (datasetId) => {
      let ok = false;
      set((s) => {
        const res = acquireDataset(s.game, datasetId);
        ok = res.ok;
        if (!res.ok && res.reason) pushNotification(s.game, res.reason, 'warn');
      });
      audioManager.play(ok ? 'research' : 'invalid');
    },

    startTraining: (archId, datasetId, computeBudget, customName) => {
      let ok = false;
      set((s) => {
        const res = startTrainingJob(s.game, archId, datasetId, computeBudget, customName);
        ok = res.ok;
        if (!res.ok && res.reason) pushNotification(s.game, res.reason, 'warn');
      });
      audioManager.play(ok ? 'train_start' : 'invalid');
      return ok;
    },

    shipModel: (modelId) => {
      let ok = false;
      set((s) => {
        const res = shipModelAsProduct(s.game, modelId);
        ok = res.ok;
      });
      audioManager.play(ok ? 'cash' : 'invalid');
    },

    raiseFunding: (roundId) => {
      let ok = false;
      set((s) => {
        const res = raiseFundingRound(s.game, roundId);
        ok = res.ok;
        if (!res.ok && res.reason) pushNotification(s.game, res.reason, 'warn');
      });
      audioManager.play(ok ? 'cash' : 'invalid');
    },

    chooseEventOption: (choiceId) => {
      audioManager.play('click');
      set((s) => {
        const res = resolveActiveEvent(s.game, choiceId);
        if (res.outcomeText) {
          s.lastEventOutcome = res.outcomeText;
        }
      });
    },

    toggleAutomation: (key) => {
      audioManager.play('click');
      set((s) => {
        s.game.automation[key] = !s.game.automation[key];
      });
    },

    upgradeBuilding: () => {
      let ok = false;
      set((s) => {
        const res = upgradeBuildingTier(s.game);
        ok = res.ok;
        if (!res.ok && res.reason) {
          pushNotification(s.game, res.reason, 'warn');
        }
      });
      audioManager.play(ok ? 'cash' : 'invalid');
      return ok;
    },

    buyLand: (parcelId) => {
      let ok = false;
      set((s) => {
        const res = buyLandParcel(s.game, parcelId);
        ok = res.ok;
        if (!res.ok && res.reason) {
          pushNotification(s.game, res.reason, 'warn');
        }
      });
      audioManager.play(ok ? 'cash' : 'invalid');
      return ok;
    },

    addStory: (buildingId) => {
      let ok = false;
      set((s) => {
        const res = addBuildingStory(s.game, buildingId);
        ok = res.ok;
        if (!res.ok && res.reason) {
          pushNotification(s.game, res.reason, 'warn');
        }
      });
      audioManager.play(ok ? 'cash' : 'invalid');
      return ok;
    },

    autoFurnishNow: () => {
      let placed = 0;
      set((s) => {
        const res = autoFurnishLab(s.game);
        placed = res.placedCount;
        if (placed > 0) {
          pushNotification(s.game, `Auto-Furnished ${placed} items (desks, amenities, power & cooling).`, 'good');
        } else {
          pushNotification(s.game, 'Lab layout is already balanced and furnished!', 'info');
        }
      });
      audioManager.play(placed > 0 ? 'place' : 'click');
    },

    updateSettings: (patch) => {
      if (patch.muted !== undefined) {
        audioManager.setMuted(patch.muted);
      }
      set((s) => {
        Object.assign(s.game.settings, patch);
      });
      audioManager.play('click');
    },

    toggleMuteTrainingPopups: () => {
      audioManager.play('click');
      set((s) => {
        s.muteTrainingPopups = !s.muteTrainingPopups;
        if (s.muteTrainingPopups) {
          s.trainingResultModelId = null;
        }
      });
    },

    saveNow: () => {
      const st = get();
      writeSaveToStorage(st.game, st.activeSaveSlot);
      set((s) => {
        s.hasExistingSave = true;
        s.saveSlotsNonce += 1;
        s.game.lastSavedAtMs = Date.now();
        pushNotification(s.game, `"${s.game.labName}" saved.`, 'info');
      });
      audioManager.play('click');
    },

    resetSave: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(SAVE_STORAGE_KEY);
      }
      get().startNewLab();
    },

    setCameraBounds: (bounds) => {
      set((s) => {
        s.cameraBounds = bounds;
      });
    },

    jumpCameraTo: (x, z) => {
      set((s) => {
        s.cameraJumpTarget = { x, z, nonce: (s.cameraJumpTarget?.nonce ?? 0) + 1 };
      });
    },

    triggerCameraCommand: (type) => {
      audioManager.play('click');
      set((s) => {
        s.cameraCommand = { type, nonce: (s.cameraCommand?.nonce ?? 0) + 1 };
      });
    },

    toggleDebug: () => {
      set((s) => {
        s.debugOpen = !s.debugOpen;
      });
    },

    dismissOfflineSummary: () => {
      audioManager.play('click');
      set((s) => {
        s.offlineSummary = null;
      });
    },

    dismissTrainingResult: () => {
      audioManager.play('click');
      set((s) => {
        s.trainingResultModelId = null;
        s.game.lastCompletedModelId = null;
      });
    },

    dismissEventOutcome: () => {
      audioManager.play('click');
      set((s) => {
        s.lastEventOutcome = null;
      });
    },

    debugAddCash: (amount) => {
      audioManager.play('cash');
      set((s) => {
        s.game.cash += amount;
        pushNotification(s.game, `[Debug] Added $${amount.toLocaleString()}`, 'info');
      });
    },

    debugAddCompute: (amount) => {
      audioManager.play('research');
      set((s) => {
        s.game.bonusCompute += amount;
        pushNotification(s.game, `[Debug] Added +${amount} TF bonus compute`, 'info');
      });
    },

    debugSkipDays: (days) => {
      audioManager.play('click');
      set((s) => {
        const realSec = days * BALANCE.realSecondsPerGameDay;
        const steps = Math.max(10, Math.min(180, Math.ceil(days / 2)));
        const stepSec = realSec / steps;
        for (let i = 0; i < steps; i++) {
          stepSimulation(s.game, stepSec, { allowEvents: false, ignoreSpeed: true });
        }
        pushNotification(s.game, `[Debug] Skipped ${days} days to ${s.game.year}`, 'info');
      });
    },

    debugTriggerEvent: () => {
      audioManager.play('alert');
      set((s) => {
        triggerRandomEventNow(s.game);
      });
    },

    debugUnlockAllTechs: () => {
      audioManager.play('research');
      set((s) => {
        s.game.eraIndex = ERAS.length - 1;
        s.game.unlockedTechs = TECH_NODES.map((t) => t.id);
        s.game.reputation = Math.max(s.game.reputation, 95);
        pushNotification(s.game, '[Debug] Unlocked all eras (2010-2100) & research nodes.', 'good');
      });
    },

    debugSpawnStaffBatch: (count) => {
      audioManager.play('hire');
      set((s) => {
        for (let i = 0; i < count; i++) {
          const member = generateCandidate(s.game);
          member.x = 10 + ((i * 7) % 8) + 0.5;
          member.z = 12 + ((i * 3) % 7) + 0.5;
          member.targetX = member.x;
          member.targetZ = member.z;
          s.game.staff.push(member);
        }
        pushNotification(
          s.game,
          `[Debug] Spawned ${count} voxel staff (${s.game.staff.length} total).`,
          'info',
        );
      });
    },

    toggleCheatMenu: () => {
      audioManager.play('click');
      set((s) => {
        s.cheatMenuOpen = !s.cheatMenuOpen;
      });
    },

    closeCheatMenu: () => {
      audioManager.play('click');
      set((s) => {
        s.cheatMenuOpen = false;
      });
    },

    cheatAddCash: (amount) => {
      audioManager.play('cash');
      set((s) => {
        s.game.cash += amount;
        pushNotification(s.game, `Granted +$${amount.toLocaleString()} cash.`, 'good');
      });
    },

    cheatSetCash: (amount) => {
      audioManager.play('cash');
      set((s) => {
        s.game.cash = amount;
        pushNotification(s.game, `Treasury set to $${amount.toLocaleString()}.`, 'good');
      });
    },

    cheatAddCompute: (amount) => {
      audioManager.play('research');
      set((s) => {
        s.game.bonusCompute += amount;
        pushNotification(s.game, `Added +${amount.toLocaleString()} TF compute grant.`, 'good');
      });
    },

    cheatAddGridPower: (contracts) => {
      audioManager.play('research');
      set((s) => {
        s.game.extraGridPowerContracts += contracts;
        pushNotification(s.game, `Added +${contracts * 25} kW utility grid power.`, 'good');
      });
    },

    cheatMaxMetrics: () => {
      audioManager.play('cash');
      set((s) => {
        s.game.reputation = 100;
        s.game.hype = 100;
        s.game.safety = 100;
        pushNotification(s.game, 'Reputation, Hype & Safety maxed to 100.', 'good');
      });
    },

    cheatCompleteAllTraining: () => {
      let finishedModelId: string | null = null;
      set((s) => {
        if (s.game.trainingJobs.length === 0) {
          pushNotification(s.game, 'No active training runs to finish.', 'info');
          return;
        }
        s.game.lastCompletedModelId = null;
        const res = computeResources(s.game);
        stepTrainingJobs(s.game, 5000, 1, res.researchBonusPct);
        if (s.game.lastCompletedModelId) {
          finishedModelId = s.game.lastCompletedModelId;
          if (!s.game.automation.autoQueueTraining && !s.muteTrainingPopups) {
            s.trainingResultModelId = finishedModelId;
          }
          s.game.lastCompletedModelId = null;
        }
      });
      audioManager.play(finishedModelId ? 'train_complete' : 'click');
    },

    cheatUnlockAllResearchAndData: () => {
      audioManager.play('research');
      set((s) => {
        s.game.eraIndex = Math.max(s.game.eraIndex, ERAS.length - 1);
        s.game.unlockedTechs = TECH_NODES.map((t) => t.id);
        s.game.ownedDatasets = DATASETS.map((d) => d.id);
        s.game.reputation = Math.max(s.game.reputation, 98);
        pushNotification(s.game, 'Unlocked all Eras (2010–2100), Architectures & Datasets.', 'good');
      });
    },

    cheatMaxStaffMood: () => {
      audioManager.play('hire');
      set((s) => {
        for (const m of s.game.staff) {
          m.mood = 100;
          m.energy = 100;
        }
        pushNotification(s.game, 'All staff restored to 100% Mood & Energy.', 'good');
      });
    },

    cheatMaxAllStaffSkill: () => {
      audioManager.play('hire');
      set((s) => {
        for (const m of s.game.staff) {
          m.skill = 10;
          m.mood = 100;
          m.energy = 100;
        }
        pushNotification(s.game, 'Upgraded every staff member to Lv.10 with 100% Mood & Energy!', 'good');
      });
    },

    cheatSpawnGeniuses: (count) => {
      audioManager.play('hire');
      set((s) => {
        for (let i = 0; i < count; i++) {
          const member = generateCandidate(s.game);
          member.skill = 10;
          member.mood = 100;
          member.energy = 100;
          member.x = 10 + ((i * 3) % 8) + 0.5;
          member.z = 12 + ((i * 2) % 7) + 0.5;
          member.targetX = member.x;
          member.targetZ = member.z;
          s.game.staff.push(member);
        }
        if (s.game.automation.autoFurnish) {
          autoFurnishLab(s.game, { free: true });
        }
        pushNotification(s.game, `Recruited ${count} Lv.10 genius staff!`, 'good');
      });
    },

    cheatFillCampusWithGeniuses: () => {
      audioManager.play('hire');
      set((s) => {
        fillCampusWithGeniuses(s.game);
      });
    },

    cheatJumpToFrontierEra: () => {
      get().cheatJumpToEra(4);
    },

    cheatJumpToEra: (eraIndex) => {
      audioManager.play('research');
      set((s) => {
        const clamped = Math.max(0, Math.min(ERAS.length - 1, eraIndex));
        const targetEra = ERAS[clamped];
        s.game.eraIndex = clamped;
        s.game.year = targetEra.startYear;
        s.game.month = 1;
        s.game.dayOfMonth = 1;
        s.game.totalDays = (targetEra.startYear - BALANCE.startYear) * 365;
        pushNotification(
          s.game,
          `Timeline jumped to ${targetEra.startYear} — Era ${clamped + 1}: ${targetEra.name}!`,
          'good',
        );
      });
    },

    cheatMaxBuildingAndDataCenter: () => {
      audioManager.play('cash');
      set((s) => {
        applyMaxHyperscaleHQ(s.game);
      });
    },

    cheatUnlockAllLand: () => {
      audioManager.play('cash');
      set((s) => {
        unlockAllCampusLand(s.game);
      });
    },

    cheatMaxAllStories: () => {
      audioManager.play('cash');
      set((s) => {
        upgradeAllBuildingsToMaxStories(s.game);
      });
    },

    cheatMaxAllModels: () => {
      audioManager.play('train_complete');
      set((s) => {
        const count = maxAllTrainedModels(s.game);
        if (count > 0) {
          pushNotification(s.game, `Boosted ${count} trained model(s) to 100/100 across all aspects!`, 'good');
        } else {
          pushNotification(s.game, 'No trained models yet — enable Unlimited Models for instant 100/100 runs!', 'info');
        }
      });
    },

    cheatTogglePerfectModels: () => {
      audioManager.play('research');
      set((s) => {
        s.game.cheatPerfectModels = !s.game.cheatPerfectModels;
        if (s.game.cheatPerfectModels) {
          maxAllTrainedModels(s.game);
          pushNotification(s.game, 'Perfect 100/100 Model Quality enabled across all benchmark aspects!', 'good');
        }
      });
    },

    cheatToggleUnlimitedCompute: () => {
      audioManager.play('research');
      set((s) => {
        s.game.cheatUnlimitedCompute = !s.game.cheatUnlimitedCompute;
        pushNotification(
          s.game,
          s.game.cheatUnlimitedCompute
            ? 'UNLIMITED COMPUTE (∞ TF) ACTIVE! Zero compute caps or throttling!'
            : 'Unlimited Compute disabled.',
          s.game.cheatUnlimitedCompute ? 'good' : 'info',
        );
      });
    },

    cheatToggleUnlimitedPower: () => {
      audioManager.play('research');
      set((s) => {
        s.game.cheatUnlimitedPower = !s.game.cheatUnlimitedPower;
        pushNotification(
          s.game,
          s.game.cheatUnlimitedPower
            ? 'UNLIMITED POWER & COOLING (∞) ACTIVE! Zero power bills or overheating!'
            : 'Unlimited Power & Cooling disabled.',
          s.game.cheatUnlimitedPower ? 'good' : 'info',
        );
      });
    },

    cheatToggleUnlimitedModels: () => {
      audioManager.play('train_complete');
      set((s) => {
        s.game.cheatUnlimitedModels = !s.game.cheatUnlimitedModels;
        if (s.game.cheatUnlimitedModels) {
          s.game.cheatPerfectModels = true;
          maxAllTrainedModels(s.game);
        }
        pushNotification(
          s.game,
          s.game.cheatUnlimitedModels
            ? 'UNLIMITED MODELS ACTIVE! Up to 12 concurrent runs, 100/100 quality & ultra-speed!'
            : 'Unlimited Models disabled.',
          s.game.cheatUnlimitedModels ? 'good' : 'info',
        );
      });
    },

    cheatToggleFreeBuild: () => {
      audioManager.play('click');
      set((s) => {
        s.game.cheatFreeBuild = !s.game.cheatFreeBuild;
        pushNotification(
          s.game,
          s.game.cheatFreeBuild ? 'Free Build & Zero Upkeep enabled!' : 'Free Build disabled.',
          'info',
        );
      });
    },

    cheatToggleGodMood: () => {
      audioManager.play('click');
      set((s) => {
        s.cheatGodMood = !s.cheatGodMood;
        if (s.cheatGodMood) {
          for (const m of s.game.staff) {
            m.mood = 100;
            m.energy = 100;
          }
        }
      });
    },

    cheatToggleHyperTraining: () => {
      audioManager.play('click');
      set((s) => {
        s.cheatHyperTraining = !s.cheatHyperTraining;
      });
    },

    cheatToggleFreeCash: () => {
      audioManager.play('cash');
      set((s) => {
        s.cheatFreeCash = !s.cheatFreeCash;
        if (s.cheatFreeCash) {
          s.game.cash = Math.max(s.game.cash, 999_999_999);
        }
      });
    },
  })),
);

export function useResourceSnapshot() {
  const game = useGameStore((s) => s.game);
  return computeResources(game);
}
