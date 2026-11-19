/**
 * Pixel look, quality settings, and localStorage Save / Reset drawer.
 */

import { useGameStore } from '../store/useGameStore';
import { PWAInstallButton } from './PWAInstallButton';

export function SettingsDrawer() {
  const settings = useGameStore((s) => s.game.settings);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const saveNow = useGameStore((s) => s.saveNow);
  const resetSave = useGameStore((s) => s.resetSave);
  const toggleDebug = useGameStore((s) => s.toggleDebug);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);

  return (
    <section
      aria-label="Settings and quality"
      className="pointer-events-auto fixed bottom-[84px] sm:bottom-[104px] [@media(max-height:500px)]:bottom-[68px] left-1/2 -translate-x-1/2 z-20 w-[min(680px,96vw)] max-h-[calc(100dvh-180px)] [@media(max-height:500px)]:max-h-[calc(100dvh-126px)] overflow-y-auto pixel-scroll pixel-frame p-2.5 sm:p-3 [@media(max-height:500px)]:p-2"
    >
      <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-[#2e344b]">
        <h2 className="font-pixel-display text-sm text-[#ffe478]">
          Visual Quality & Save Settings
        </h2>
        <button
          type="button"
          onClick={() => setActiveDrawer(null)}
          aria-label="Close settings"
          className="px-2 py-1 text-xs font-pixel-display pixel-btn"
        >
          X
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="pixel-inset p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[#b8c0cf]">Pixel Scale</span>
            <div className="flex gap-1">
              {([2, 3, 4] as const).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => updateSettings({ pixelScale: sc })}
                  className={`px-2.5 py-1 font-pixel-display text-xs ${
                    settings.pixelScale === sc ? 'pixel-btn-gold' : 'pixel-btn'
                  }`}
                >
                  {sc}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#b8c0cf]">1px Ink Outlines</span>
            <button
              type="button"
              onClick={() => updateSettings({ outlines: !settings.outlines })}
              className={`px-3 py-1 font-pixel-display ${
                settings.outlines ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              {settings.outlines ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#b8c0cf]">32-Color Palette Quantize</span>
            <button
              type="button"
              onClick={() => updateSettings({ paletteQuantize: !settings.paletteQuantize })}
              className={`px-3 py-1 font-pixel-display ${
                settings.paletteQuantize ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              {settings.paletteQuantize ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="pixel-inset p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[#b8c0cf]">Pixel Shadows</span>
            <button
              type="button"
              onClick={() => updateSettings({ shadows: !settings.shadows })}
              className={`px-3 py-1 font-pixel-display ${
                settings.shadows ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              {settings.shadows ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#b8c0cf]">Edge-Scroll Pan</span>
            <button
              type="button"
              onClick={() => updateSettings({ edgeScroll: !settings.edgeScroll })}
              className={`px-3 py-1 font-pixel-display ${
                settings.edgeScroll ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              {settings.edgeScroll ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#b8c0cf]">UI Sound Effects</span>
            <button
              type="button"
              onClick={() => updateSettings({ muted: !settings.muted })}
              className={`px-3 py-1 font-pixel-display ${
                !settings.muted ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              {!settings.muted ? 'ON' : 'MUTED'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t-2 border-[#2e344b] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={saveNow}
            className="pixel-btn-gold px-3 py-1.5 text-xs font-pixel-display"
          >
            Save Now
          </button>
          <PWAInstallButton testId="settings-pwa-install" />
          <button
            type="button"
            onClick={toggleDebug}
            className="pixel-btn px-3 py-1.5 text-xs font-pixel-display"
          >
            Debug Panel (`)
          </button>
        </div>
        <button
          type="button"
          onClick={resetSave}
          className="pixel-btn-red px-3 py-1.5 text-xs font-pixel-display"
        >
          Reset Startup
        </button>
      </div>
    </section>
  );
}
