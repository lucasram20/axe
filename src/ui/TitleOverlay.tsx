/**
 * Centered Live-World Isometric Game Menu over the animated 3D low-poly lab.
 * Supports:
 * - Continue Lab / New Startup (with custom AI Lab Naming + Save Slot selection)
 * - Load Game (Auto-Save + 3 Save Slots with Lab Name, Year, Era, Cash & Building count)
 * - Settings (Graphics Style, Outlines, Shadows, Audio, Auto-Furnish & PWA Updates)
 * - Install App (PWA shortcut)
 * Fits cleanly across desktop AND short mobile landscape viewports with zero clipping.
 */

import { useState } from 'react';
import { ERAS } from '../data/techs';
import { usePWAUpdate } from '../hooks/usePWAUpdate';
import {
  listSaveSlots,
  RANDOM_LAB_NAMES,
  type SaveSlotId,
} from '../sim/save';
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

type MenuView = 'main' | 'new_lab' | 'load' | 'settings';

const SCALE_OPTIONS: Array<{ value: 1 | 2 | 3; label: string }> = [
  { value: 1, label: 'Low-Poly' },
  { value: 2, label: 'Crisp 2x' },
  { value: 3, label: 'Retro 3x' },
];

const MANUAL_SLOTS: Array<{ id: SaveSlotId; label: string }> = [
  { id: 'slot_1', label: 'Slot 1' },
  { id: 'slot_2', label: 'Slot 2' },
  { id: 'slot_3', label: 'Slot 3' },
];

