/**
 * Developer Debug Panel (hidden by default; toggled via backtick ` key or Settings).
 */

import { useGameStore } from '../store/useGameStore';

export function DebugPanel() {
  const debugOpen = useGameStore((s) => s.debugOpen);
  const toggleDebug = useGameStore((s) => s.toggleDebug);
  const debugAddCash = useGameStore((s) => s.debugAddCash);
  const debugAddCompute = useGameStore((s) => s.debugAddCompute);
  const debugSkipDays = useGameStore((s) => s.debugSkipDays);
  const debugTriggerEvent = useGameStore((s) => s.debugTriggerEvent);
  const debugUnlockAllTechs = useGameStore((s) => s.debugUnlockAllTechs);
  const debugSpawnStaffBatch = useGameStore((s) => s.debugSpawnStaffBatch);
  const staffCount = useGameStore((s) => s.game.staff.length);

  if (!debugOpen) return null;

  return (
    <aside
      aria-label="Debug tools"
      className="pointer-events-auto fixed top-[64px] left-3 z-30 w-[260px] pixel-frame p-3"
    >
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b-2 border-[#2e344b]">
        <span className="font-pixel-display text-xs text-[#f59876]">
          DEBUG CONSOLE (`)
        </span>
        <button
          type="button"
          onClick={toggleDebug}
          className="pixel-btn px-1.5 py-0.5 text-[10px] font-pixel-display"
        >
          X
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <button
          type="button"
          onClick={() => debugAddCash(100_000)}
          className="pixel-btn-gold py-1.5 font-pixel-display"
        >
          +$100K
        </button>
        <button
          type="button"
          onClick={() => debugAddCompute(200)}
          className="pixel-btn py-1.5 font-pixel-display"
        >
          +200 TF
        </button>
        <button
          type="button"
          onClick={() => debugSkipDays(30)}
          className="pixel-btn py-1.5 font-pixel-display"
        >
          +30 Days
        </button>
        <button
          type="button"
          onClick={() => debugSkipDays(360)}
          className="pixel-btn py-1.5 font-pixel-display"
        >
          +1 Year
        </button>
        <button
          type="button"
          onClick={debugTriggerEvent}
          className="pixel-btn py-1.5 font-pixel-display"
        >
          Trigger Event
        </button>
        <button
          type="button"
          onClick={debugUnlockAllTechs}
          className="pixel-btn-green py-1.5 font-pixel-display"
        >
          Unlock All
        </button>
        <button
          type="button"
          onClick={() => debugSpawnStaffBatch(25)}
          className="pixel-btn col-span-2 py-1.5 font-pixel-display"
        >
          +25 Instanced Staff ({staffCount})
        </button>
      </div>
    </aside>
  );
}
