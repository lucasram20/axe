/**
 * Research & Era Tech Tree drawer.
 */

import { ERAS, TECH_NODES } from '../data/techs';
import { canUnlockTech } from '../sim/economy';
import { useGameStore } from '../store/useGameStore';

export function ResearchDrawer() {
  const game = useGameStore((s) => s.game);
  const unlockTechNode = useGameStore((s) => s.unlockTechNode);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);

  return (
    <section
      aria-label="Research and eras"
      className="pointer-events-auto fixed bottom-[84px] sm:bottom-[104px] [@media(max-height:500px)]:bottom-[54px] left-1/2 -translate-x-1/2 z-20 w-[min(900px,96vw)] max-h-[calc(100dvh-176px)] [@media(max-height:500px)]:max-h-[calc(100dvh-98px)] overflow-y-auto pixel-scroll pixel-frame p-2.5 sm:p-3 [@media(max-height:500px)]:p-2"
    >
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b-2 border-[#2e344b]">
        <div>
          <h2 className="font-pixel-display text-xs sm:text-sm text-[#ffe478]">
            Research Tree &amp; Eras (2010 → 2100)
          </h2>
          <p className="text-[11px] sm:text-xs text-[#b8c0cf]">
            Unlock era-specific architectures and watch your HQ, desks, and hardware evolve from 2010 to 2100.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveDrawer(null)}
          aria-label="Close research menu"
          className="px-2 py-1 text-xs font-pixel-display pixel-btn"
        >
          X
        </button>
      </div>

      <div className="space-y-2.5 max-h-[280px] [@media(max-height:500px)]:max-h-[168px] overflow-y-auto pixel-scroll pr-1">
        {ERAS.map((era) => {
          const reached = game.eraIndex >= era.index;
          const nodes = TECH_NODES.filter((t) => t.eraIndex === era.index);

          return (
            <div key={era.id} className="pixel-inset p-2.5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="font-pixel-display text-xs"
                    style={{ color: reached ? era.accentColor : '#65708a' }}
                  >
                    {era.startYear} · {era.name}
                  </span>
                  <span className="text-xs text-[#8c96ab] hidden sm:inline">
                    — {era.tagline}
                  </span>
                </div>
                <span className="text-[11px] font-pixel-display text-[#b8c0cf]">
                  {reached ? 'ACTIVE' : `LOCKED (${era.startYear})`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {nodes.map((node) => {
                  const owned = game.unlockedTechs.includes(node.id);
                  const check = canUnlockTech(game, node.id);

                  return (
                    <div
                      key={node.id}
                      className={`p-2 border-2 ${
                        owned
                          ? 'bg-[#1d4034] border-[#4da858]'
                          : 'bg-[#1f2233] border-[#2e344b]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-pixel-display text-xs text-[#faf7eb]">
                          {node.name}
                        </span>
                        <span className="text-[10px] text-[#8de4ff] uppercase">
                          {node.branch}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#b8c0cf] mt-1 leading-snug">
                        {node.effectSummary}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {owned ? (
                          <span className="text-xs font-pixel-display text-[#8ce063]">
                            Researched
                          </span>
                        ) : (
                          <>
                            <span className="text-[11px] text-[#ffe478] tabular-nums">
                              ${node.costCash.toLocaleString()} · {node.costRep} Rep
                            </span>
                            <button
                              type="button"
                              disabled={!check.ok}
                              onClick={() => unlockTechNode(node.id)}
                              title={check.reason ?? 'Unlock technology'}
                              className="pixel-btn-gold px-2.5 py-1 text-[11px] font-pixel-display"
                            >
                              Unlock
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