function formatCompactCash(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function TitleOverlay() {
  const hasExistingSave = useGameStore((s) => s.hasExistingSave);
  const saveSlotsNonce = useGameStore((s) => s.saveSlotsNonce);
  const settings = useGameStore((s) => s.game.settings);
  const autoFurnish = useGameStore((s) => s.game.automation.autoFurnish);

  const startNewLab = useGameStore((s) => s.startNewLab);
  const continueLab = useGameStore((s) => s.continueLab);
  const loadSaveSlot = useGameStore((s) => s.loadSaveSlot);
  const deleteSaveSlot = useGameStore((s) => s.deleteSaveSlot);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const toggleAutomation = useGameStore((s) => s.toggleAutomation);
  const { checkForUpdates } = usePWAUpdate();

  const [view, setView] = useState<MenuView>('main');
  const [labNameInput, setLabNameInput] = useState('AetherMind Labs');
  const [nameError, setNameError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<SaveSlotId>('slot_1');

  // Re-read save slots whenever nonce changes
  void saveSlotsNonce;
  const slots = listSaveSlots();
  const autosaveMeta = slots.find((s) => s.slotId === 'autosave');
  const savedCount = slots.filter((s) => s.exists).length;

  const handleRandomName = () => {
    const others = RANDOM_LAB_NAMES.filter((n) => n !== labNameInput);
    const pick = others[Math.floor(Math.random() * others.length)] ?? RANDOM_LAB_NAMES[0];
    setLabNameInput(pick);
    setNameError('');
  };

  const handleLaunchNewLab = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = labNameInput.trim();
    if (trimmed.length < 2) {
      setNameError('Enter at least 2 characters for your AI Lab name.');
      return;
    }
    setNameError('');
    requestMobileLandscapeFullscreen();
    startNewLab(trimmed, selectedSlot);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-2.5 sm:p-6 [@media(max-height:500px)]:p-2">
      {/* Spacer so the Game Menu sits cleanly centered vertically */}
      <div className="h-1 shrink-0" aria-hidden="true" />

      {/* CENTERED GAME MENU PLAQUE */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div
          data-testid="title-menu-card"
          className="pointer-events-auto w-full max-w-[460px] [@media(max-height:500px)]:max-w-[490px] max-h-[86dvh] overflow-y-auto pixel-scroll pixel-frame-gold p-4 sm:p-6 [@media(max-height:500px)]:p-3"
        >
          {/* Centered Brand Crest & Wordmark */}
          <div className="flex items-center justify-center gap-3 [@media(max-height:500px)]:gap-2 mb-3 sm:mb-4 [@media(max-height:500px)]:mb-2">
            <svg
              width="52"
              height="52"
              viewBox="0 0 16 16"
              shapeRendering="crispEdges"
              aria-hidden="true"
              className="shrink-0 w-11 h-11 sm:w-13 sm:h-13 [@media(max-height:500px)]:w-8 [@media(max-height:500px)]:h-8"
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
            <div className="min-w-0 text-left">
              <h1 className="font-pixel-display text-xl sm:text-3xl [@media(max-height:500px)]:text-lg text-[#ffe478] leading-tight tracking-wide">
                PROJECT-LABS
              </h1>
              <p className="text-[11px] sm:text-xs [@media(max-height:500px)]:text-[10px] text-[#b8c0cf] mt-0.5">
                AI Lab Tycoon · 2010 to 2100 Singularity
              </p>
            </div>
          </div>

          {/* VIEW 1: MAIN CENTERED MENU */}
          {view === 'main' && (
            <div>
              <p className="text-center text-xs sm:text-[13px] [@media(max-height:500px)]:text-[11px] text-[#e6e2d3] leading-relaxed [@media(max-height:500px)]:leading-snug mb-3.5 sm:mb-4 [@media(max-height:500px)]:mb-2">
                Found your AI lab, expand across a 6-building campus, evolve through 7 eras, and lead the frontier leaderboard.
              </p>

              <div className="space-y-2 [@media(max-height:500px)]:space-y-1.5">
                {/* Primary CTA */}
                {hasExistingSave && autosaveMeta?.exists ? (
                  <button
                    type="button"
                    data-start="true"
                    data-testid="menu-continue"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      requestMobileLandscapeFullscreen();
                      continueLab();
                    }}
                    className="pixel-btn-gold w-full px-4 py-2.5 [@media(max-height:500px)]:py-1.5 font-pixel-display text-xs sm:text-sm flex items-center justify-between gap-2"
                  >
                    <span>Continue Lab</span>
                    <span className="text-[10px] sm:text-[11px] opacity-85 truncate max-w-[55%]">
                      {autosaveMeta.labName} · {autosaveMeta.year}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    data-start="true"
                    data-testid="menu-new-startup"
                    onClick={() => setView('new_lab')}
                    className="pixel-btn-gold w-full px-5 py-2.5 [@media(max-height:500px)]:py-1.5 font-pixel-display text-xs sm:text-sm"
                  >
                    New Startup
                  </button>
                )}

                {/* Secondary balanced 2-column action grid */}
                <div className="grid grid-cols-2 gap-2 [@media(max-height:500px)]:gap-1.5">
                  {hasExistingSave && autosaveMeta?.exists && (
                    <button
                      type="button"
                      data-testid="menu-new-startup"
                      onClick={() => setView('new_lab')}
                      className="pixel-btn px-3 py-2 [@media(max-height:500px)]:py-1.5 font-pixel-display text-xs whitespace-nowrap"
                    >
                      New Startup
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid="menu-load-game"
                    onClick={() => setView('load')}
                    className="pixel-btn px-3 py-2 [@media(max-height:500px)]:py-1.5 font-pixel-display text-xs whitespace-nowrap"
                  >
                    Load Game {savedCount > 0 ? `(${savedCount})` : ''}
                  </button>

                  <button
                    type="button"
                    data-testid="menu-settings"
                    onClick={() => setView('settings')}
                    className={`pixel-btn px-3 py-2 [@media(max-height:500px)]:py-1.5 font-pixel-display text-xs whitespace-nowrap ${
                      hasExistingSave && autosaveMeta?.exists ? '' : ''
                    }`}
                  >
                    Settings
                  </button>

                  <div
                    className={`flex items-stretch [&>button]:w-full [&>button]:justify-center ${
                      hasExistingSave && autosaveMeta?.exists ? '' : 'col-span-2'
                    }`}
                  >
                    <PWAInstallButton compact testId="title-pwa-install" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: NEW STARTUP — NAME YOUR AI LAB */}
          {view === 'new_lab' && (
            <form onSubmit={handleLaunchNewLab} className="space-y-2.5 [@media(max-height:500px)]:space-y-1.5">
              <div className="text-center border-b-2 border-[#2e344b] pb-1.5">
                <h2 className="font-pixel-display text-xs sm:text-sm text-[#8de4ff]">
                  FOUND YOUR AI LAB
                </h2>
                <p className="text-[11px] text-[#b8c0cf]">
                  Choose a company name and save slot for your 2010 startup.
                </p>
              </div>

              <div>
                <label
                  htmlFor="lab-name-input"
                  className="block font-pixel-display text-[10px] sm:text-[11px] text-[#ffe478] mb-1"
                >
                  AI LAB NAME
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="lab-name-input"
                    data-testid="lab-name-input"
                    type="text"
                    maxLength={28}
                    value={labNameInput}
                    onChange={(e) => {
                      setLabNameInput(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    placeholder="e.g. AetherMind Labs"
                    autoFocus
                    className="pixel-inset flex-1 min-w-0 px-2.5 py-1.5 text-xs sm:text-sm text-[#faf7eb] placeholder-[#7c8599] focus:outline-none focus:border-[#ffe478]"
                  />
                  <button
                    type="button"
                    onClick={handleRandomName}
                    data-testid="lab-name-random"
                    className="pixel-btn px-2.5 py-1.5 text-[11px] font-pixel-display shrink-0"
                    title="Generate a random AI lab name"
                  >
                    Random
                  </button>
                </div>
                {nameError && (
                  <p role="alert" className="text-[11px] text-[#f59876] mt-1">
                    {nameError}
                  </p>
                )}
              </div>

              <div>
                <div className="font-pixel-display text-[10px] text-[#b8c0cf] mb-1">
                  SAVE SLOT
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {MANUAL_SLOTS.map((slot) => {
                    const meta = slots.find((s) => s.slotId === slot.id);
                    const active = selectedSlot === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`px-2 py-1 text-[10px] font-pixel-display truncate ${
                          active ? 'pixel-btn-gold' : 'pixel-btn'
                        }`}
                      >
                        {slot.label}
                        {meta?.exists ? ' •' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="pixel-btn px-3.5 py-2 [@media(max-height:500px)]:py-1.5 font-pixel-display text-xs"
                >
                  Back
                </button>
                <button
                  type="submit"
                  data-testid="launch-new-lab-btn"
                  className="pixel-btn-gold flex-1 py-2 [@media(max-height:500px)]:py-1.5 font-pixel-display text-xs sm:text-sm"
                >
                  Launch Startup
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: LOAD GAME (MULTI-SLOT) */}
          {view === 'load' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b-2 border-[#2e344b] pb-1.5">
                <h2 className="font-pixel-display text-xs sm:text-sm text-[#8de4ff]">
                  LOAD SAVED AI LAB
                </h2>
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="pixel-btn px-2.5 py-0.5 text-[11px] font-pixel-display"
                >
                  Back
                </button>
              </div>

              <div className="space-y-1.5 max-h-[210px] [@media(max-height:500px)]:max-h-[145px] overflow-y-auto pixel-scroll pr-1">
                {slots.map((slot) => {
                  const era = slot.eraIndex !== undefined ? ERAS[slot.eraIndex] : null;
                  return (
                    <div
                      key={slot.slotId}
                      data-testid={`load-slot-${slot.slotId}`}
                      className="pixel-inset px-2.5 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="font-pixel-display text-[10px] text-[#ffe478] uppercase">
                            {slot.label}
                          </span>
                          {slot.exists && (
                            <span className="font-semibold text-xs text-[#faf7eb] truncate">
                              {slot.labName}
                            </span>
                          )}
                        </div>
                        {slot.exists ? (
                          <div className="text-[10px] text-[#b8c0cf] tabular-nums mt-0.5 truncate">
                            {slot.year} · {era?.name ?? 'Garage'} · {formatCompactCash(slot.cash ?? 0)} · {slot.buildingCount ?? 1}/6 Bldgs
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#7c8599] mt-0.5">Empty save slot</div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={!slot.exists}
                          onClick={() => {
                            requestMobileLandscapeFullscreen();
                            loadSaveSlot(slot.slotId);
                          }}
                          className={`px-2.5 py-1 text-[10px] font-pixel-display ${
                            slot.exists ? 'pixel-btn-green' : 'pixel-btn'
                          }`}
                        >
                          Load
                        </button>
                        {slot.exists && (
                          <button
                            type="button"
                            onClick={() => deleteSaveSlot(slot.slotId)}
                            aria-label={`Delete ${slot.label}`}
                            className="pixel-btn-red px-2 py-1 text-[10px] font-pixel-display"
                          >
                            Del
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 4: TITLE SETTINGS */}
          {view === 'settings' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b-2 border-[#2e344b] pb-1.5">
                <h2 className="font-pixel-display text-xs sm:text-sm text-[#8de4ff]">
                  GAME SETTINGS
                </h2>
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="pixel-btn px-2.5 py-0.5 text-[11px] font-pixel-display"
                >
                  Back
                </button>
              </div>

              <div className="pixel-inset p-2.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#b8c0cf]">Graphics Style</span>
                  <div className="flex gap-1">
                    {SCALE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateSettings({ pixelScale: opt.value })}
                        className={`px-2 py-0.5 font-pixel-display text-[10px] ${
                          settings.pixelScale === opt.value ? 'pixel-btn-gold' : 'pixel-btn'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateSettings({ outlines: !settings.outlines })}
                    className={`flex items-center justify-between px-2 py-1 text-[11px] font-pixel-display ${
                      settings.outlines ? 'pixel-btn-green' : 'pixel-btn'
                    }`}
                  >
                    <span>Outlines</span>
                    <span>{settings.outlines ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ shadows: !settings.shadows })}
                    className={`flex items-center justify-between px-2 py-1 text-[11px] font-pixel-display ${
                      settings.shadows ? 'pixel-btn-green' : 'pixel-btn'
                    }`}
                  >
                    <span>Shadows</span>
                    <span>{settings.shadows ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ muted: !settings.muted })}
                    className={`flex items-center justify-between px-2 py-1 text-[11px] font-pixel-display ${
                      !settings.muted ? 'pixel-btn-green' : 'pixel-btn'
                    }`}
                  >
                    <span>Sound SFX</span>
                    <span>{!settings.muted ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAutomation('autoFurnish')}
                    className={`flex items-center justify-between px-2 py-1 text-[11px] font-pixel-display ${
                      autoFurnish ? 'pixel-btn-green' : 'pixel-btn'
                    }`}
                  >
                    <span>Auto-Furnish</span>
                    <span>{autoFurnish ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#2e344b]">
                  <span className="text-[11px] text-[#b8c0cf]">App Updates</span>
                  <button
                    type="button"
                    onClick={() => void checkForUpdates()}
                    className="pixel-btn-gold px-2.5 py-1 text-[10px] font-pixel-display"
                  >
                    Check Updates
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Single flat borderless bottom control hint line */}
      <div className="text-center text-[10px] sm:text-xs text-[#e6e2d3] drop-shadow-[0_2px_0_#14121d] px-2 shrink-0">
        <span className="lg:hidden">Drag Pan · Pinch Zoom · Tap Floor to Build &amp; Select</span>
        <span className="hidden lg:inline">
          WASD / Drag Pan · Q/E Rotate 90° · Scroll Zoom · R Rotate Item · Space Pause · ` Debug
        </span>
      </div>
    </div>
  );
}
