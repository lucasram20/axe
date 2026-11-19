/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LabViewport } from './render/LabViewport';
import { useGameStore } from './store/useGameStore';
import { BottomDock } from './ui/BottomDock';
import { BuildDrawer } from './ui/BuildDrawer';
import { CheatMenu } from './ui/CheatMenu';
import { DataDrawer } from './ui/DataDrawer';
import { DebugPanel } from './ui/DebugPanel';
import { FinanceDrawer } from './ui/FinanceDrawer';
import { Minimap } from './ui/Minimap';
import { MobileControls } from './ui/MobileControls';
import { Modals } from './ui/Modals';
import { ModelsDrawer } from './ui/ModelsDrawer';
import { NotificationFeed } from './ui/NotificationFeed';
import { ResearchDrawer } from './ui/ResearchDrawer';
import { RivalsDrawer } from './ui/RivalsDrawer';
import { SelectionPanel } from './ui/SelectionPanel';
import { SettingsDrawer } from './ui/SettingsDrawer';
import { StaffDrawer } from './ui/StaffDrawer';
import { TitleOverlay } from './ui/TitleOverlay';
import { TopBar } from './ui/TopBar';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const buildTool = useGameStore((s) => s.buildTool);
  const buildRotation = useGameStore((s) => s.buildRotation);
  const rotateBuild = useGameStore((s) => s.rotateBuild);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const cancelBuild = useGameStore((s) => s.cancelBuild);

  return (
    <main className="relative w-full h-full overflow-hidden">
      {/* Persistent isolated 3D isometric pixel-art WebGL viewport */}
      <LabViewport />

      {/* Title Screen over live animated 3D lab */}
      {screen === 'title' && <TitleOverlay />}

      {/* Active Gameplay HUD */}
      {screen !== 'title' && (
        <div className="pointer-events-none fixed inset-0 z-10">
          <TopBar />
          <NotificationFeed />

          {/* Build / Move / Sell mode indicator bar with touch Rotate & Cancel actions */}
          {buildTool !== 'select' && (
            <div className="pointer-events-auto fixed top-[98px] sm:top-[64px] left-1/2 -translate-x-1/2 z-20 pixel-frame px-2.5 sm:px-3 py-1 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 text-xs max-w-[96vw]">
              <span className="font-pixel-display text-[11px] sm:text-xs text-[#ffe478] whitespace-nowrap">
                {buildTool === 'place'
                  ? 'BUILD · Tap floor tile'
                  : buildTool === 'move'
                    ? 'MOVE · Tap new tile'
                    : 'SELL · Tap item'}
              </span>
              {(buildTool === 'place' || buildTool === 'move') && (
                <button
                  type="button"
                  onClick={rotateBuild}
                  className="pixel-btn px-2 py-0.5 text-[10px] font-pixel-display whitespace-nowrap"
                >
                  Rot {buildRotation * 90}°
                </button>
              )}
              {buildTool === 'place' && activeDrawer !== 'build' && (
                <button
                  type="button"
                  onClick={() => setActiveDrawer('build')}
                  className="pixel-btn-gold px-2 py-0.5 text-[10px] font-pixel-display whitespace-nowrap"
                >
                  Items
                </button>
              )}
              <button
                type="button"
                onClick={cancelBuild}
                className="pixel-btn-red px-2 py-0.5 text-[10px] font-pixel-display whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Contextual Management Drawers */}
          {activeDrawer === 'build' && <BuildDrawer />}
          {activeDrawer === 'staff' && <StaffDrawer />}
          {activeDrawer === 'research' && <ResearchDrawer />}
          {activeDrawer === 'data' && <DataDrawer />}
          {activeDrawer === 'models' && <ModelsDrawer />}
          {activeDrawer === 'finance' && <FinanceDrawer />}
          {activeDrawer === 'rivals' && <RivalsDrawer />}
          {activeDrawer === 'settings' && <SettingsDrawer />}

          <SelectionPanel />
          <MobileControls />
          <Minimap />
          <BottomDock />
          <DebugPanel />
          <CheatMenu />
          <Modals />
        </div>
      )}
    </main>
  );
}
