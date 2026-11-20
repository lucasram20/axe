/**
 * Build menu drawer anchored cleanly above the bottom dock.
 * Includes HQ Building Space Upgrade banner, Auto-Furnish automation toggle,
 * 1-tap Auto-Furnish button, and category item cards.
 */

import { useState } from 'react';
import { CATALOG_ITEMS, type CatalogItem, type ItemCategory } from '../data/items';
import { BUILDING_TIERS, canUpgradeBuilding } from '../sim/facility';
import { isItemUnlocked } from '../sim/grid';
import { useGameStore } from '../store/useGameStore';
import { PixelIcon } from './PixelIcons';

const CATEGORIES: Array<{ id: ItemCategory; label: string }> = [
  { id: 'compute', label: 'Compute' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'infra', label: 'Power & Cool' },
  { id: 'floors', label: 'Floors' },
  { id: 'decor', label: 'Decor' },
];

export function BuildDrawer() {
  const [category, setCategory] = useState<ItemCategory>('compute');
  const [hovered, setHovered] = useState<CatalogItem | null>(null);

  const game = useGameStore((s) => s.game);
  const buildTool = useGameStore((s) => s.buildTool);
  const buildItemId = useGameStore((s) => s.buildItemId);
  const buildRotation = useGameStore((s) => s.buildRotation);
  const selectBuildItem = useGameStore((s) => s.selectBuildItem);
  const setBuildTool = useGameStore((s) => s.setBuildTool);
  const rotateBuild = useGameStore((s) => s.rotateBuild);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const upgradeBuilding = useGameStore((s) => s.upgradeBuilding);
  const autoFurnishNow = useGameStore((s) => s.autoFurnishNow);
  const toggleAutomation = useGameStore((s) => s.toggleAutomation);

  const items = CATALOG_ITEMS.filter((i) => i.category === category);
  const currentTier = BUILDING_TIERS[game.buildingTier ?? 0] ?? BUILDING_TIERS[0];
  const upgradeInfo = canUpgradeBuilding(game);

  return (
    <section
      aria-label="Build menu"
      className="pointer-events-auto fixed bottom-[84px] sm:bottom-[104px] [@media(max-height:500px)]:bottom-[54px] left-1/2 -translate-x-1/2 z-20 w-[min(940px,96vw)] max-h-[calc(100dvh-176px)] [@media(max-height:500px)]:max-h-[calc(100dvh-98px)] overflow-y-auto pixel-scroll pixel-frame p-2.5 sm:p-3 [@media(max-height:500px)]:p-2"
    >
      {/* HQ Facility Expansion & Auto-Furnish Strip */}
      <div className="pixel-inset px-2.5 py-1.5 [@media(max-height:500px)]:px-2 [@media(max-height:500px)]:py-1 mb-2 [@media(max-height:500px)]:mb-1.5 flex flex-wrap [@media(max-height:500px)]:flex-nowrap items-center justify-between gap-2 [@media(max-height:500px)]:gap-1.5">
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1.5 flex-wrap [@media(max-height:500px)]:flex-nowrap">
            <span className="font-pixel-display text-[11px] sm:text-xs [@media(max-height:500px)]:text-[10px] text-[#ffe478] whitespace-nowrap truncate">
              HQ Tier {(game.buildingTier ?? 0) + 1}: {currentTier.name}
            </span>
            <span className="text-[10px] text-[#8de4ff] font-pixel-display [@media(max-height:500px)]:hidden">
              ({currentTier.tagline})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap [@media(max-height:500px)]:flex-nowrap items-center gap-1.5 [@media(max-height:500px)]:gap-1 shrink-0">
          {upgradeInfo.nextTier ? (
            <button
              type="button"
              disabled={!upgradeInfo.ok}
              onClick={upgradeBuilding}
              data-testid="hq-upgrade-btn"
              className={`px-2.5 py-1 [@media(max-height:500px)]:px-2 [@media(max-height:500px)]:py-0.5 text-[11px] [@media(max-height:500px)]:text-[10px] font-pixel-display whitespace-nowrap ${
                upgradeInfo.ok ? 'pixel-btn-gold' : 'pixel-btn'
              }`}
              title={`Expand building to ${upgradeInfo.nextTier.name} (${upgradeInfo.nextTier.tagline})`}
            >
              Expand → {upgradeInfo.nextTier.name} (
              {game.cheatFreeBuild ? 'FREE' : `$${upgradeInfo.nextTier.upgradeCost.toLocaleString()}`})
            </button>
          ) : (
            <span
              data-testid="hq-max-badge"
              className="px-2 py-1 [@media(max-height:500px)]:py-0.5 text-[10px] font-pixel-display bg-[#2f6e49] text-[#faf7eb] border border-[#14121d] whitespace-nowrap"
            >
              MAX HQ SPACE
            </span>
          )}

          <button
            type="button"
            onClick={() => toggleAutomation('autoFurnish')}
            data-testid="toggle-auto-furnish"
            className={`px-2 py-1 [@media(max-height:500px)]:px-1.5 [@media(max-height:500px)]:py-0.5 text-[11px] [@media(max-height:500px)]:text-[10px] font-pixel-display whitespace-nowrap ${
              game.automation.autoFurnish ? 'pixel-btn-green' : 'pixel-btn'
            }`}
            title="Automatically place desks, amenities, power & cooling as your lab grows"
          >
            Auto-Furnish: {game.automation.autoFurnish ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={autoFurnishNow}
            data-testid="auto-furnish-now"
            className="px-2 py-1 [@media(max-height:500px)]:px-1.5 [@media(max-height:500px)]:py-0.5 text-[11px] [@media(max-height:500px)]:text-[10px] font-pixel-display pixel-btn whitespace-nowrap"
            title="Neatly furnish desks, lounge & power/cooling right now"
          >
            Furnish Now
          </button>
        </div>
      </div>

      {/* Header row: category tabs + Rotate/Sell/Close tools */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 [@media(max-height:500px)]:pb-1 mb-2 [@media(max-height:500px)]:mb-1.5 border-b-2 border-[#2e344b]">
        <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="Build categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={category === cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-pixel-display whitespace-nowrap ${
                category === cat.id ? 'pixel-btn-gold' : 'pixel-btn'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={rotateBuild}
            className="px-2 py-1 text-[11px] sm:text-xs font-pixel-display pixel-btn whitespace-nowrap"
            title="Rotate placement footprint (R)"
          >
            Rot {buildRotation * 90}°
          </button>
          <button
            type="button"
            onClick={() => setBuildTool(buildTool === 'sell' ? 'select' : 'sell')}
            className={`px-2 py-1 text-[11px] sm:text-xs font-pixel-display whitespace-nowrap ${
              buildTool === 'sell' ? 'pixel-btn-red' : 'pixel-btn'
            }`}
          >
            {buildTool === 'sell' ? 'Selling' : 'Sell'}
          </button>
          <button
            type="button"
            onClick={() => setActiveDrawer(null)}
            aria-label="Close build menu"
            className="px-2 py-1 text-[11px] sm:text-xs font-pixel-display pixel-btn"
          >
            X
          </button>
        </div>
      </div>

      {/* Item cards strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2 max-h-[200px] [@media(max-height:500px)]:max-h-[158px] overflow-y-auto pixel-scroll pr-1">
        {items.map((item) => {
          const unlocked = isItemUnlocked(game, item.id);
          const cost = game.cheatFreeBuild ? 0 : item.cost;
          const affordable = game.cash >= cost;
          const selected = buildTool === 'place' && buildItemId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              disabled={!unlocked}
              onMouseEnter={() => setHovered(item)}
              onMouseLeave={() => setHovered((cur) => (cur?.id === item.id ? null : cur))}
              onClick={() => selectBuildItem(item.id)}
              className={`text-left p-1.5 sm:p-2 flex items-start gap-2 ${
                selected ? 'pixel-btn-gold' : 'pixel-btn'
              }`}
            >
              <div className="p-1 pixel-inset shrink-0">
                <PixelIcon name={item.iconKey} size={20} />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="font-semibold text-[12px] sm:text-[13px] leading-snug truncate">
                  {item.name}
                </div>
                <div
                  className={`font-pixel-display text-[10px] sm:text-[11px] tabular-nums mt-0.5 ${
                    selected
                      ? 'text-[#14121d]'
                      : affordable
                        ? 'text-[#ffe478]'
                        : 'text-[#f59876]'
                  }`}
                >
                  {cost === 0 ? 'FREE' : `$${cost.toLocaleString()}`}
                </div>
                <div
                  className={`text-[10px] sm:text-[11px] mt-0.5 truncate ${
                    selected ? 'text-[#1f2233]' : 'text-[#b8c0cf]'
                  }`}
                >
                  {unlocked ? item.shortStat : `Unlocks Era ${(item.unlockEra ?? 0) + 1}`}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tooltip / Placement Hint Footer */}
      <div className="mt-1.5 pt-1 border-t-2 border-[#2e344b] flex [@media(max-height:500px)]:hidden items-center justify-between gap-2 text-[11px] text-[#b8c0cf]">
        <span className="truncate">
          {hovered
            ? `${hovered.name} (${hovered.footprint[0]}x${hovered.footprint[1]}): ${hovered.description}`
            : buildTool === 'place' && buildItemId
              ? 'Tap a valid green floor tile to build · R to rotate · Right-click to cancel'
              : buildTool === 'sell'
                ? 'Tap any placed machine or desk to refund 72% of its cost'
                : 'Auto-Furnish handles desks & power automatically, or build custom hardware anytime'}
        </span>
        <span className="font-pixel-display text-[10px] text-[#8de4ff] shrink-0">
          {hovered ? hovered.shortStat : ''}
        </span>
      </div>
    </section>
  );
}
