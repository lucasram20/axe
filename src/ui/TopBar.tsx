/**
 * Ornate pixel-framed top resource bar:
 * Cash & net/sec, Compute (used/total), Power, Cooling, Reputation, Date/Era,
 * Speed controls (Pause/1x/2x/4x), Mute, and Pause menu button.
 * Adapts cleanly to a compact 2-row bar on narrow mobile phones.
 */

import { useRef } from 'react';
import { ERAS } from '../data/techs';
import { useGameStore, useResourceSnapshot } from '../store/useGameStore';
import { PixelIcon } from './PixelIcons';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

export function TopBar() {
  const game = useGameStore((s) => s.game);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const setScreen = useGameStore((s) => s.setScreen);
  const toggleCheatMenu = useGameStore((s) => s.toggleCheatMenu);
  const res = useResourceSnapshot();

  // Hidden mobile gesture: 5 rapid taps on the Date/Era readout toggles the secret menu
  const secretTapRef = useRef<{ count: number; lastAt: number }>({ count: 0, lastAt: 0 });
  const handleDateTap = () => {
    const now = Date.now();
    if (now - secretTapRef.current.lastAt > 1800) {
      secretTapRef.current.count = 1;
    } else {
      secretTapRef.current.count += 1;
    }
    secretTapRef.current.lastAt = now;
    if (secretTapRef.current.count >= 5) {
      secretTapRef.current.count = 0;
      toggleCheatMenu();
    }
  };

  const era = ERAS[Math.min(game.eraIndex, ERAS.length - 1)];
  const absNetSec = Math.abs(Math.round(res.netPerSecond));
  const netLabel = `${res.netPerSecond >= 0 ? '+' : '-'}$${absNetSec}/s`;
  const monthLabel = MONTHS[(game.month - 1) % 12];
  const isNight = game.timeOfDay < 0.22 || game.timeOfDay > 0.78;

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      // Ignore if browser blocks Fullscreen API
    }
  };
  const canFullscreen =
    typeof document !== 'undefined' && typeof document.documentElement?.requestFullscreen === 'function';

  return (
    <header
      className="pointer-events-auto fixed top-1.5 sm:top-2 [@media(max-height:500px)]:top-1 left-1.5 sm:left-2 right-1.5 sm:right-2 z-20 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 [@media(max-height:500px)]:py-1 pixel-frame-gold"
      aria-label="Lab status bar"
    >
      {/* Row 1 (Mobile) / Left (Desktop): Financial & Core Compute Resources */}
      <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 md:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 md:gap-4 min-w-0">
          {/* Cash & income/sec */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" title="Cash balance and net cashflow per second">
            <PixelIcon name="cash" size={18} />
            <div className="leading-tight">
              <div className="font-pixel-display text-xs sm:text-sm text-[#ffe478] tabular-nums" data-testid="hud-cash">
                {formatMoney(game.cash)}
              </div>
              <div
                className={`text-[10px] sm:text-[11px] tabular-nums ${
                  res.netPerSecond >= 0 ? 'text-[#8ce063]' : 'text-[#f59876]'
                }`}
              >
                {netLabel}
              </div>
            </div>
          </div>

          <div className="h-7 w-[2px] bg-[#2e344b] hidden sm:block" aria-hidden="true" />

          {/* Compute Used / Total */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" title="Allocated vs Total Compute (TFLOPS)">
            <PixelIcon name="compute" size={18} />
            <div className="leading-tight">
              <div className="text-[9px] sm:text-[10px] text-[#8c96ab] uppercase tracking-wider">TF</div>
              <div className="font-pixel-display text-[11px] sm:text-xs text-[#8de4ff] tabular-nums" data-testid="hud-compute">
                {res.computeUsed}/{res.computeTotal}
                <span className="hidden sm:inline"> TF</span>
              </div>
            </div>
          </div>

          {/* Power */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" title="Power Demand vs Grid + Generator Supply">
            <PixelIcon name="power" size={16} />
            <div className="leading-tight">
              <div className="text-[9px] sm:text-[10px] text-[#8c96ab] uppercase tracking-wider">Pwr</div>
              <div
                className={`font-pixel-display text-[11px] sm:text-xs tabular-nums ${
                  res.isUnderpowered ? 'text-[#e0534f]' : 'text-[#ffe478]'
                }`}
              >
                {res.powerDemand}/{res.powerSupply}
                <span className="hidden sm:inline">kW</span>
              </div>
            </div>
          </div>

          {/* Cooling */}
          <div className="hidden lg:flex items-center gap-1.5" title="Thermal Heat Load vs Cooling Supply">
            <PixelIcon name="cooling" size={18} />
            <div className="leading-tight">
              <div className="text-[10px] text-[#8c96ab] uppercase tracking-wider">Thermal</div>
              <div
                className={`font-pixel-display text-xs tabular-nums ${
                  res.isOverheated ? 'text-[#e0534f]' : 'text-[#8de4ff]'
                }`}
              >
                {res.heatLoad}/{res.coolingSupply}
              </div>
            </div>
          </div>

          {/* Reputation & Safety */}
          <div className="hidden xl:flex items-center gap-1.5" title="Lab Reputation & Safety Index">
            <PixelIcon name="rep" size={18} />
            <div className="leading-tight">
              <div className="text-[10px] text-[#8c96ab] uppercase tracking-wider">Rep · Safety</div>
              <div className="font-pixel-display text-xs text-[#faf7eb] tabular-nums">
                {Math.round(game.reputation)} · {Math.round(game.safety)}%
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-only compact Menu button on Row 1 right */}
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            setScreen('paused');
          }}
          aria-label="Open pause menu"
          className="sm:hidden px-2 py-1 text-[11px] font-pixel-display pixel-btn whitespace-nowrap shrink-0"
        >
          Menu
        </button>
      </div>

      {/* Row 2 (Mobile) / Right (Desktop): Date/Era + Speed Controls + Utility Buttons */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 sm:ml-auto border-t border-[#2e344b] sm:border-t-0 pt-1 sm:pt-0">
        <div
          onClick={handleDateTap}
          className="text-left sm:text-right leading-tight min-w-0"
        >
          <div className="font-pixel-display text-[11px] sm:text-xs text-[#faf7eb] tabular-nums truncate" data-testid="hud-date">
            {monthLabel} {game.dayOfMonth}, {game.year}
            <span className="hidden lg:inline"> · {isNight ? 'Night' : 'Day'}</span>
          </div>
          <div className="text-[10px] sm:text-[11px] truncate" style={{ color: era.accentColor }}>
            Era {era.index + 1}: {era.name}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Speed Controls */}
          <div className="flex items-center gap-0.5 sm:gap-1 pixel-inset p-0.5" role="group" aria-label="Simulation speed">
            {([0, 1, 2, 4] as const).map((spd) => {
              const label = spd === 0 ? '||' : `${spd}x`;
              const active = game.speed === spd;
              return (
                <button
                  key={spd}
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setSpeed(spd);
                  }}
                  aria-label={spd === 0 ? 'Pause simulation' : `Set speed to ${spd}x`}
                  className={`px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-pixel-display whitespace-nowrap ${
                    active ? 'pixel-btn-gold' : 'pixel-btn'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 1-tap Fullscreen button on mobile/tablet */}
          {canFullscreen && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                toggleFullscreen();
              }}
              aria-label="Toggle fullscreen"
              title="Toggle Fullscreen"
              data-testid="hud-fullscreen"
              className="lg:hidden px-1.5 py-1 text-[11px] font-pixel-display pixel-btn whitespace-nowrap"
            >
              FS
            </button>
          )}

          {/* Audio Mute */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              updateSettings({ muted: !game.settings.muted });
            }}
            aria-label={game.settings.muted ? 'Unmute audio' : 'Mute audio'}
            title="Toggle Sound (M)"
            className="px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-pixel-display pixel-btn whitespace-nowrap"
          >
            <span className="lg:hidden">{game.settings.muted ? 'MUTE' : 'SFX'}</span>
            <span className="hidden lg:inline">{game.settings.muted ? 'SFX:OFF' : 'SFX:ON'}</span>
          </button>

          {/* Desktop / Landscape Pause Menu button */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setScreen('paused');
            }}
            aria-label="Open pause menu"
            title="Pause Menu (Esc)"
            className="hidden sm:inline-block px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-pixel-display pixel-btn whitespace-nowrap"
          >
            Menu
          </button>
        </div>
      </div>
    </header>
  );
}
