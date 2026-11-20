/**
 * Finance, Cashflow Breakdown, and Venture Funding / IPO Ladder drawer.
 */

import { FUNDING_ROUNDS } from '../data/funding';
import { canRaiseFundingRound, getTopBenchmark } from '../sim/economy';
import { useGameStore, useResourceSnapshot } from '../store/useGameStore';

export function FinanceDrawer() {
  const game = useGameStore((s) => s.game);
  const res = useResourceSnapshot();
  const raiseFunding = useGameStore((s) => s.raiseFunding);
  const toggleAutomation = useGameStore((s) => s.toggleAutomation);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);

  const topBench = getTopBenchmark(game);
  const autoPowerUnlocked = game.unlockedTechs.includes('tech_auto_power');

  return (
    <section
      aria-label="Finance and funding"
      className="pointer-events-auto fixed bottom-[84px] sm:bottom-[104px] [@media(max-height:500px)]:bottom-[54px] left-1/2 -translate-x-1/2 z-20 w-[min(900px,96vw)] max-h-[calc(100dvh-176px)] [@media(max-height:500px)]:max-h-[calc(100dvh-98px)] overflow-y-auto pixel-scroll pixel-frame p-2.5 sm:p-3 [@media(max-height:500px)]:p-2"
    >
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b-2 border-[#2e344b]">
        <div>
          <h2 className="font-pixel-display text-sm text-[#ffe478]">
            Treasury & Venture Funding
          </h2>
          <p className="text-xs text-[#b8c0cf] tabular-nums">
            Valuation ${(game.valuation / 1_000_000).toFixed(2)}M · Founder Equity {game.founderEquityPct}% · Top Benchmark {topBench}/100
          </p>
        </div>
        <div className="flex items-center gap-2">
          {autoPowerUnlocked && (
            <button
              type="button"
              onClick={() => toggleAutomation('autoBuyPower')}
              className={`px-2.5 py-1 text-xs font-pixel-display ${
                game.automation.autoBuyPower ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              Auto-Power: {game.automation.autoBuyPower ? 'ON' : 'OFF'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveDrawer(null)}
            aria-label="Close finance menu"
            className="px-2 py-1 text-xs font-pixel-display pixel-btn"
          >
            X
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Daily Ledger */}
        <div className="pixel-inset p-3 space-y-1.5 text-xs tabular-nums">
          <div className="font-pixel-display text-[#8de4ff] mb-2">Daily Cashflow</div>
          <div className="flex justify-between">
            <span className="text-[#b8c0cf]">API & Product Rev</span>
            <span className="text-[#8ce063]">+${Math.round(res.revenuePerDay).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#b8c0cf]">Staff Payroll</span>
            <span className="text-[#f59876]">-${Math.round(res.payrollPerDay).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#b8c0cf]">Hardware Upkeep</span>
            <span className="text-[#f59876]">-${Math.round(res.upkeepPerDay).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#b8c0cf]">Power Utility</span>
            <span className="text-[#f59876]">-${Math.round(res.powerBillPerDay).toLocaleString()}</span>
          </div>
          <div className="pt-1.5 mt-1.5 border-t border-[#2e344b] flex justify-between font-pixel-display">
            <span>Net / Day</span>
            <span className={res.netPerDay >= 0 ? 'text-[#8ce063]' : 'text-[#e0534f]'}>
              {res.netPerDay >= 0 ? '+' : ''}${Math.round(res.netPerDay).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Funding Rounds Ladder */}
        <div className="md:col-span-2 space-y-2 max-h-[240px] overflow-y-auto pixel-scroll pr-1">
          {FUNDING_ROUNDS.map((round) => {
            const raised = game.completedFundingIds.includes(round.id);
            const check = canRaiseFundingRound(game, round.id);

            return (
              <div
                key={round.id}
                className={`pixel-inset p-2.5 flex items-center justify-between gap-2 ${
                  raised ? 'border-[#4da858]' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="font-pixel-display text-xs text-[#faf7eb]">
                    {round.name} ·{' '}
                    <span className="text-[#ffe478]">
                      +${round.cashAward.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#b8c0cf] tabular-nums">
                    Dilution -{round.equityDilutionPct}% · Req: {round.minRep} Rep, {round.minTopBenchmark}+ Bench, {round.minModelsShipped} API(s)
                  </div>
                </div>
                {raised ? (
                  <span className="font-pixel-display text-xs text-[#8ce063] shrink-0">
                    Closed
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!check.ok}
                    onClick={() => raiseFunding(round.id)}
                    title={check.reason ?? 'Raise funding round'}
                    className="pixel-btn-gold px-3 py-1.5 text-xs font-pixel-display shrink-0 whitespace-nowrap"
                  >
                    {check.ok ? 'Raise Round' : check.reason}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
