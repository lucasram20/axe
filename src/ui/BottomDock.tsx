/**
 * Classic isometric tycoon round pixel-art category dock along bottom center.
 * Single unified perimeter dock keeping the central 3D viewport unobstructed.
 */

import { useGameStore, type DrawerTab } from '../store/useGameStore';
import { PixelIcon } from './PixelIcons';

const DOCK_ITEMS: Array<{ id: Exclude<DrawerTab, null>; label: string; keyHint?: string }> = [
  { id: 'build', label: 'Build', keyHint: 'B' },
  { id: 'staff', label: 'Staff' },
  { id: 'research', label: 'Research' },
  { id: 'data', label: 'Data' },
  { id: 'models', label: 'Models' },
  { id: 'finance', label: 'Finance' },
  { id: 'rivals', label: 'Rivals' },
  { id: 'settings', label: 'Settings' },
];

export function BottomDock() {
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const trainingCount = useGameStore((s) => s.game.trainingJobs.length);
  const staffCount = useGameStore((s) => s.game.staff.length);

  return (
    <nav
      aria-label="Lab management categories"
      className="pointer-events-auto fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 pixel-frame max-w-[97vw] overflow-x-auto touch-pan-x"
    >
      {DOCK_ITEMS.map((item) => {
        const isActive = activeDrawer === item.id;
        return (
          <div key={item.id} className="flex flex-col items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                setActiveDrawer(item.id);
              }}
              aria-label={item.label}
              aria-pressed={isActive}
              title={item.keyHint ? `${item.label} (${item.keyHint})` : item.label}
              className={`pixel-round-btn relative ${isActive ? 'active' : ''}`}
            >
              <PixelIcon name={item.id} size={22} />
              {item.id === 'models' && trainingCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1 text-[10px] font-pixel-display bg-[#8ce063] text-[#14121d] border border-[#14121d]">
                  {trainingCount}
                </span>
              )}
              {item.id === 'staff' && (
                <span className="absolute -top-1 -right-1 px-1 text-[10px] font-pixel-display bg-[#4ea8de] text-[#14121d] border border-[#14121d]">
                  {staffCount}
                </span>
              )}
            </button>
            <span
              className={`text-[10px] sm:text-[11px] font-pixel-display leading-none whitespace-nowrap ${
                isActive ? 'text-[#ffe478]' : 'text-[#b8c0cf]'
              }`}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
