/**
 * Modal system for Random Lab Events, Model Training Benchmark Results (with stuck-loop fix),
 * Offline Progress Welcome-Back summary, and Upgraded Centered Pause Menu (Save/Load, Settings, New Lab).
 */

import { useState } from 'react';
import { GAME_EVENTS } from '../data/events';
import { ERAS } from '../data/techs';
import { listSaveSlots, RANDOM_LAB_NAMES, type SaveSlotId } from '../sim/save';
import { useGameStore } from '../store/useGameStore';

type PauseView = 'main' | 'save_load' | 'new_lab';

function formatCompactCash(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function Modals() {
  const screen = useGameStore((s) => s.screen);
  const game = useGameStore((s) => s.game);
  const saveSlotsNonce = useGameStore((s) => s.saveSlotsNonce);
  const offlineSummary = useGameStore((s) => s.offlineSummary);
  const trainingResultModelId = useGameStore((s) => s.trainingResultModelId);
  const lastEventOutcome = useGameStore((s) => s.lastEventOutcome);

  const setScreen = useGameStore((s) => s.setScreen);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const saveNow = useGameStore((s) => s.saveNow);
  const saveToSlot = useGameStore((s) => s.saveToSlot);
  const loadSaveSlot = useGameStore((s) => s.loadSaveSlot);
  const startNewLab = useGameStore((s) => s.startNewLab);
  const chooseEventOption = useGameStore((s) => s.chooseEventOption);
  const dismissOfflineSummary = useGameStore((s) => s.dismissOfflineSummary);
  const dismissTrainingResult = useGameStore((s) => s.dismissTrainingResult);
  const toggleMuteTrainingPopups = useGameStore((s) => s.toggleMuteTrainingPopups);
  const dismissEventOutcome = useGameStore((s) => s.dismissEventOutcome);
  const shipModel = useGameStore((s) => s.shipModel);

  const [pauseView, setPauseView] = useState<PauseView>('main');
  const [newLabName, setNewLabName] = useState('NovaMind Foundry');
  const [newLabSlot, setNewLabSlot] = useState<SaveSlotId>('slot_1');
  const [nameError, setNameError] = useState('');

  // 1. Centered Pause Menu Modal (with Save/Load, Settings & Named New Startup!)
  if (screen === 'paused') {
    void saveSlotsNonce;
    const slots = listSaveSlots();
    const buildingCount = 1 + (game.ownedLandIds?.length ?? 0);

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Game paused"
        className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#14121d]/75 p-3 sm:p-4"
      >
        <div className="pixel-frame-gold w-full max-w-md max-h-[90dvh] overflow-y-auto pixel-scroll p-4 sm:p-5 text-center">
          <h2 className="font-pixel-display text-lg sm:text-xl text-[#ffe478] mb-0.5">
            {pauseView === 'save_load'
              ? 'SAVE & LOAD LABS'
              : pauseView === 'new_lab'
                ? 'FOUND NEW AI LAB'
                : 'GAME MENU'}
          </h2>
          <p className="text-[11px] sm:text-xs text-[#b8c0cf] mb-3.5 tabular-nums">
            {game.labName} · Year {game.year} · {buildingCount}/6 Bldgs · {formatCompactCash(game.cash)}
          </p>

          {pauseView === 'main' && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setPauseView('main');
                  setScreen('playing');
                }}
                className="pixel-btn-gold py-2 font-pixel-display text-sm"
              >
                Resume Lab
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    saveNow();
                    setScreen('playing');
                  }}
                  className="pixel-btn-green py-2 font-pixel-display text-xs"
                >
                  Quick Save
                </button>
                <button
                  type="button"
                  onClick={() => setPauseView('save_load')}
                  data-testid="pause-save-load"
                  className="pixel-btn py-2 font-pixel-display text-xs"
                >
                  Load / Slots
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPauseView('main');
                    setScreen('playing');
                    setActiveDrawer('settings');
                  }}
                  data-testid="pause-settings"
                  className="pixel-btn py-2 font-pixel-display text-xs"
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => setPauseView('new_lab')}
                  data-testid="pause-new-startup"
                  className="pixel-btn py-2 font-pixel-display text-xs"
                >
                  New Startup
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  saveNow();
                  setPauseView('main');
                  setScreen('title');
                }}
                className="pixel-btn-red py-2 font-pixel-display text-xs"
              >
                Save &amp; Return to Title
              </button>
            </div>
          )}

          {pauseView === 'save_load' && (
            <div className="space-y-2 text-left">
              <div className="space-y-1.5 max-h-[210px] overflow-y-auto pixel-scroll pr-1">
                {slots.map((slot) => {
                  const era = slot.eraIndex !== undefined ? ERAS[slot.eraIndex] : null;
                  return (
                    <div
                      key={slot.slotId}
                      className="pixel-inset px-2.5 py-1.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="font-pixel-display text-[10px] text-[#ffe478] uppercase">
                            {slot.label}
                          </span>
                          {slot.exists && (
                            <span className="text-xs font-semibold text-[#faf7eb] truncate">
                              {slot.labName}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#b8c0cf] truncate">
                          {slot.exists
                            ? `${slot.year} · ${era?.name ?? 'Garage'} · ${slot.buildingCount ?? 1}/6 Bldgs`
                            : 'Empty save slot'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => saveToSlot(slot.slotId)}
                          className="pixel-btn-gold px-2 py-1 text-[10px] font-pixel-display"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          disabled={!slot.exists}
                          onClick={() => {
                            setPauseView('main');
                            loadSaveSlot(slot.slotId);
                          }}
                          className={`px-2 py-1 text-[10px] font-pixel-display ${
                            slot.exists ? 'pixel-btn-green' : 'pixel-btn'
                          }`}
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setPauseView('main')}
                className="pixel-btn w-full py-1.5 font-pixel-display text-xs"
              >
                Back to Menu
              </button>
            </div>
          )}

          {pauseView === 'new_lab' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newLabName.trim();
                if (trimmed.length < 2) {
                  setNameError('Enter at least 2 characters for your AI Lab name.');
                  return;
                }
                setNameError('');
                setPauseView('main');
                startNewLab(trimmed, newLabSlot);
              }}
              className="space-y-2.5 text-left"
            >
              <div>
                <label
                  htmlFor="pause-lab-name"
                  className="block font-pixel-display text-[10px] text-[#ffe478] mb-1"
                >
                  NEW AI LAB NAME
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="pause-lab-name"
                    type="text"
                    maxLength={28}
                    value={newLabName}
                    onChange={(e) => {
                      setNewLabName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    className="pixel-inset flex-1 min-w-0 px-2.5 py-1.5 text-xs text-[#faf7eb] focus:outline-none focus:border-[#ffe478]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const pick =
                        RANDOM_LAB_NAMES[Math.floor(Math.random() * RANDOM_LAB_NAMES.length)];
                      setNewLabName(pick);
                      setNameError('');
                    }}
                    className="pixel-btn px-2 py-1 text-[10px] font-pixel-display"
                  >
                    Random
                  </button>
                </div>
                {nameError && <p className="text-[11px] text-[#f59876] mt-1">{nameError}</p>}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(['slot_1', 'slot_2', 'slot_3'] as const).map((sid, i) => (
                  <button
                    key={sid}
                    type="button"
                    onClick={() => setNewLabSlot(sid)}
                    className={`py-1 text-[10px] font-pixel-display ${
                      newLabSlot === sid ? 'pixel-btn-gold' : 'pixel-btn'
                    }`}
                  >
                    Slot {i + 1}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPauseView('main')}
                  className="pixel-btn px-3 py-1.5 font-pixel-display text-xs"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="pixel-btn-gold flex-1 py-1.5 font-pixel-display text-xs"
                >
                  Launch Startup
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // 2. Offline Idle Progress Welcome-Back Modal
  if (offlineSummary) {
    const mins = Math.round(offlineSummary.elapsedRealSeconds / 60);
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Offline progress report"
        className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#14121d]/75 p-4"
      >
        <div className="pixel-frame-gold w-full max-w-md p-5">
          <h2 className="font-pixel-display text-lg text-[#ffe478] mb-1">
            Welcome Back to {game.labName}
          </h2>
          <p className="text-xs text-[#b8c0cf] mb-4">
            While you were away for {mins} min, your researchers kept the clusters humming.
          </p>
          <div className="grid grid-cols-3 gap-2 mb-4 text-center tabular-nums">
            <div className="pixel-inset p-2">
              <div className="text-[10px] text-[#8c96ab] uppercase">Days Sim</div>
              <div className="font-pixel-display text-sm text-[#8de4ff]">
                +{offlineSummary.simulatedGameDays}
              </div>
            </div>
            <div className="pixel-inset p-2">
              <div className="text-[10px] text-[#8c96ab] uppercase">Net Cash</div>
              <div className="font-pixel-display text-sm text-[#8ce063]">
                {offlineSummary.cashEarned >= 0 ? '+' : ''}${offlineSummary.cashEarned.toLocaleString()}
              </div>
            </div>
            <div className="pixel-inset p-2">
              <div className="text-[10px] text-[#8c96ab] uppercase">Models</div>
              <div className="font-pixel-display text-sm text-[#ffe478]">
                +{offlineSummary.modelsCompleted}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissOfflineSummary}
            className="pixel-btn-gold w-full py-2 font-pixel-display text-sm"
          >
            Back to Work
          </button>
        </div>
      </div>
    );
  }

  // 3. Active Random Event Choice Modal
  if (game.activeEvent) {
    const def = GAME_EVENTS.find((e) => e.id === game.activeEvent!.eventId);
    if (def) {
      return (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={def.title}
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#14121d]/75 p-4"
        >
          <div className="pixel-frame-gold w-full max-w-md p-5">
            <div className="text-[11px] font-pixel-display text-[#f59876] uppercase mb-1">
              Lab Incident · {def.category}
            </div>
            <h2 className="font-pixel-display text-lg text-[#ffe478] mb-2">
              {def.title}
            </h2>
            <p className="text-sm text-[#e6e2d3] leading-relaxed mb-4">
              {def.description}
            </p>
            <div className="space-y-2">
              {def.choices.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => chooseEventOption(c.id)}
                  className="pixel-btn w-full text-left px-3 py-2.5 text-xs font-pixel-display"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }

  // 4. Event Outcome Confirmation
  if (lastEventOutcome) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Event outcome"
        className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#14121d]/70 p-4"
      >
        <div className="pixel-frame w-full max-w-sm p-4">
          <h3 className="font-pixel-display text-sm text-[#8de4ff] mb-2">
            Decision Logged
          </h3>
          <p className="text-sm text-[#e6e2d3] mb-4">{lastEventOutcome}</p>
          <button
            type="button"
            onClick={dismissEventOutcome}
            className="pixel-btn-gold w-full py-1.5 font-pixel-display text-xs"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // 5. Model Training Completed Benchmark Report Modal (sim pauses while open + clean X/backdrop dismiss)
  if (trainingResultModelId) {
    const model = game.models.find((m) => m.id === trainingResultModelId);
    if (!model) {
      dismissTrainingResult();
      return null;
    }
    const bars: Array<[string, number, string]> = [
      ['Reasoning', model.benchmarks.reasoning, '#4ea8de'],
      ['Coding', model.benchmarks.coding, '#8ce063'],
      ['Multimodal', model.benchmarks.multimodal, '#9966cc'],
      ['Safety', model.benchmarks.safety, '#e6b84c'],
    ];

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Model training complete"
        data-testid="training-complete-modal"
        onClick={(e) => {
          if (e.target === e.currentTarget) dismissTrainingResult();
        }}
        className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#14121d]/75 p-3 sm:p-4"
      >
        <div className="pixel-frame-gold w-full max-w-md max-h-[92dvh] overflow-y-auto pixel-scroll p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-pixel-display text-[#8ce063] uppercase">
              Training Complete
            </div>
            <button
              type="button"
              onClick={dismissTrainingResult}
              aria-label="Close training complete modal"
              data-testid="training-modal-close"
              className="pixel-btn px-2 py-0.5 text-[11px] font-pixel-display"
            >
              X
            </button>
          </div>
          <div className="flex items-baseline justify-between mt-1 mb-3">
            <h2 className="font-pixel-display text-base sm:text-lg text-[#ffe478] truncate pr-2">
              {model.name}
            </h2>
            <span className="font-pixel-display text-lg sm:text-xl text-[#8de4ff] tabular-nums shrink-0">
              {model.benchmarks.overall}/100
            </span>
          </div>

          <div className="pixel-inset p-3 space-y-2 mb-3.5">
            {bars.map(([label, score, color]) => (
              <div key={label} className="text-xs">
                <div className="flex justify-between tabular-nums mb-0.5">
                  <span className="text-[#b8c0cf]">{label}</span>
                  <span className="font-pixel-display text-[#faf7eb]">{score}</span>
                </div>
                <div className="h-2.5 bg-[#1f2233] border border-[#45506b]">
                  <div
                    className="h-full"
                    style={{ width: `${score}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!model.shipped && (
              <button
                type="button"
                data-testid="training-modal-ship"
                onClick={() => {
                  shipModel(model.id);
                  dismissTrainingResult();
                }}
                className="pixel-btn-green flex-1 py-2 font-pixel-display text-xs"
              >
                Ship as API Product
              </button>
            )}
            <button
              type="button"
              data-testid="training-modal-keep"
              onClick={dismissTrainingResult}
              className="pixel-btn flex-1 py-2 font-pixel-display text-xs"
            >
              Keep in Library
            </button>
          </div>

          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={toggleMuteTrainingPopups}
              className="text-[10px] text-[#8c96ab] hover:text-[#ffe478] underline cursor-pointer"
            >
              Hide training popups (log in notifications instead)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
