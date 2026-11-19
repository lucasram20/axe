/**
 * Compact bottom-left selection inspector for clicked equipment or staff members.
 */

import { BALANCE } from '../data/balance';
import { CATALOG_BY_ID } from '../data/items';
import { STAFF_ROLES, STAFF_TRAIT_BY_ID } from '../data/staff';
import { useGameStore } from '../store/useGameStore';
import { PixelIcon } from './PixelIcons';

export function SelectionPanel() {
  const game = useGameStore((s) => s.game);
  const selectedItemUid = useGameStore((s) => s.selectedItemUid);
  const selectedStaffId = useGameStore((s) => s.selectedStaffId);
  const selectItemUid = useGameStore((s) => s.selectItemUid);
  const selectStaffId = useGameStore((s) => s.selectStaffId);
  const startMovingItem = useGameStore((s) => s.startMovingItem);
  const sellItemByUid = useGameStore((s) => s.sellItemByUid);
  const fireStaffMember = useGameStore((s) => s.fireStaffMember);
  const activeDrawer = useGameStore((s) => s.activeDrawer);

  if (activeDrawer !== null) return null;

  if (selectedItemUid) {
    const item = game.items.find((i) => i.uid === selectedItemUid);
    const def = item ? CATALOG_BY_ID[item.itemId] : null;
    if (!item || !def) return null;
    const refund = Math.round(def.cost * BALANCE.sellRefundRatio);

    return (
      <aside
        aria-label="Selected equipment"
        className="pointer-events-auto fixed bottom-[86px] left-2 right-14 md:bottom-3 md:left-3 md:right-auto md:w-[260px] z-20 pixel-frame p-2.5 sm:p-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 pixel-inset shrink-0">
              <PixelIcon name={def.iconKey} size={22} />
            </div>
            <div className="min-w-0">
              <div className="font-pixel-display text-xs text-[#ffe478] truncate">
                {def.name}
              </div>
              <div className="text-[11px] text-[#8de4ff]">{def.shortStat}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => selectItemUid(null)}
            aria-label="Close inspector"
            className="pixel-btn px-1.5 py-0.5 text-[10px] font-pixel-display"
          >
            X
          </button>
        </div>
        <p className="text-xs text-[#b8c0cf] mt-2 leading-snug">{def.description}</p>
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => startMovingItem(item.uid)}
            className="pixel-btn flex-1 py-1 text-xs font-pixel-display"
          >
            Move
          </button>
          <button
            type="button"
            onClick={() => sellItemByUid(item.uid)}
            className="pixel-btn-red flex-1 py-1 text-xs font-pixel-display"
          >
            Sell +${refund.toLocaleString()}
          </button>
        </div>
      </aside>
    );
  }

  if (selectedStaffId) {
    const member = game.staff.find((s) => s.id === selectedStaffId);
    if (!member) return null;
    const role = STAFF_ROLES[member.role];
    const trait = STAFF_TRAIT_BY_ID[member.traitId];

    return (
      <aside
        aria-label="Selected staff member"
        className="pointer-events-auto fixed bottom-[86px] left-2 right-14 md:bottom-3 md:left-3 md:right-auto md:w-[265px] z-20 pixel-frame p-2.5 sm:p-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-pixel-display text-xs text-[#ffe478]">
              {member.name}
            </div>
            <div className="text-[11px] text-[#8de4ff]">
              {role.label} · Lv.{member.skill}
            </div>
          </div>
          <button
            type="button"
            onClick={() => selectStaffId(null)}
            aria-label="Close inspector"
            className="pixel-btn px-1.5 py-0.5 text-[10px] font-pixel-display"
          >
            X
          </button>
        </div>

        <div className="mt-2 space-y-1 text-xs tabular-nums">
          <div className="flex justify-between text-[#b8c0cf]">
            <span>Mood</span>
            <span className="text-[#8ce063]">{Math.round(member.mood)}%</span>
          </div>
          <div className="flex justify-between text-[#b8c0cf]">
            <span>Energy</span>
            <span className="text-[#ffe478]">{Math.round(member.energy)}%</span>
          </div>
          <div className="flex justify-between text-[#b8c0cf]">
            <span>Task</span>
            <span className="text-[#faf7eb]">{member.activity.replace(/_/g, ' ')}</span>
          </div>
          <div className="text-[11px] text-[#8c96ab] pt-1">
            Trait: {trait?.name} — {trait?.description}
          </div>
        </div>

        <button
          type="button"
          onClick={() => fireStaffMember(member.id)}
          className="pixel-btn-red w-full mt-2.5 py-1 text-xs font-pixel-display"
        >
          Dismiss (${member.salaryPerDay}/day)
        </button>
      </aside>
    );
  }

  return null;
}
