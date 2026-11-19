/**
 * Live-world isometric pixel-art Title Screen overlay.
 * Anchored in the upper-left/center-left calm framing over the live 3D garage lab,
 * featuring a bespoke inline pixel-art SVG emblem and data-start="true" CTA.
 */

import { useGameStore } from '../store/useGameStore';

export function TitleOverlay() {
  const hasExistingSave = useGameStore((s) => s.hasExistingSave);
  const startNewLab = useGameStore((s) => s.startNewLab);
  const continueLab = useGameStore((s) => s.continueLab);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6 md:p-10">
      {/* Upper-left calm plaque over live animated 3D pixel-art garage */}
      <div className="pointer-events-auto max-w-md w-full pixel-frame-gold p-4 sm:p-6 mt-2 sm:mt-4">
        {/* Custom Inline Pixel-Art Crest & Wordmark SVG */}
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <svg
            width="56"
            height="56"
            viewBox="0 0 16 16"
            shapeRendering="crispEdges"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect x="1" y="1" width="14" height="14" fill="#14121d" />
            <rect x="2" y="2" width="12" height="12" fill="#2e344b" />
            {/* Isometric voxel chip crest */}
            <rect x="5" y="4" width="6" height="6" fill="#e6b84c" />
            <rect x="6" y="5" width="4" height="4" fill="#4ea8de" />
            <rect x="7" y="6" width="2" height="2" fill="#8de4ff" />
            {/* Gold pins */}
            <rect x="6" y="2" width="1" height="2" fill="#ffe478" />
            <rect x="9" y="2" width="1" height="2" fill="#ffe478" />
            <rect x="6" y="10" width="1" height="2" fill="#ffe478" />
            <rect x="9" y="10" width="1" height="2" fill="#ffe478" />
            <rect x="3" y="5" width="2" height="1" fill="#ffe478" />
            <rect x="3" y="8" width="2" height="1" fill="#ffe478" />
            <rect x="11" y="5" width="2" height="1" fill="#ffe478" />
            <rect x="11" y="8" width="2" height="1" fill="#ffe478" />
            {/* Status green LED */}
            <rect x="11" y="11" width="2" height="2" fill="#8ce063" />
          </svg>
          <div>
            <h1 className="font-pixel-display text-2xl md:text-3xl text-[#ffe478] leading-tight tracking-wide">
              PROJECT-LABS
            </h1>
            <p className="text-sm text-[#b8c0cf] mt-0.5">
              AI Lab Tycoon · 2010 to Frontier
            </p>
          </div>
        </div>

        <p className="text-sm text-[#e6e2d3] leading-relaxed mb-5">
          Build your compute floor, hire researchers, train frontier models, and climb the global AI leaderboard from a garage startup.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {hasExistingSave ? (
            <>
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  continueLab();
                }}
                className="pixel-btn-gold px-5 py-2.5 font-pixel-display text-sm whitespace-nowrap"
              >
                Continue Lab
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  startNewLab();
                }}
                className="pixel-btn px-4 py-2.5 font-pixel-display text-xs whitespace-nowrap"
              >
                New Startup
              </button>
            </>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                startNewLab();
              }}
              className="pixel-btn-gold px-6 py-2.5 font-pixel-display text-sm whitespace-nowrap"
            >
              Start Lab
            </button>
          )}
        </div>
      </div>

      {/* Single flat borderless bottom control hint line */}
      <div className="text-center text-[11px] sm:text-xs text-[#e6e2d3] drop-shadow-[0_2px_0_#14121d] px-2">
        <span className="sm:hidden">Drag Pan · Pinch Zoom · Tap Floor to Build &amp; Select</span>
        <span className="hidden sm:inline">
          WASD / Drag Pan · Q/E Rotate 90° · Scroll Zoom · R Rotate Item · Space Pause · ` Debug
        </span>
      </div>
    </div>
  );
}
