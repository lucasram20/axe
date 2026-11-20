/**
 * Ultra-compact touch-friendly camera control rail for mobile & tablet viewports.
 * Sits cleanly along the middle-right edge in mobile landscape so it never crowds
 * the bottom management dock or the central 3D lab viewport.
 */

import { useGameStore } from '../store/useGameStore';

export function MobileControls() {
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const triggerCameraCommand = useGameStore((s) => s.triggerCameraCommand);

  // Tuck away when a management drawer is open so the drawer has full breathing room
  if (activeDrawer !== null) return null;

  return (
    <div
      aria-label="Mobile camera controls"
      data-testid="mobile-controls"
      className="pointer-events-auto fixed right-1.5 sm:right-2 bottom-[92px] [@media(max-height:500px)]:bottom-auto [@media(max-height:500px)]:top-1/2 [@media(max-height:500px)]:-translate-y-1/2 z-20 flex md:hidden [@media(max-height:500px)]:flex flex-col gap-1 pixel-frame p-1"
    >
      <button
        type="button"
        onClick={() => triggerCameraCommand('zoom_in')}
        aria-label="Zoom in"
        data-testid="mobile-zoom-in"
        className="pixel-btn w-9 h-9 [@media(max-height:500px)]:w-7 [@media(max-height:500px)]:h-7 flex items-center justify-center font-pixel-display text-sm [@media(max-height:500px)]:text-xs leading-none"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => triggerCameraCommand('zoom_out')}
        aria-label="Zoom out"
        data-testid="mobile-zoom-out"
        className="pixel-btn w-9 h-9 [@media(max-height:500px)]:w-7 [@media(max-height:500px)]:h-7 flex items-center justify-center font-pixel-display text-sm [@media(max-height:500px)]:text-xs leading-none"
      >
        -
      </button>
      <div className="h-[2px] bg-[#2e344b] my-0.5" aria-hidden="true" />
      <button
        type="button"
        onClick={() => triggerCameraCommand('rotate_left')}
        aria-label="Rotate camera left 90 degrees"
        data-testid="mobile-rot-left"
        className="pixel-btn w-9 h-9 [@media(max-height:500px)]:w-7 [@media(max-height:500px)]:h-7 flex items-center justify-center font-pixel-display text-[11px] [@media(max-height:500px)]:text-[9px] leading-none"
      >
        &lt;90
      </button>
      <button
        type="button"
        onClick={() => triggerCameraCommand('rotate_right')}
        aria-label="Rotate camera right 90 degrees"
        data-testid="mobile-rot-right"
        className="pixel-btn w-9 h-9 [@media(max-height:500px)]:w-7 [@media(max-height:500px)]:h-7 flex items-center justify-center font-pixel-display text-[11px] [@media(max-height:500px)]:text-[9px] leading-none"
      >
        90&gt;
      </button>
      <button
        type="button"
        onClick={() => triggerCameraCommand('center')}
        aria-label="Center camera on lab"
        data-testid="mobile-center"
        className="pixel-btn-gold w-9 h-9 [@media(max-height:500px)]:w-7 [@media(max-height:500px)]:h-7 flex items-center justify-center font-pixel-display text-[10px] [@media(max-height:500px)]:text-[8px] leading-none"
      >
        CTR
      </button>
    </div>
  );
}
