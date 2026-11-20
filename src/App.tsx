/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
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
import { OfflineIndicator } from './ui/PWAInstallButton';
import { PWAUpdateModal } from './ui/PWAUpdateModal';
import { ResearchDrawer } from './ui/ResearchDrawer';
import { RivalsDrawer } from './ui/RivalsDrawer';
import { SelectionPanel } from './ui/SelectionPanel';
import { SettingsDrawer } from './ui/SettingsDrawer';
import { StaffDrawer } from './ui/StaffDrawer';
import { requestMobileLandscapeFullscreen, TitleOverlay } from './ui/TitleOverlay';
import { TopBar } from './ui/TopBar';

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const buildTool = useGameStore((s) => s.buildTool);
  const buildRotation = useGameStore((s) => s.buildRotation);
  const rotateBuild = useGameStore((s) => s.rotateBuild);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const cancelBuild = useGameStore((s) => s.cancelBuild);

  // Automatically enter horizontal landscape fullscreen on mobile touch devices on first gesture
  useEffect(() => {
    const isTouch =
      window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    if (!isTouch) return;

    // Try immediate orientation lock when already running as an installed fullscreen/standalone PWA
    const orient = screenOrientationLock();
    orient?.catch(() => {});

    const onFirstTouch = () => {
      requestMobileLandscapeFullscreen();
      window.removeEventListener('pointerdown', onFirstTouch);
    };
    window.addEventListener('pointerdown', onFirstTouch, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstTouch);
    };
  }, []);

  return (
    <main className="relative w-full h-full overflow-hidden">
      {/* Persistent isolated 3D isometric low-poly WebGL viewport */}
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
            <div className="pointer-events-auto fixed top-[54px] sm:top-[62px] [@media(max-height:500px)]:top-[44px] left-1/2 -translate-x-1/2 z-20 pixel-frame px-2.5 sm:px-3 py-1 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 text-xs max-w-[96vw]">
              <span className="font-pixel-display text-[10px] sm:text-xs text-[#ffe478] whitespace-nowrap">
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

      {/* Portrait-Only Mobile Rotate Guard — guides phone users into horizontal landscape play */}
      <div
        data-testid="portrait-rotate-guard"
        className="hidden [@media(orientation:portrait)_and_(max-width:640px)]:flex fixed inset-0 z-[60] bg-[#14121d]/95 items-center justify-center p-5 text-center"
      >
        <div className="pixel-frame-gold max-w-xs w-full p-5 flex flex-col items-center gap-3">
          <svg
            width="52"
            height="52"
            viewBox="0 0 16 16"
            shapeRendering="crispEdges"
            aria-hidden="true"
            className="pixel-phone-rotate"
          >
            <rect x="4" y="1" width="8" height="14" fill="#14121d" />
            <rect x="5" y="2" width="6" height="12" fill="#e6b84c" />
            <rect x="6" y="3" width="4" height="9" fill="#4ea8de" />
            <rect x="7" y="12.5" width="2" height="1" fill="#14121d" />
          </svg>
          <div className="font-pixel-display text-sm text-[#ffe478] tracking-wide">
            ROTATE FOR LANDSCAPE
          </div>
          <p className="text-xs text-[#e6e2d3] leading-relaxed">
            Project-Labs runs in wide horizontal fullscreen so your 3D AI campus and lab HUD stay crystal clear.
          </p>
          <button
            type="button"
            onClick={requestMobileLandscapeFullscreen}
            className="pixel-btn-gold px-4 py-2 font-pixel-display text-xs"
          >
            Enter Horizontal Mode
          </button>
        </div>
      </div>

      {/* Automatic PWA Update Modal with Animated Progress Bar */}
      <PWAUpdateModal />
      <OfflineIndicator />
    </main>
  );
}

function screenOrientationLock(): Promise<void> | undefined {
  try {
    const orient = window.screen?.orientation as
      | (ScreenOrientation & { lock?: (o: string) => Promise<void> })
      | undefined;
    return orient?.lock?.('landscape');
  } catch {
    return undefined;
  }
}
