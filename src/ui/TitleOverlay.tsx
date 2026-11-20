/**
 * Live-world isometric low-poly Title Screen overlay.
 * Fits cleanly across desktop AND short mobile landscape viewports with zero clipping.
 * Fullscreen buttons removed — mobile automatically enters horizontal fullscreen on interaction.
 */

import { useGameStore } from '../store/useGameStore';
import { PWAInstallButton } from './PWAInstallButton';

export function requestMobileLandscapeFullscreen(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const isTouch =
    window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (!isTouch) return;

  try {
    if (!document.fullscreenElement && document.documentElement?.requestFullscreen) {
      document.documentElement
        .requestFullscreen()
        .then(() => {
          const orient = screen.orientation as ScreenOrientation & {
            lock?: (orientation: string) => Promise<void>;
          };
          orient?.lock?.('landscape').catch(() => {});
        })
        .catch(() => {});
    } else {
      const orient = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      orient?.lock?.('landscape').catch(() => {});
    }
  } catch {
    // Ignore when browser blocks orientation lock / fullscreen
  }
}

export function TitleOverlay() {
  const hasExistingSave = useGameStore((s) => s.hasExistingSave);
  const startNewLab = useGameStore((s) => s.startNewLab);
  const continueLab = useGameStore((s) => s.continueLab);

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3 sm:p-6 md:p-10 [@media(max-height:500px)]:p-2">
      {/* Upper-left calm plaque over live animated 3D low-poly lab */}
      <div className="pointer-events-auto max-w-md w-full pixel-frame-gold p-4 sm:p-6 mt-1 sm:mt-4 [@media(max-height:500px)]:max-w-[440px] [@media(max-height:500px)]:p-2.5 [@media(max-height:500px)]:mt-0">
        {/* Custom Inline Voxel Chip Crest & Wordmark SVG */}
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 [@media(max-height:500px)]:gap-2 [@media(max-height:500px)]:mb-1.5">
          <svg
            width="56"
            height="56"
            viewBox="0 0 16 16"
            shapeRendering="crispEdges"
            aria-hidden="true"
            className="shrink-0 w-11 h-11 sm:w-14 sm:h-14 [@media(max-height:500px)]:w-8 [@media(max-height:500px)]:h-8"
          >
            <rect x="1" y="1" width="14" height="14" fill="#14121d" />
            <rect x="2" y="2" width="12" height="12" fill="#2e344b" />
            <rect x="5" y="4" width="6" height="6" fill="#e6b84c" />
            <rect x="6" y="5" width="4" height="4" fill="#4ea8de" />
            <rect x="7" y="6" width="2" height="2" fill="#8de4ff" />
            <rect x="6" y="2" width="1" height="2" fill="#ffe478" />
            <rect x="9" y="2" width="1" height="2" fill="#ffe478" />
            <rect x="6" y="10" width="1" height="2" fill="#ffe478" />
            <rect x="9" y="10" width="1" height="2" fill="#ffe478" />
            <rect x="3" y="5" width="2" height="1" fill="#ffe478" />
            <rect x="3" y="8" width="2" height="1" fill="#ffe478" />
            <rect x="11" y="5" width="2" height="1" fill="#ffe478" />
            <rect x="11" y="8" width="2" height="1" fill="#ffe478" />
            <rect x="11" y="11" width="2" height="2" fill="#8ce063" />
          </svg>
          <div className="min-w-0">
            <h1 className="font-pixel-display text-xl sm:text-3xl [@media(max-height:500px)]:text-base text-[#ffe478] leading-tight tracking-wide">
              PROJECT-LABS
            </h1>
            <p className="text-xs sm:text-sm [@media(max-height:500px)]:text-[10px] text-[#b8c0cf] mt-0.5">
              AI Lab Tycoon · 2010 to 2100 Singularity
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#e6e2d3] leading-relaxed mb-4 sm:mb-5 [@media(max-height:500px)]:text-[11px] [@media(max-height:500px)]:leading-snug [@media(max-height:500px)]:mb-2">
          Build your compute floor, hire researchers, evolve your HQ across 7 eras, and climb the global AI leaderboard from a 2010 garage startup.
        </p>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {hasExistingSave ? (
            <>
              <button
                type="button"
                data-start="true"
                onClick={(e) => {
                  e.currentTarget.blur();
                  requestMobileLandscapeFullscreen();
                  continueLab();
                }}
                className="pixel-btn-gold px-4 sm:px-5 py-2 sm:py-2.5 [@media(max-height:500px)]:px-3.5 [@media(max-height:500px)]:py-1.5 font-pixel-display text-xs sm:text-sm whitespace-nowrap"
              >
                Continue Lab
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  requestMobileLandscapeFullscreen();
                  startNewLab();
                }}
                className="pixel-btn px-3.5 sm:px-4 py-2 sm:py-2.5 [@media(max-height:500px)]:px-3 [@media(max-height:500px)]:py-1.5 font-pixel-display text-xs whitespace-nowrap"
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
                requestMobileLandscapeFullscreen();
                startNewLab();
              }}
              className="pixel-btn-gold px-5 sm:px-6 py-2 sm:py-2.5 [@media(max-height:500px)]:px-4 [@media(max-height:500px)]:py-1.5 font-pixel-display text-xs sm:text-sm whitespace-nowrap"
            >
              Start Lab
            </button>
          )}

          <PWAInstallButton compact testId="title-pwa-install" />
        </div>
      </div>

      {/* Single flat borderless bottom control hint line */}
      <div className="text-center text-[10px] sm:text-xs text-[#e6e2d3] drop-shadow-[0_2px_0_#14121d] px-2">
        <span className="lg:hidden">Drag Pan · Pinch Zoom · Tap Floor to Build &amp; Select</span>
        <span className="hidden lg:inline">
          WASD / Drag Pan · Q/E Rotate 90° · Scroll Zoom · R Rotate Item · Space Pause · ` Debug
        </span>
      </div>
    </div>
  );
}
