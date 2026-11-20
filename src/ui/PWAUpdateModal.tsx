/**
 * Animated PWA Auto-Update Pop-up Modal.
 * Automatically appears whenever a new version of Project-Labs is published,
 * displaying an animated striped pixel progress bar, pulsing voxel chip crest,
 * live stage checklist, and seamless auto-relaunch with zero manual re-download.
 */

import { usePWAUpdate } from '../hooks/usePWAUpdate';

const STAGE_LABELS = [
  'Check Build Manifest',
  'Download New Assets',
  'Verify Offline Cache',
  'Activate & Relaunch',
];

export function PWAUpdateModal() {
  const { phase, progress, stageIndex, statusText, isPreview, modalOpen, dismissModal } =
    usePWAUpdate();

  if (!modalOpen) return null;

  const canDismiss = phase === 'up_to_date' || phase === 'offline' || (isPreview && phase === 'reloading');

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center bg-[#14121d]/85 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Project-Labs Auto-Update"
      data-testid="pwa-update-modal"
    >
      <div className="pixel-frame-gold w-[430px] max-w-full p-3.5 sm:p-4 text-[#faf7eb]">
        {/* Header with animated voxel chip icon */}
        <div className="flex items-center gap-3 pb-2.5 mb-2.5 border-b-2 border-[#2e344b]">
          <div className="p-1.5 pixel-inset shrink-0">
            <svg
              width="34"
              height="34"
              viewBox="0 0 16 16"
              shapeRendering="crispEdges"
              aria-hidden="true"
              className="pixel-chip-anim"
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
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-pixel-display text-xs sm:text-sm text-[#ffe478] tracking-wide">
              {phase === 'up_to_date'
                ? 'APP UP TO DATE'
                : phase === 'offline'
                  ? 'OFFLINE MODE'
                  : phase === 'checking'
                    ? 'CHECKING FOR UPDATES'
                    : 'UPDATING PROJECT-LABS'}
            </div>
            <div className="text-[11px] text-[#8de4ff] mt-0.5 truncate" data-testid="pwa-update-status">
              {statusText}
            </div>
          </div>
          <div className="font-pixel-display text-sm sm:text-base text-[#8ce063] tabular-nums shrink-0">
            {progress}%
          </div>
        </div>

        {/* Animated striped pixel progress bar */}
        <div className="pixel-inset p-1 mb-3">
          <div className="relative h-5 w-full bg-[#0f111c] overflow-hidden border border-[#2e344b]">
            <div
              data-testid="pwa-update-bar"
              className="h-full pixel-progress-fill transition-[width] duration-150 ease-out"
              style={{ width: `${Math.max(4, progress)}%` }}
            />
            {/* Crisp segmented pixel divider ticks */}
            <div
              className="pointer-events-none absolute inset-0 grid grid-cols-10"
              aria-hidden="true"
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="border-r border-[#14121d]/45 last:border-r-0" />
              ))}
            </div>
          </div>
        </div>

        {/* Stage progress checklist */}
        {phase !== 'offline' && (
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {STAGE_LABELS.map((label, idx) => {
              const done =
                phase === 'up_to_date' ||
                phase === 'reloading' ||
                (phase === 'updating' && idx < stageIndex);
              const active =
                (phase === 'updating' && idx === stageIndex) ||
                (phase === 'checking' && idx === 0);
              return (
                <div
                  key={label}
                  className={`flex items-center gap-1.5 px-2 py-1 text-[10px] sm:text-[11px] border ${
                    done
                      ? 'bg-[#1d3b2d] border-[#4da858] text-[#d6ff9e]'
                      : active
                        ? 'bg-[#26324d] border-[#8de4ff] text-[#faf7eb]'
                        : 'bg-[#14121d] border-[#2e344b] text-[#7a8499]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 shrink-0 ${
                      done
                        ? 'bg-[#8ce063]'
                        : active
                          ? 'bg-[#ffe478] animate-pulse'
                          : 'bg-[#3c455c]'
                    }`}
                  />
                  <span className="truncate font-pixel-display">{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note or Dismiss button */}
        <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-[#b8c0cf]">
          <span>
            {phase === 'updating' || phase === 'reloading'
              ? 'Your save data is preserved safely during auto-update.'
              : 'Installed apps update automatically whenever a new release ships.'}
          </span>
          {canDismiss && (
            <button
              type="button"
              onClick={dismissModal}
              data-testid="pwa-update-dismiss"
              className="pixel-btn-gold px-3 py-1 text-xs font-pixel-display shrink-0"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
