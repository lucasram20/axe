/**
 * Rival AI Labs Leaderboard drawer.
 */

import { getTopBenchmark } from '../sim/economy';
import { useGameStore } from '../store/useGameStore';

export function RivalsDrawer() {
  const game = useGameStore((s) => s.game);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);

  const playerTop = getTopBenchmark(game);
  const playerFlagship =
    game.models.length > 0
      ? [...game.models].sort((a, b) => b.benchmarks.overall - a.benchmarks.overall)[0].name
      : 'None yet';

  const entries = [
    {
      id: 'player',
      name: `${game.labName} (You)`,
      motto: `Safety ${Math.round(game.safety)}% · Hype ${Math.round(game.hype)}`,
      color: '#ffe478',
      topBenchmark: playerTop,
      valuation: game.valuation,
      modelsShipped: game.products.length,
      flagshipModel: playerFlagship,
      isPlayer: true,
    },
    ...game.rivals.map((r) => ({ ...r, isPlayer: false })),
  ].sort((a, b) => b.topBenchmark - a.topBenchmark || b.valuation - a.valuation);

  return (
    <section
      aria-label="Rival labs leaderboard"
      className="pointer-events-auto fixed bottom-[84px] sm:bottom-[104px] [@media(max-height:500px)]:bottom-[54px] left-1/2 -translate-x-1/2 z-20 w-[min(860px,96vw)] max-h-[calc(100dvh-176px)] [@media(max-height:500px)]:max-h-[calc(100dvh-98px)] overflow-y-auto pixel-scroll pixel-frame p-2.5 sm:p-3 [@media(max-height:500px)]:p-2"
    >
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b-2 border-[#2e344b]">
        <div>
          <h2 className="font-pixel-display text-sm text-[#ffe478]">
            Global AI Lab Leaderboard ({game.year})
          </h2>
          <p className="text-xs text-[#b8c0cf]">
            Compete on frontier model benchmarks and market valuation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveDrawer(null)}
          aria-label="Close rivals menu"
          className="px-2 py-1 text-xs font-pixel-display pixel-btn"
        >
          X
        </button>
      </div>

      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pixel-scroll pr-1">
        {entries.map((entry, idx) => (
          <div
            key={entry.id}
            className={`pixel-inset px-3 py-2 flex items-center justify-between gap-3 ${
              entry.isPlayer ? 'border-[#e6b84c] bg-[#24283d]' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-pixel-display text-sm w-6 text-center text-[#8c96ab] tabular-nums">
                #{idx + 1}
              </span>
              <span
                className="w-3 h-3 border border-[#14121d] shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <div className="min-w-0">
                <div className="font-pixel-display text-xs text-[#faf7eb] truncate">
                  {entry.name}
                </div>
                <div className="text-[11px] text-[#b8c0cf] truncate">
                  Flagship: {entry.flagshipModel} · {entry.motto}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 shrink-0 tabular-nums text-right">
              <div>
                <div className="text-[10px] text-[#8c96ab] uppercase">Top Score</div>
                <div className="font-pixel-display text-xs text-[#8de4ff]">
                  {entry.topBenchmark}/100
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#8c96ab] uppercase">Valuation</div>
                <div className="font-pixel-display text-xs text-[#8ce063]">
                  ${(entry.valuation / 1_000_000).toFixed(2)}M
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
