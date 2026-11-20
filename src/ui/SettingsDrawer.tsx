/**
 * Visual clarity, gameplay automation, PWA auto-update check, and Save / Reset drawer.
 */

import { usePWAUpdate } from '../hooks/usePWAUpdate';
import { useGameStore } from '../store/useGameStore';
import { PWAInstallButton } from './PWAInstallButton';

const SCALE_OPTIONS: Array<{ value: 1 | 2 | 3; label: string }> = [
  { value: 1, label: 'Low-Poly' },
  { value: 2, label: 'Crisp 2x' },
  { value: 3, label: 'Retro 3x' },
];

export function SettingsDrawer() {
  const settings = useGameStore((s) => s.game.settings);
  const autoFurnish = useGameStore((s) => s.game.automation.autoFurnish);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const toggleAutomation = useGameStore((s) => s.toggleAutomation);
  const saveNow = useGameStore((s) => s.saveNow);
  const resetSave = useGameStore((s) => s.resetSave);
  const toggleDebug = useGameStore((s) => s.toggleDebug);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const { checkForUpdates } = usePWAUpdate();

  return (
    <section
      aria-label="Settings and quality"
      className="pointer-events-auto fixed bottom-[84px] sm:bottom-[104px] [@media(max-height:500px)]:bottom-[54px] left-1/2 -translate-x-1/2 z-20 w-[min(700px,96vw)] max-h-[calc(100dvh-176px)] [@media(max-height:500px)]:max-h-[calc(100dvh-98px)] overflow-y-auto pixel-scroll pixel-frame p-2.5 sm:p-3 [@media(max-height:500px)]:p-2"
    >
      <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b-2 border-[#2e344b]">
        <h2 className="font-pixel-display text-xs sm:text-sm text-[#ffe478]">
          Graphics, Auto-Update &amp; Save Settings
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div className="pixel-inset p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#b8c0cf]">Graphics Style</span>
            <div className="flex gap-1">
              {SCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateSettings({ pixelScale: opt.value })}
                  className={`px-2 py-1 font-pixel-display text-[10px] sm:text-[11px] whitespace-nowrap ${
                    settings.pixelScale === opt.value ? 'pixel-btn-gold' : 'pixel-btn'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#b8c0cf]">Silhouette Outlines</span>
            <button
              type="button"
              onClick={() => updateSettings({ outlines: !settings.outlines })}
              className={`px-3 py-1 font-pixel-display text-[11px] ${
                settings.outlines ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              {settings.outlines ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#b8c0cf]">Retro 32-Color Filter</span>
            <button
              type="button"
              onClick={() => updateSettings({ paletteQuantize: !settings.paletteQuantize })}
              className={`px-3 py-1 font-pixel-display text-[11px] ${
                settings.paletteQuantize ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              {settings.paletteQuantize ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#b8c0cf]">Auto-Furnish Lab</span>
            <button
              type="button"
              onClick={() => toggleAutomation('autoFurnish')}
              className={`px-3 py-1 font-pixel-display text-[11px] ${
                autoFurnish ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              {autoFurnish ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="pixel-inset p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[#b8c0cf]">3D Shadows</span>
            <button
              type="button"
              onClick={() => updateSettings({ shadows: !settings.shadows })}
              className={`px-3 py-1 font-pixel-display text-[11px] ${
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
              className={`px-3 py-1 font-pixel-display text-[11px] ${
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
              className={`px-3 py-1 font-pixel-display text-[11px] ${
                !settings.muted ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              {!settings.muted ? 'ON' : 'MUTED'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#b8c0cf]">Installed App Updates</span>
            <button
              type="button"
              onClick={() => {
                void checkForUpdates();
              }}
              data-testid="settings-check-updates"
              className="px-2.5 py-1 font-pixel-display text-[11px] pixel-btn-gold whitespace-nowrap"
            >
              Check Updates
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t-2 border-[#2e344b] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={saveNow}
            className="pixel-btn-gold px-3 py-1 text-xs font-pixel-display"
          >
            Save Now
          </button>
          <PWAInstallButton testId="settings-pwa-install" />
          <button
            type="button"
            onClick={toggleDebug}
            className="pixel-btn px-2.5 py-1 text-xs font-pixel-display"
          >
            Debug (`)
          </button>
        </div>
        <button
          type="button"
          onClick={resetSave}
          className="pixel-btn-red px-2.5 py-1 text-xs font-pixel-display"
        >
          Reset Startup
        </button>
      </div>
    </section>
  );
}
