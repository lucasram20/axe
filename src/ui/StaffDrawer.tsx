/**
 * Staff roster & hiring drawer.
 */

import { useState } from 'react';
import { BALANCE } from '../data/balance';
import { STAFF_ROLES, STAFF_TRAIT_BY_ID } from '../data/staff';
import { countDeskSlots } from '../sim/staffSim';
import { useGameStore } from '../store/useGameStore';

export function StaffDrawer() {
  const [tab, setTab] = useState<'hire' | 'roster'>('hire');
  const game = useGameStore((s) => s.game);
  const hireStaff = useGameStore((s) => s.hireStaff);
  const fireStaffMember = useGameStore((s) => s.fireStaffMember);
  const refreshStaffPool = useGameStore((s) => s.refreshStaffPool);
  const selectStaffId = useGameStore((s) => s.selectStaffId);
  const toggleAutomation = useGameStore((s) => s.toggleAutomation);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);

  const deskSlots = countDeskSlots(game);
  const autoHireUnlocked = game.unlockedTechs.includes('tech_auto_hire');

  return (
    <section
      aria-label="Staff management"
      className="pointer-events-auto fixed bottom-[84px] sm:bottom-[104px] left-1/2 -translate-x-1/2 z-20 w-[min(860px,96vw)] max-h-[calc(100dvh-180px)] overflow-y-auto pixel-scroll pixel-frame p-2.5 sm:p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b-2 border-[#2e344b]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('hire')}
            className={`px-3 py-1 text-xs font-pixel-display ${
              tab === 'hire' ? 'pixel-btn-gold' : 'pixel-btn'
            }`}
          >
            Hire Candidates ({game.candidates.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('roster')}
            className={`px-3 py-1 text-xs font-pixel-display ${
              tab === 'roster' ? 'pixel-btn-gold' : 'pixel-btn'
            }`}
          >
            Team Roster ({game.staff.length}/{deskSlots} Desks)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {autoHireUnlocked && (
            <button
              type="button"
              onClick={() => toggleAutomation('autoHireStaff')}
              className={`px-2.5 py-1 text-xs font-pixel-display ${
                game.automation.autoHireStaff ? 'pixel-btn-green' : 'pixel-btn'
              }`}
            >
              Auto-Hire: {game.automation.autoHireStaff ? 'ON' : 'OFF'}
            </button>
          )}
          {tab === 'hire' && (
            <button
              type="button"
              onClick={refreshStaffPool}
              disabled={game.cash < BALANCE.candidateRefreshCost}
              className="px-2.5 py-1 text-xs font-pixel-display pixel-btn"
            >
              Refresh (${BALANCE.candidateRefreshCost})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveDrawer(null)}
            aria-label="Close staff menu"
            className="px-2 py-1 text-xs font-pixel-display pixel-btn"
          >
            X
          </button>
        </div>
      </div>

      {tab === 'hire' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pixel-scroll pr-1">
          {game.candidates.map((cand) => {
            const role = STAFF_ROLES[cand.role];
            const trait = STAFF_TRAIT_BY_ID[cand.traitId];
            const canAfford = game.cash >= cand.hireFee;
            const hasDesk = game.staff.length < Math.max(deskSlots, 1);

            return (
              <div
                key={cand.id}
                className="pixel-inset p-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 border border-[#14121d] shrink-0"
                      style={{ backgroundColor: role.shirtColor }}
                    />
                    <span className="font-pixel-display text-xs text-[#faf7eb] truncate">
                      {cand.name}
                    </span>
                    <span className="text-xs text-[#8de4ff] tabular-nums">
                      Lv.{cand.skill}
                    </span>
                  </div>
                  <div className="text-xs text-[#b8c0cf] mt-0.5">
                    {role.label} · {trait?.name ?? 'Focused'} · ${cand.salaryPerDay}/day
                  </div>
                  <div className="text-[11px] text-[#8c96ab] truncate">
                    {trait?.description ?? role.primaryEffect}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canAfford || !hasDesk}
                  onClick={() => hireStaff(cand.id)}
                  className="pixel-btn-green px-3 py-1.5 text-xs font-pixel-display shrink-0 whitespace-nowrap"
                >
                  {!hasDesk ? 'No Desk' : `Hire $${cand.hireFee.toLocaleString()}`}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pixel-scroll pr-1">
          {game.staff.map((member) => {
            const role = STAFF_ROLES[member.role];
            const trait = STAFF_TRAIT_BY_ID[member.traitId];
            return (
              <div
                key={member.id}
                className="pixel-inset p-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 border border-[#14121d] shrink-0"
                      style={{ backgroundColor: role.shirtColor }}
                    />
                    <button
                      type="button"
                      onClick={() => selectStaffId(member.id)}
                      className="font-pixel-display text-xs text-[#ffe478] hover:underline truncate"
                    >
                      {member.name}
                    </button>
                    <span className="text-xs text-[#8de4ff] tabular-nums">
                      Lv.{member.skill}
                    </span>
                  </div>
                  <div className="text-xs text-[#b8c0cf] mt-0.5 tabular-nums">
                    {role.shortLabel} · Mood {Math.round(member.mood)}% · Energy {Math.round(member.energy)}%
                  </div>
                  <div className="text-[11px] text-[#8c96ab]">
                    {trait?.name} · ${member.salaryPerDay}/day · {member.activity.replace(/_/g, ' ')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fireStaffMember(member.id)}
                  className="pixel-btn-red px-2.5 py-1 text-xs font-pixel-display shrink-0"
                >
                  Dismiss
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
