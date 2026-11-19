/**
 * Compact touch-friendly camera control rail for mobile & tablet viewports.
 * Provides one-tap Zoom +/-, 90-degree isometric camera snap rotation (Q/E),
 * and Recenter without cluttering desktop viewports.
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
      className="pointer-events-auto fixed right-2 bottom-[92px] [@media(max-height:500px)]:bottom-[68px] [@media(max-height:500px)]:right-1.5 z-20 flex md:hidden [@media(max-height:500px)]:flex flex-col [@media(max-height:500px)]:flex-row gap-1.5 [@media(max-height:500px)]:gap-1 pixel-frame p-1.5 [@media(max-height:500px)]:p-1"
    >
      <button
        type="button"
        onClick={() => triggerCameraCommand('zoom_in')}
        aria-label="Zoom in"
        data-testid="mobile-zoom-in"
        className="pixel-btn w-10 h-10 [@media(max-height:500px)]:w-8 [@media(max-height:500px)]:h-8 flex items-center justify-center font-pixel-display text-base [@media(max-height:500px)]:text-xs leading-none"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => triggerCameraCommand('zoom_out')}
        aria-label="Zoom out"
        data-testid="mobile-zoom-out"
        className="pixel-btn w-10 h-10 [@media(max-height:500px)]:w-8 [@media(max-height:500px)]:h-8 flex items-center justify-center font-pixel-display text-base [@media(max-height:500px)]:text-xs leading-none"
      >
        -
      </button>
      <div className="h-[2px] bg-[#2e344b] my-0.5 [@media(max-height:500px)]:hidden" aria-hidden="true" />
      <button
        type="button"
        onClick={() => triggerCameraCommand('rotate_left')}
        aria-label="Rotate camera left 90 degrees"
        data-testid="mobile-rot-left"
        className="pixel-btn w-10 h-10 [@media(max-height:500px)]:w-8 [@media(max-height:500px)]:h-8 flex items-center justify-center font-pixel-display text-sm [@media(max-height:500px)]:text-[10px] leading-none"
      >
        &lt;90
      </button>
      <button
        type="button"
        onClick={() => triggerCameraCommand('rotate_right')}
        aria-label="Rotate camera right 90 degrees"
        data-testid="mobile-rot-right"
        className="pixel-btn w-10 h-10 [@media(max-height:500px)]:w-8 [@media(max-height:500px)]:h-8 flex items-center justify-center font-pixel-display text-sm [@media(max-height:500px)]:text-[10px] leading-none"
      >
        90&gt;
      </button>
      <button
        type="button"
        onClick={() => triggerCameraCommand('center')}
        aria-label="Center camera on lab"
        data-testid="mobile-center"
        className="pixel-btn-gold w-10 h-10 [@media(max-height:500px)]:w-8 [@media(max-height:500px)]:h-8 flex items-center justify-center font-pixel-display text-[11px] [@media(max-height:500px)]:text-[10px] leading-none"
      >
        CTR
      </button>
    </div>
  );
}
