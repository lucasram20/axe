/**
 * Datasets marketplace & owned corpora drawer.
 */

import { DATASETS } from '../data/datasets';
import { useGameStore } from '../store/useGameStore';

export function DataDrawer() {
  const game = useGameStore((s) => s.game);
  const buyDataset = useGameStore((s) => s.buyDataset);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);

  return (
    <section
      aria-label="Datasets library"
      className="pointer-events-auto fixed bottom-[84px] sm:bottom-[104px] left-1/2 -translate-x-1/2 z-20 w-[min(860px,96vw)] max-h-[calc(100dvh-180px)] overflow-y-auto pixel-scroll pixel-frame p-2.5 sm:p-3"
    >
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b-2 border-[#2e344b]">
        <div>
          <h2 className="font-pixel-display text-sm text-[#ffe478]">
            Training Datasets
          </h2>
          <p className="text-xs text-[#b8c0cf]">
            Higher quality boosts model benchmarks. Watch licensing risk to protect lab safety.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveDrawer(null)}
          aria-label="Close datasets menu"
          className="px-2 py-1 text-xs font-pixel-display pixel-btn"
        >
          X
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pixel-scroll pr-1">
        {DATASETS.map((ds) => {
          const owned = game.ownedDatasets.includes(ds.id);
          const unlocked = game.eraIndex >= ds.unlockEra;
          const canBuy = unlocked && !owned && game.cash >= ds.cost;

          return (
            <div
              key={ds.id}
              className={`pixel-inset p-2.5 flex items-center justify-between gap-3 ${
                owned ? 'border-[#4da858]' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="font-pixel-display text-xs text-[#faf7eb]">
                  {ds.name}
                </div>
                <div className="text-xs text-[#8de4ff] tabular-nums mt-0.5">
                  Quality {ds.quality}/100 · {ds.sizeTB} TB · Risk{' '}
                  <span
                    className={
                      ds.legalityRisk >= 15
                        ? 'text-[#e0534f]'
                        : ds.legalityRisk > 0
                          ? 'text-[#ffe478]'
                          : 'text-[#8ce063]'
                    }
                  >
                    {ds.legalityRisk}%
                  </span>
                </div>
                <div className="text-[11px] text-[#b8c0cf] mt-0.5 leading-snug">
                  {ds.description}
                </div>
              </div>

              <div className="shrink-0">
                {owned ? (
                  <span className="font-pixel-display text-xs text-[#8ce063]">
                    Owned
                  </span>
                ) : !unlocked ? (
                  <span className="font-pixel-display text-[11px] text-[#65708a]">
                    Era {ds.unlockEra + 1}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => buyDataset(ds.id)}
                    className="pixel-btn-gold px-3 py-1.5 text-xs font-pixel-display whitespace-nowrap"
                  >
                    License ${ds.cost.toLocaleString()}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
