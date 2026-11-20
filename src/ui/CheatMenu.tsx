/**
 * Secret Founder Vault — hidden from normal UI and toggled exclusively via
 * Ctrl+Shift+L (desktop) or 5 rapid taps on the Date/Era readout (mobile).
 * Styled in the app's ornate 9-slice gold frame (zero backdrop-filter over WebGL).
 */

import { ERAS } from '../data/techs';
import { BUILDING_TIERS, getMaxCampusStories, LAND_PARCELS, MAX_BUILDING_STORIES } from '../sim/facility';
import { useGameStore } from '../store/useGameStore';

export function CheatMenu() {
  const open = useGameStore((s) => s.cheatMenuOpen);
  const closeCheatMenu = useGameStore((s) => s.closeCheatMenu);

  const game = useGameStore((s) => s.game);
  const cash = game.cash;
  const staffCount = game.staff.length;
  const activeJobs = game.trainingJobs.length;
  const eraIndex = game.eraIndex;
  const buildingTier = game.buildingTier ?? 0;
  const ownedLandCount = (game.ownedLandIds ?? []).length;
  const maxBuildings = 1 + LAND_PARCELS.length;
  const maxStories = getMaxCampusStories(game);

  const cheatPerfectModels = Boolean(game.cheatPerfectModels);
  const cheatFreeBuild = Boolean(game.cheatFreeBuild);
  const cheatUnlimitedCompute = Boolean(game.cheatUnlimitedCompute);
  const cheatUnlimitedPower = Boolean(game.cheatUnlimitedPower);
  const cheatUnlimitedModels = Boolean(game.cheatUnlimitedModels);

  const cheatGodMood = useGameStore((s) => s.cheatGodMood);
  const cheatHyperTraining = useGameStore((s) => s.cheatHyperTraining);
  const cheatFreeCash = useGameStore((s) => s.cheatFreeCash);

  const cheatAddCash = useGameStore((s) => s.cheatAddCash);
  const cheatSetCash = useGameStore((s) => s.cheatSetCash);
  const cheatMaxMetrics = useGameStore((s) => s.cheatMaxMetrics);
  const cheatCompleteAllTraining = useGameStore((s) => s.cheatCompleteAllTraining);
  const cheatUnlockAllResearchAndData = useGameStore((s) => s.cheatUnlockAllResearchAndData);
  const cheatMaxStaffMood = useGameStore((s) => s.cheatMaxStaffMood);
  const cheatMaxAllStaffSkill = useGameStore((s) => s.cheatMaxAllStaffSkill);
  const cheatFillCampusWithGeniuses = useGameStore((s) => s.cheatFillCampusWithGeniuses);
  const cheatJumpToEra = useGameStore((s) => s.cheatJumpToEra);
  const cheatMaxBuildingAndDataCenter = useGameStore((s) => s.cheatMaxBuildingAndDataCenter);
  const cheatUnlockAllLand = useGameStore((s) => s.cheatUnlockAllLand);
  const cheatMaxAllStories = useGameStore((s) => s.cheatMaxAllStories);
  const cheatMaxAllModels = useGameStore((s) => s.cheatMaxAllModels);
  const cheatToggleUnlimitedCompute = useGameStore((s) => s.cheatToggleUnlimitedCompute);
  const cheatToggleUnlimitedPower = useGameStore((s) => s.cheatToggleUnlimitedPower);
  const cheatToggleUnlimitedModels = useGameStore((s) => s.cheatToggleUnlimitedModels);
  const cheatTogglePerfectModels = useGameStore((s) => s.cheatTogglePerfectModels);
  const cheatToggleFreeBuild = useGameStore((s) => s.cheatToggleFreeBuild);
  const autoFurnishNow = useGameStore((s) => s.autoFurnishNow);
  const debugSkipDays = useGameStore((s) => s.debugSkipDays);
  const cheatToggleGodMood = useGameStore((s) => s.cheatToggleGodMood);
  const cheatToggleHyperTraining = useGameStore((s) => s.cheatToggleHyperTraining);
  const cheatToggleFreeCash = useGameStore((s) => s.cheatToggleFreeCash);

  if (!open) return null;

  const tierInfo = BUILDING_TIERS[buildingTier] ?? BUILDING_TIERS[0];

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#14121d]/80 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Founder Vault"
      data-testid="cheat-menu"
    >
      <div className="pixel-frame-gold w-[590px] max-w-full max-h-[92dvh] overflow-y-auto pixel-scroll p-2.5 sm:p-3.5 text-[#f8f0df]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#47424d] pb-2 mb-2.5">
          <div className="min-w-0">
            <div className="font-pixel-display text-xs sm:text-sm text-[#ffe478] tracking-wide">
              FOUNDER VAULT // OVERRIDE
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#b0a89f] tabular-nums truncate">
              ${Math.floor(cash).toLocaleString()} · HQ T{buildingTier + 1} ({tierInfo.name}) · {1 + ownedLandCount}/{maxBuildings} Bldgs · Max {maxStories}F · Staff {staffCount}
            </div>
          </div>
          <button
            type="button"
            onClick={closeCheatMenu}
            data-testid="cheat-close"
            className="pixel-btn pixel-btn-red px-2.5 py-1 text-xs font-pixel-display shrink-0"
          >
            X
          </button>
        </div>

        {/* Section 1: 15-Building Campus, Land & Multi-Story 6F Towers */}
        <div className="pixel-inset p-2 mb-2">
          <div className="font-pixel-display text-[10px] sm:text-[11px] text-[#8de4ff] mb-1.5">
            15-BUILDING CAMPUS, LAND &amp; MULTI-STORY TOWERS (1F–{MAX_BUILDING_STORIES}F)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={cheatMaxBuildingAndDataCenter}
              data-testid="cheat-max-hq"
              className="sm:col-span-3 pixel-btn pixel-btn-gold py-1.5 px-2 text-[11px] font-pixel-display"
            >
              MAX 15-BLDG {MAX_BUILDING_STORIES}F MEGA-CAMPUS + DATA CENTERS
            </button>
            <button
              type="button"
              onClick={cheatUnlockAllLand}
              data-testid="cheat-unlock-land"
              className="pixel-btn pixel-btn-gold py-1.5 px-2 text-[10px] font-pixel-display"
            >
              Buy All Land ({1 + ownedLandCount}/{maxBuildings})
            </button>
            <button
              type="button"
              onClick={cheatMaxAllStories}
              data-testid="cheat-max-stories"
              className="pixel-btn pixel-btn-gold py-1.5 px-2 text-[10px] font-pixel-display"
            >
              Max All Bldgs to {MAX_BUILDING_STORIES}F
            </button>
            <button
              type="button"
              onClick={autoFurnishNow}
              data-testid="cheat-auto-furnish"
              className="pixel-btn pixel-btn-green py-1.5 px-2 text-[10px] font-pixel-display"
            >
              Auto-Furnish &amp; Balance
            </button>
          </div>
          <div className="text-[10px] text-[#b0a89f] mt-1">
            Constructs all {maxBuildings} campus plots across North, South, East &amp; West, raises every building to {MAX_BUILDING_STORIES}F skyscrapers, and deploys era-matched clusters!
          </div>
        </div>

        {/* Section 2: Era Timeline Jump (2010 -> 2100) */}
        <div className="pixel-inset p-2 mb-2">
          <div className="font-pixel-display text-[10px] sm:text-[11px] text-[#c8a8ff] mb-1.5">
            ERA TIMELINE JUMP (2010 → 2100 VISUALS &amp; TECH)
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
            {ERAS.map((era) => {
              const active = eraIndex === era.index;
              return (
                <button
                  key={era.index}
                  type="button"
                  onClick={() => cheatJumpToEra(era.index)}
                  data-testid={`cheat-era-${era.startYear}`}
                  className={`py-1 px-1 text-[10px] font-pixel-display ${
                    active ? 'pixel-btn-gold' : 'pixel-btn'
                  }`}
                  title={`Era ${era.index + 1}: ${era.name} (${era.startYear})`}
                >
                  {era.startYear}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Treasury */}
        <div className="pixel-inset p-2 mb-2">
          <div className="font-pixel-display text-[10px] sm:text-[11px] text-[#ffe478] mb-1.5">
            TREASURY &amp; CAPITAL
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => cheatAddCash(100_000)}
              data-testid="cheat-cash-100k"
              className="pixel-btn pixel-btn-gold py-1 text-[11px] font-pixel-display"
            >
              +$100K
            </button>
            <button
              type="button"
              onClick={() => cheatAddCash(1_000_000)}
              data-testid="cheat-cash-1m"
              className="pixel-btn pixel-btn-gold py-1 text-[11px] font-pixel-display"
            >
              +$1M
            </button>
            <button
              type="button"
              onClick={() => cheatAddCash(10_000_000)}
              data-testid="cheat-cash-10m"
              className="pixel-btn pixel-btn-gold py-1 text-[11px] font-pixel-display"
            >
              +$10M
            </button>
            <button
              type="button"
              onClick={() => cheatSetCash(999_999_999)}
              data-testid="cheat-cash-max"
              className="pixel-btn pixel-btn-green py-1 text-[11px] font-pixel-display"
            >
              $999M
            </button>
          </div>
        </div>

        {/* Section 4: Unlimited Compute/Power/Models & Research/Staff */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div className="pixel-inset p-2 space-y-1.5">
            <div className="font-pixel-display text-[10px] sm:text-[11px] text-[#b0e2f7]">
              COMPUTE, POWER &amp; MODELS (UNLIMITED)
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={cheatToggleUnlimitedCompute}
                data-testid="cheat-toggle-unlimited-compute"
                className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-pixel-display pixel-btn ${
                  cheatUnlimitedCompute ? 'pixel-btn-green' : ''
                }`}
              >
                <span>Unlimited Compute (∞ TF)</span>
                <span>{cheatUnlimitedCompute ? 'ON' : 'OFF'}</span>
              </button>
              <button
                type="button"
                onClick={cheatToggleUnlimitedPower}
                data-testid="cheat-toggle-unlimited-power"
                className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-pixel-display pixel-btn ${
                  cheatUnlimitedPower ? 'pixel-btn-green' : ''
                }`}
              >
                <span>Unlimited Power &amp; Cool (∞)</span>
                <span>{cheatUnlimitedPower ? 'ON' : 'OFF'}</span>
              </button>
              <button
                type="button"
                onClick={cheatToggleUnlimitedModels}
                data-testid="cheat-toggle-unlimited-models"
                className={`w-full flex items-center justify-between px-2 py-1 text-[10px] font-pixel-display pixel-btn ${
                  cheatUnlimitedModels ? 'pixel-btn-green' : ''
                }`}
              >
                <span>Unlimited Models (12x · 100)</span>
                <span>{cheatUnlimitedModels ? 'ON' : 'OFF'}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 pt-0.5">
              <button
                type="button"
                onClick={cheatMaxAllModels}
                data-testid="cheat-max-models"
                className="pixel-btn pixel-btn-green py-1 text-[10px] font-pixel-display"
              >
                Max Models 100
              </button>
              <button
                type="button"
                onClick={cheatMaxMetrics}
                data-testid="cheat-max-metrics"
                className="pixel-btn pixel-btn-gold py-1 text-[10px] font-pixel-display"
              >
                Max Rep/Safety
              </button>
            </div>
          </div>

          <div className="pixel-inset p-2 space-y-1.5">
            <div className="font-pixel-display text-[10px] sm:text-[11px] text-[#99db5c]">
              RESEARCH &amp; STAFF
            </div>
            <button
              type="button"
              onClick={cheatFillCampusWithGeniuses}
              data-testid="cheat-fill-geniuses"
              className="w-full pixel-btn pixel-btn-green py-1.5 px-2 text-[10px] font-pixel-display"
            >
              Fill Building &amp; Workspaces w/ Geniuses
            </button>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={cheatCompleteAllTraining}
                data-testid="cheat-finish-training"
                className="pixel-btn pixel-btn-green py-1 text-[10px] font-pixel-display"
              >
                Finish Jobs ({activeJobs})
              </button>
              <button
                type="button"
                onClick={cheatUnlockAllResearchAndData}
                data-testid="cheat-unlock-all"
                className="pixel-btn pixel-btn-gold py-1 text-[10px] font-pixel-display"
              >
                Unlock All 2100
              </button>
              <button
                type="button"
                onClick={cheatMaxAllStaffSkill}
                data-testid="cheat-max-staff"
                className="pixel-btn py-1 text-[10px] font-pixel-display"
              >
                All Staff Lv.10
              </button>
              <button
                type="button"
                onClick={cheatMaxStaffMood}
                data-testid="cheat-refill-mood"
                className="pixel-btn py-1 text-[10px] font-pixel-display"
              >
                100% Mood
              </button>
            </div>
            <button
              type="button"
              onClick={() => debugSkipDays(180)}
              data-testid="cheat-skip-180"
              className="w-full pixel-btn py-1 text-[10px] font-pixel-display"
            >
              Skip +180 Days
            </button>
          </div>
        </div>

        {/* Section 5: Live Toggles */}
        <div className="pixel-inset p-2">
          <div className="font-pixel-display text-[10px] sm:text-[11px] text-[#ffe478] mb-1.5">
            LIVE OVERRIDES
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={cheatTogglePerfectModels}
              data-testid="cheat-toggle-perfect-models"
              className={`flex items-center justify-between px-2 py-1 text-[11px] font-pixel-display pixel-btn ${
                cheatPerfectModels ? 'pixel-btn-green' : ''
              }`}
            >
              <span>Perfect 100/100 Models</span>
              <span>{cheatPerfectModels ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={cheatToggleFreeBuild}
              data-testid="cheat-toggle-free-build"
              className={`flex items-center justify-between px-2 py-1 text-[11px] font-pixel-display pixel-btn ${
                cheatFreeBuild ? 'pixel-btn-green' : ''
              }`}
            >
              <span>Free Build &amp; Zero Upkeep</span>
              <span>{cheatFreeBuild ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={cheatToggleFreeCash}
              data-testid="cheat-toggle-free-cash"
              className={`flex items-center justify-between px-2 py-1 text-[11px] font-pixel-display pixel-btn ${
                cheatFreeCash ? 'pixel-btn-green' : ''
              }`}
            >
              <span>Infinite Cash ($999M)</span>
              <span>{cheatFreeCash ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={cheatToggleHyperTraining}
              data-testid="cheat-toggle-hyper-train"
              className={`flex items-center justify-between px-2 py-1 text-[11px] font-pixel-display pixel-btn ${
                cheatHyperTraining ? 'pixel-btn-green' : ''
              }`}
            >
              <span>10x Hyper Training</span>
              <span>{cheatHyperTraining ? 'ON' : 'OFF'}</span>
            </button>
            <button
              type="button"
              onClick={cheatToggleGodMood}
              data-testid="cheat-toggle-god-mood"
              className={`sm:col-span-2 flex items-center justify-between px-2 py-1 text-[11px] font-pixel-display pixel-btn ${
                cheatGodMood ? 'pixel-btn-green' : ''
              }`}
            >
              <span>Locked 100% Staff Mood &amp; Energy</span>
              <span>{cheatGodMood ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
