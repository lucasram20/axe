/**
 * Pixel-art PWA Install / Add Home Screen Shortcut button & device guide modal,
 * plus a non-intrusive offline connectivity badge.
 * Automatically hides the install button when already launched in standalone/fullscreen PWA mode.
 */

import { useState } from 'react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  /** Compact sizing for title card & short landscape viewports */
  compact?: boolean;
  /** Optional custom test ID */
  testId?: string;
}

export function PWAInstallButton({ compact = false, testId = 'pwa-install-btn' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, platform, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // Suppress button when already running as an installed fullscreen/standalone app
  if (isInstalled) {
    return null;
  }

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  const buttonClass = compact
    ? 'pixel-btn-green px-3 py-2 sm:py-2.5 [@media(max-height:500px)]:py-1.5 font-pixel-display text-xs whitespace-nowrap flex items-center gap-1.5'
    : 'pixel-btn-green px-3 py-1.5 font-pixel-display text-xs whitespace-nowrap flex items-center gap-1.5';

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        data-testid={testId}
        aria-label={isInstallable ? 'Install Project-Labs app' : 'Install app or create shortcut'}
        className={buttonClass}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          shapeRendering="crispEdges"
          aria-hidden="true"
          className="shrink-0"
        >
          <rect x="7" y="2" width="2" height="7" fill="currentColor" />
          <rect x="4" y="6" width="2" height="2" fill="currentColor" />
          <rect x="10" y="6" width="2" height="2" fill="currentColor" />
          <rect x="6" y="8" width="4" height="2" fill="currentColor" />
          <rect x="2" y="12" width="12" height="2" fill="currentColor" />
        </svg>
        <span>{isInstallable ? 'Install App' : 'Shortcut'}</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install Project-Labs shortcut"
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
        >
          <div className="pixel-frame-gold w-full max-w-sm p-3.5 sm:p-5 [@media(max-height:500px)]:p-3 max-h-[92dvh] overflow-y-auto pixel-scroll">
            <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b-2 border-[#2e344b]">
              <h2 className="font-pixel-display text-sm text-[#ffe478]">
                Install &amp; Create Shortcut
              </h2>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="pixel-btn px-2 py-0.5 text-xs font-pixel-display"
              >
                X
              </button>
            </div>

            {platform === 'ios' ? (
              <div className="space-y-2 text-xs text-[#e6e2d3] leading-relaxed">
                <p>Add Project-Labs to your iPhone / iPad home screen to play fullscreen:</p>
                <div className="pixel-inset p-2.5 space-y-1.5">
                  <p>
                    <span className="font-pixel-display text-[#ffe478]">1.</span> Tap the{' '}
                    <strong className="text-[#8de4ff]">Share</strong> icon in Safari&apos;s toolbar.
                  </p>
                  <p>
                    <span className="font-pixel-display text-[#ffe478]">2.</span> Scroll down and tap{' '}
                    <strong className="text-[#8ce063]">Add to Home Screen</strong>.
                  </p>
                </div>
              </div>
            ) : platform === 'android' ? (
              <div className="space-y-2 text-xs text-[#e6e2d3] leading-relaxed">
                <p>Create a home-screen shortcut in Chrome Android to launch fullscreen without browser bars:</p>
                <div className="pixel-inset p-2.5 space-y-1.5">
                  <p>
                    <span className="font-pixel-display text-[#ffe478]">1.</span> Tap the{' '}
                    <strong className="text-[#8de4ff]">⋮ menu</strong> in the top-right corner of Chrome.
                  </p>
                  <p>
                    <span className="font-pixel-display text-[#ffe478]">2.</span> Tap{' '}
                    <strong className="text-[#8ce063]">Add to Home screen</strong> (or{' '}
                    <strong className="text-[#8ce063]">Install app</strong>), then confirm.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-[#e6e2d3] leading-relaxed">
                <p>Install Project-Labs as a standalone app or create a desktop shortcut:</p>
                <div className="pixel-inset p-2.5 space-y-1.5">
                  <p>
                    <span className="font-pixel-display text-[#ffe478]">1.</span> Click the{' '}
                    <strong className="text-[#8de4ff]">Install</strong> icon in your browser&apos;s address bar.
                  </p>
                  <p>
                    <span className="font-pixel-display text-[#ffe478]">2.</span> Or open browser menu &rarr;{' '}
                    <strong className="text-[#8ce063]">Cast, save, and share &rarr; Create shortcut</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="pixel-btn-gold px-4 py-1.5 text-xs font-pixel-display"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-2 left-2 z-40 pixel-inset px-2.5 py-1 text-[11px] font-pixel-display text-[#ffe478] border-[#e6b84c]"
    >
      OFFLINE MODE · SAVED LOCALLY
    </div>
  );
}
