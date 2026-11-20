/**
 * Sleek pixel-framed top resource bar:
 * Cash & net/sec, Compute (used/total), Power, Cooling, Reputation, Date/Era,
 * Speed controls (Pause/1x/2x/4x), Mute, and Pause menu button.
 * Renders as ONE ultra-compact horizontal strip on mobile landscape & desktop
 * so the 3D lab gets maximum breathing room. Fullscreen button removed.
 */

import { useRef } from 'react';
import { ERAS } from '../data/techs';
import { useGameStore, useResourceSnapshot } from '../store/useGameStore';
import { PixelIcon } from './PixelIcons';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

function formatCompactNet(n: number): string {
  const abs = Math.abs(Math.round(n));
  const sign = n >= 0 ? '+' : '-';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M/s`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K/s`;
  return `${sign}$${abs}/s`;
}

export function TopBar() {
  const game = useGameStore((s) => s.game);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const updateSettings = useGameStore((s) => s.updateSettings);
  const setScreen = useGameStore((s) => s.setScreen);
  const toggleCheatMenu = useGameStore((s) => s.toggleCheatMenu);
  const res = useResourceSnapshot();

  // Hidden mobile gesture: 5 rapid taps on the Date/Era readout toggles the secret Founder Vault
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
  const netLabel = formatCompactNet(res.netPerSecond);
  const monthLabel = MONTHS[(game.month - 1) % 12];
  const isNight = game.timeOfDay < 0.22 || game.timeOfDay > 0.78;

  return (
    <header
      className="pointer-events-auto fixed top-1.5 sm:top-2 [@media(max-height:500px)]:top-1 left-1.5 sm:left-2 right-1.5 sm:right-2 z-20 flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 [@media(max-height:500px)]:px-2 [@media(max-height:500px)]:py-0.5 pixel-frame-gold"
      aria-label="Lab status bar"
    >
      {/* Left: Lab Name (desktop) + Financial & Core Compute Resources (single compact line, never wraps on landscape mobile!) */}
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 overflow-hidden">
        {/* Custom AI Lab Name (desktop lg+ only so mobile landscape stays ultra-spacious) */}
        <div
          className="hidden lg:flex flex-col leading-none shrink-0 max-w-[156px]"
          title={`${game.labName} · ${1 + (game.ownedLandIds?.length ?? 0)}/6 Campus Buildings`}
        >
          <div
            className="font-pixel-display text-xs text-[#faf7eb] truncate"
            data-testid="hud-lab-name"
          >
            {game.labName}
          </div>
          <div className="text-[9px] text-[#8de4ff] tabular-nums mt-0.5">
            {1 + (game.ownedLandIds?.length ?? 0)}/6 Bldgs
          </div>
        </div>

        <div className="h-6 w-[2px] bg-[#2e344b] hidden lg:block" aria-hidden="true" />

        {/* Cash & income/sec */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0" title="Cash balance and net cashflow per second">
          <PixelIcon name="cash" size={16} />
          <div className="leading-none">
            <div className="font-pixel-display text-[11px] sm:text-sm [@media(max-height:500px)]:text-[11px] text-[#ffe478] tabular-nums" data-testid="hud-cash">
              {formatMoney(game.cash)}
            </div>
            <div
              className={`text-[9px] sm:text-[11px] [@media(max-height:500px)]:text-[9px] tabular-nums mt-0.5 ${
                res.netPerSecond >= 0 ? 'text-[#8ce063]' : 'text-[#f59876]'
              }`}
            >
              {netLabel}
            </div>
          </div>
        </div>

        <div className="h-6 w-[2px] bg-[#2e344b] hidden sm:block [@media(max-height:500px)]:h-5" aria-hidden="true" />

        {/* Compute Used / Total */}
        <div className="flex items-center gap-1 shrink-0" title="Allocated vs Total Compute (TFLOPS)">
          <PixelIcon name="compute" size={15} />
          <div className="leading-none">
            <div className="text-[8px] sm:text-[10px] [@media(max-height:500px)]:text-[8px] text-[#8c96ab] uppercase tracking-wider">TF</div>
            <div className="font-pixel-display text-[10px] sm:text-xs [@media(max-height:500px)]:text-[10px] text-[#8de4ff] tabular-nums mt-0.5" data-testid="hud-compute">
              {res.computeUsed}/{res.computeTotal}
            </div>
          </div>
        </div>

        {/* Power */}
        <div className="flex items-center gap-1 shrink-0" title="Power Demand vs Grid + Generator Supply">
          <PixelIcon name="power" size={14} />
          <div className="leading-none">
            <div className="text-[8px] sm:text-[10px] [@media(max-height:500px)]:text-[8px] text-[#8c96ab] uppercase tracking-wider">Pwr</div>
            <div
              className={`font-pixel-display text-[10px] sm:text-xs [@media(max-height:500px)]:text-[10px] tabular-nums mt-0.5 ${
                res.isUnderpowered ? 'text-[#e0534f]' : 'text-[#ffe478]'
              }`}
            >
              {res.powerDemand}/{res.powerSupply}
            </div>
          </div>
        </div>

        {/* Cooling */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0" title="Thermal Heat Load vs Cooling Supply">
          <PixelIcon name="cooling" size={17} />
          <div className="leading-none">
            <div className="text-[10px] text-[#8c96ab] uppercase tracking-wider">Thermal</div>
            <div
              className={`font-pixel-display text-xs tabular-nums mt-0.5 ${
                res.isOverheated ? 'text-[#e0534f]' : 'text-[#8de4ff]'
              }`}
            >
              {res.heatLoad}/{res.coolingSupply}
            </div>
          </div>
        </div>

        {/* Reputation & Safety */}
        <div className="hidden xl:flex items-center gap-1.5 shrink-0" title="Lab Reputation & Safety Index">
          <PixelIcon name="rep" size={17} />
          <div className="leading-none">
            <div className="text-[10px] text-[#8c96ab] uppercase tracking-wider">Rep · Safety</div>
            <div className="font-pixel-display text-xs text-[#faf7eb] tabular-nums mt-0.5">
              {Math.round(game.reputation)} · {Math.round(game.safety)}%
            </div>
          </div>
        </div>
      </div>

      {/* Right: Date/Era + Speed Controls + Mute & Menu (zero fullscreen buttons!) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div
          onClick={handleDateTap}
          className="text-right leading-none min-w-0 cursor-default"
        >
          <div
            className="font-pixel-display text-[10px] sm:text-xs [@media(max-height:500px)]:text-[10px] text-[#faf7eb] tabular-nums whitespace-nowrap"
            data-testid="hud-date"
          >
            {monthLabel} {game.dayOfMonth}, {game.year}
            <span className="hidden lg:inline"> · {isNight ? 'Night' : 'Day'}</span>
          </div>
          <div
            className="text-[9px] sm:text-[11px] [@media(max-height:500px)]:text-[9px] truncate max-w-[118px] sm:max-w-[180px] mt-0.5"
            style={{ color: era.accentColor }}
          >
            E{era.index + 1}: {era.name}
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-0.5 pixel-inset p-0.5" role="group" aria-label="Simulation speed">
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
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 [@media(max-height:500px)]:px-1.5 [@media(max-height:500px)]:py-0.5 text-[10px] sm:text-xs [@media(max-height:500px)]:text-[10px] font-pixel-display whitespace-nowrap ${
                  active ? 'pixel-btn-gold' : 'pixel-btn'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

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
          className="px-1.5 sm:px-2 py-0.5 sm:py-1 [@media(max-height:500px)]:px-1.5 [@media(max-height:500px)]:py-0.5 text-[10px] sm:text-xs [@media(max-height:500px)]:text-[10px] font-pixel-display pixel-btn whitespace-nowrap"
        >
          <span className="lg:hidden">{game.settings.muted ? 'OFF' : 'SFX'}</span>
          <span className="hidden lg:inline">{game.settings.muted ? 'SFX:OFF' : 'SFX:ON'}</span>
        </button>

        {/* Pause Menu button */}
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            setScreen('paused');
          }}
          aria-label="Open pause menu"
          title="Pause Menu (Esc)"
          className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 [@media(max-height:500px)]:px-1.5 [@media(max-height:500px)]:py-0.5 text-[10px] sm:text-xs [@media(max-height:500px)]:text-[10px] font-pixel-display pixel-btn whitespace-nowrap"
        >
          Menu
        </button>
      </div>
    </header>
  );
}
