/**
 * Modal system for Random Lab Events, Model Training Benchmark Results,
 * Offline Progress Welcome-Back summary, and Pause Menu.
 */

import { GAME_EVENTS } from '../data/events';
import { useGameStore } from '../store/useGameStore';

export function Modals() {
  const screen = useGameStore((s) => s.screen);
  const game = useGameStore((s) => s.game);
  const offlineSummary = useGameStore((s) => s.offlineSummary);
  const trainingResultModelId = useGameStore((s) => s.trainingResultModelId);
  const lastEventOutcome = useGameStore((s) => s.lastEventOutcome);

  const setScreen = useGameStore((s) => s.setScreen);
  const saveNow = useGameStore((s) => s.saveNow);
  const startNewLab = useGameStore((s) => s.startNewLab);
  const chooseEventOption = useGameStore((s) => s.chooseEventOption);
  const dismissOfflineSummary = useGameStore((s) => s.dismissOfflineSummary);
  const dismissTrainingResult = useGameStore((s) => s.dismissTrainingResult);
  const dismissEventOutcome = useGameStore((s) => s.dismissEventOutcome);
  const shipModel = useGameStore((s) => s.shipModel);

  // 1. Pause Modal
  if (screen === 'paused') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Game paused"
        className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#14121d]/75 p-4"
      >
        <div className="pixel-frame-gold w-full max-w-sm p-5 text-center">
          <h2 className="font-pixel-display text-xl text-[#ffe478] mb-1">
            LAB PAUSED
          </h2>
          <p className="text-xs text-[#b8c0cf] mb-4 tabular-nums">
            {game.labName} · Year {game.year} · ${Math.round(game.cash).toLocaleString()}
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setScreen('playing')}
              className="pixel-btn-gold py-2 font-pixel-display text-sm"
            >
              Resume Lab
            </button>
            <button
              type="button"
              onClick={() => {
                saveNow();
                setScreen('playing');
              }}
              className="pixel-btn py-2 font-pixel-display text-xs"
            >
              Save & Resume
            </button>
            <button
              type="button"
              onClick={() => startNewLab()}
              className="pixel-btn py-2 font-pixel-display text-xs"
            >
              Restart Fresh Startup
            </button>
            <button
              type="button"
              onClick={() => {
                saveNow();
                setScreen('title');
              }}
              className="pixel-btn-red py-2 font-pixel-display text-xs"
            >
              Save & Return to Title
            </button>
          </div>
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
            Welcome Back to the Lab
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

  // 5. Model Training Completed Benchmark Report Modal
  if (trainingResultModelId) {
    const model = game.models.find((m) => m.id === trainingResultModelId);
    if (model) {
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
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-[#14121d]/75 p-4"
        >
          <div className="pixel-frame-gold w-full max-w-md p-5">
            <div className="text-[11px] font-pixel-display text-[#8ce063] uppercase">
              Training Complete
            </div>
            <div className="flex items-baseline justify-between mt-1 mb-3">
              <h2 className="font-pixel-display text-lg text-[#ffe478]">
                {model.name}
              </h2>
              <span className="font-pixel-display text-xl text-[#8de4ff] tabular-nums">
                {model.benchmarks.overall}/100
              </span>
            </div>

            <div className="pixel-inset p-3 space-y-2 mb-4">
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
                onClick={dismissTrainingResult}
                className="pixel-btn flex-1 py-2 font-pixel-display text-xs"
              >
                Keep in Library
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
}
