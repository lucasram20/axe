/**
 * Secret Cheat Menu — hidden from normal UI and toggled exclusively via a private keyboard chord.
 * Styled in the app's ornate 9-slice pixel-art gold frame (zero backdrop-filter over WebGL).
 */

import { useGameStore } from '../store/useGameStore';

export function CheatMenu() {
  const open = useGameStore((s) => s.cheatMenuOpen);
  const closeCheatMenu = useGameStore((s) => s.closeCheatMenu);

  const cash = useGameStore((s) => s.game.cash);
  const bonusCompute = useGameStore((s) => s.game.bonusCompute);
  const staffCount = useGameStore((s) => s.game.staff.length);
  const activeJobs = useGameStore((s) => s.game.trainingJobs.length);

  const cheatGodMood = useGameStore((s) => s.cheatGodMood);
  const cheatHyperTraining = useGameStore((s) => s.cheatHyperTraining);
  const cheatFreeCash = useGameStore((s) => s.cheatFreeCash);

  const cheatAddCash = useGameStore((s) => s.cheatAddCash);
  const cheatSetCash = useGameStore((s) => s.cheatSetCash);
  const cheatAddCompute = useGameStore((s) => s.cheatAddCompute);
  const cheatAddGridPower = useGameStore((s) => s.cheatAddGridPower);
  const cheatMaxMetrics = useGameStore((s) => s.cheatMaxMetrics);
  const cheatCompleteAllTraining = useGameStore((s) => s.cheatCompleteAllTraining);
  const cheatUnlockAllResearchAndData = useGameStore((s) => s.cheatUnlockAllResearchAndData);
  const cheatMaxStaffMood = useGameStore((s) => s.cheatMaxStaffMood);
  const cheatSpawnGeniuses = useGameStore((s) => s.cheatSpawnGeniuses);
  const cheatJumpToFrontierEra = useGameStore((s) => s.cheatJumpToFrontierEra);
  const debugSkipDays = useGameStore((s) => s.debugSkipDays);
  const cheatToggleGodMood = useGameStore((s) => s.cheatToggleGodMood);
  const cheatToggleHyperTraining = useGameStore((s) => s.cheatToggleHyperTraining);
  const cheatToggleFreeCash = useGameStore((s) => s.cheatToggleFreeCash);

  if (!open) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#14121d]/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Founder Vault"
      data-testid="cheat-menu"
    >
      <div className="pixel-frame-gold w-[490px] max-w-full max-h-[86vh] overflow-y-auto p-3.5 text-[#f8f0df]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#47424d] pb-2 mb-3">
          <div>
            <div className="font-pixel-display text-sm text-[#ffe478] tracking-wide">
              FOUNDER VAULT // OVERRIDE
            </div>
            <div className="text-[11px] text-[#b0a89f] tabular-nums">
              Cash: ${Math.floor(cash).toLocaleString()} · Bonus Compute: +{bonusCompute.toLocaleString()} TF · Staff: {staffCount}
            </div>
          </div>
          <button
            type="button"
            onClick={closeCheatMenu}
            data-testid="cheat-close"
            className="pixel-btn pixel-btn-red px-2.5 py-1 text-xs font-pixel-display"
          >
            X
          </button>
        </div>

        {/* Section 1: Treasury */}
        <div className="pixel-inset p-2.5 mb-2.5">
          <div className="font-pixel-display text-[11px] text-[#ffe478] mb-1.5">
            TREASURY & CAPITAL
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => cheatAddCash(100_000)}
              data-testid="cheat-cash-100k"
              className="pixel-btn pixel-btn-gold py-1.5 text-xs font-pixel-display"
            >
              +$100K
            </button>
            <button
              type="button"
              onClick={() => cheatAddCash(1_000_000)}
              data-testid="cheat-cash-1m"
              className="pixel-btn pixel-btn-gold py-1.5 text-xs font-pixel-display"
            >
              +$1M
            </button>
            <button
              type="button"
              onClick={() => cheatAddCash(10_000_000)}
              data-testid="cheat-cash-10m"
              className="pixel-btn pixel-btn-gold py-1.5 text-xs font-pixel-display"
            >
              +$10M
            </button>
            <button
              type="button"
              onClick={() => cheatSetCash(999_999_999)}
              data-testid="cheat-cash-max"
              className="pixel-btn pixel-btn-green py-1.5 text-xs font-pixel-display"
            >
              Set $999M
            </button>
          </div>
        </div>

        {/* Section 2: Compute, Power & Lab Metrics */}
        <div className="pixel-inset p-2.5 mb-2.5">
          <div className="font-pixel-display text-[11px] text-[#b0e2f7] mb-1.5">
            COMPUTE, POWER & REPUTATION
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => cheatAddCompute(500)}
              data-testid="cheat-compute-500"
              className="pixel-btn py-1.5 text-xs font-pixel-display"
            >
              +500 TF Compute
            </button>
            <button
              type="button"
              onClick={() => cheatAddCompute(5_000)}
              data-testid="cheat-compute-5000"
              className="pixel-btn py-1.5 text-xs font-pixel-display"
            >
              +5,000 TF Compute
            </button>
            <button
              type="button"
              onClick={() => cheatAddGridPower(4)}
              data-testid="cheat-power-100"
              className="pixel-btn py-1.5 text-xs font-pixel-display"
            >
              +100 kW Grid Power
            </button>
            <button
              type="button"
              onClick={cheatMaxMetrics}
              data-testid="cheat-max-metrics"
              className="pixel-btn pixel-btn-gold py-1.5 text-xs font-pixel-display"
            >
              Max Rep/Hype/Safety
            </button>
          </div>
        </div>

        {/* Section 3: Research, Datasets & Timeline */}
        <div className="pixel-inset p-2.5 mb-2.5">
          <div className="font-pixel-display text-[11px] text-[#99db5c] mb-1.5">
            RESEARCH, TRAINING & TIMELINE
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={cheatCompleteAllTraining}
              data-testid="cheat-finish-training"
              className="pixel-btn pixel-btn-green py-1.5 text-xs font-pixel-display"
            >
              Finish Training ({activeJobs})
            </button>
            <button
              type="button"
              onClick={cheatUnlockAllResearchAndData}
              data-testid="cheat-unlock-all"
              className="pixel-btn pixel-btn-gold py-1.5 text-xs font-pixel-display"
            >
              Unlock All Tech & Data
            </button>
            <button
              type="button"
              onClick={() => debugSkipDays(180)}
              data-testid="cheat-skip-180"
              className="pixel-btn py-1.5 text-xs font-pixel-display"
            >
              Skip +180 Days
            </button>
            <button
              type="button"
              onClick={cheatJumpToFrontierEra}
              data-testid="cheat-frontier-era"
              className="pixel-btn py-1.5 text-xs font-pixel-display"
            >
              Jump to 2025 Frontier
            </button>
          </div>
        </div>

        {/* Section 4: Staff */}
        <div className="pixel-inset p-2.5 mb-2.5">
          <div className="font-pixel-display text-[11px] text-[#f0a684] mb-1.5">
            LAB STAFF
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={cheatMaxStaffMood}
              data-testid="cheat-refill-mood"
              className="pixel-btn py-1.5 text-xs font-pixel-display"
            >
              Refill Mood & Energy
            </button>
            <button
              type="button"
              onClick={() => cheatSpawnGeniuses(5)}
              data-testid="cheat-spawn-geniuses"
              className="pixel-btn pixel-btn-green py-1.5 text-xs font-pixel-display"
            >
              Spawn 5 Lv.10 Geniuses
            </button>
          </div>
        </div>

        {/* Section 5: Live Toggles */}
        <div className="pixel-inset p-2.5">
          <div className="font-pixel-display text-[11px] text-[#ffe478] mb-1.5">
            LIVE OVERRIDES
          </div>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={cheatToggleFreeCash}
              data-testid="cheat-toggle-free-cash"
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-pixel-display pixel-btn ${
                cheatFreeCash ? 'pixel-btn-green' : ''
              }`}
            >
              <span>Infinite Cash ($999M Floor)</span>
              <span>{cheatFreeCash ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={cheatToggleHyperTraining}
              data-testid="cheat-toggle-hyper-train"
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-pixel-display pixel-btn ${
                cheatHyperTraining ? 'pixel-btn-green' : ''
              }`}
            >
              <span>10x Hyper Training Speed</span>
              <span>{cheatHyperTraining ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={cheatToggleGodMood}
              data-testid="cheat-toggle-god-mood"
              className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-pixel-display pixel-btn ${
                cheatGodMood ? 'pixel-btn-green' : ''
              }`}
            >
              <span>Locked 100% Staff Mood & Energy</span>
              <span>{cheatGodMood ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
