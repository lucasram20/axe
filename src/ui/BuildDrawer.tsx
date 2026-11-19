/**
 * Build menu drawer anchored directly above the bottom dock.
 * Supports category filters, Rotate [R], Sell mode, item cards with pixel icons,
 * costs, short stat lines, and hover detail tooltips.
 */

import { useState } from 'react';
import { CATALOG_ITEMS, type CatalogItem, type ItemCategory } from '../data/items';
import { isItemUnlocked } from '../sim/grid';
import { useGameStore } from '../store/useGameStore';
import { PixelIcon } from './PixelIcons';

const CATEGORIES: Array<{ id: ItemCategory; label: string }> = [
  { id: 'compute', label: 'Compute' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'infra', label: 'Power & Cool' },
  { id: 'floors', label: 'Floors' },
  { id: 'decor', label: 'Walls & Decor' },
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

  const items = CATALOG_ITEMS.filter((i) => i.category === category);

  return (
    <section
      aria-label="Build menu"
      className="pointer-events-auto fixed bottom-[84px] sm:bottom-[104px] [@media(max-height:500px)]:bottom-[68px] left-1/2 -translate-x-1/2 z-20 w-[min(940px,96vw)] max-h-[calc(100dvh-180px)] [@media(max-height:500px)]:max-h-[calc(100dvh-126px)] overflow-y-auto pixel-scroll pixel-frame p-2.5 sm:p-3 [@media(max-height:500px)]:p-2"
    >
      {/* Header row: category tabs + Rotate/Sell/Close tools */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b-2 border-[#2e344b]">
        <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="Build categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={category === cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-2.5 py-1 text-xs font-pixel-display whitespace-nowrap ${
                category === cat.id ? 'pixel-btn-gold' : 'pixel-btn'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={rotateBuild}
            className="px-2.5 py-1 text-xs font-pixel-display pixel-btn whitespace-nowrap"
            title="Rotate placement footprint (R)"
          >
            Rotate ({buildRotation * 90}°)
          </button>
          <button
            type="button"
            onClick={() => setBuildTool(buildTool === 'sell' ? 'select' : 'sell')}
            className={`px-2.5 py-1 text-xs font-pixel-display whitespace-nowrap ${
              buildTool === 'sell' ? 'pixel-btn-red' : 'pixel-btn'
            }`}
          >
            {buildTool === 'sell' ? 'Selling (Click Item)' : 'Sell Mode'}
          </button>
          <button
            type="button"
            onClick={() => setActiveDrawer(null)}
            aria-label="Close build menu"
            className="px-2 py-1 text-xs font-pixel-display pixel-btn"
          >
            X
          </button>
        </div>
      </div>

      {/* Item cards strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pixel-scroll pr-1">
        {items.map((item) => {
          const unlocked = isItemUnlocked(game, item.id);
          const affordable = game.cash >= item.cost;
          const selected = buildTool === 'place' && buildItemId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              disabled={!unlocked}
              onMouseEnter={() => setHovered(item)}
              onMouseLeave={() => setHovered((cur) => (cur?.id === item.id ? null : cur))}
              onClick={() => selectBuildItem(item.id)}
              className={`text-left p-2 flex items-start gap-2 ${
                selected ? 'pixel-btn-gold' : 'pixel-btn'
              }`}
            >
              <div className="p-1 pixel-inset shrink-0">
                <PixelIcon name={item.iconKey} size={22} />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="font-semibold text-[13px] leading-snug">
                  {item.name}
                </div>
                <div
                  className={`font-pixel-display text-[11px] tabular-nums mt-0.5 ${
                    selected
                      ? 'text-[#14121d]'
                      : affordable
                        ? 'text-[#ffe478]'
                        : 'text-[#f59876]'
                  }`}
                >
                  ${item.cost.toLocaleString()}
                </div>
                <div
                  className={`text-[11px] mt-0.5 ${
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
      <div className="mt-2 pt-1.5 border-t-2 border-[#2e344b] flex items-center justify-between gap-2 text-xs text-[#b8c0cf]">
        <span className="truncate">
          {hovered
            ? `${hovered.name} (${hovered.footprint[0]}x${hovered.footprint[1]}): ${hovered.description}`
            : buildTool === 'place' && buildItemId
              ? 'Click a valid green floor tile to build · R to rotate · Right-click to cancel'
              : buildTool === 'sell'
                ? 'Click any placed machine or desk to refund 72% of its cost'
                : 'Select an item card to place on the isometric floor grid'}
        </span>
        <span className="font-pixel-display text-[11px] text-[#8de4ff] shrink-0">
          {hovered ? hovered.shortStat : ''}
        </span>
      </div>
    </section>
  );
}
