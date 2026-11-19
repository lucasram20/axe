/**
 * Isolated React container mounting the Three.js pixel-art LabSceneController once.
 * Never re-mounts WebGL when HUD state changes.
 */

import { useEffect, useRef, useState } from 'react';
import { LabSceneController } from './LabScene';

export function LabViewport() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const controller = new LabSceneController(el);
    const canvas = el.querySelector('canvas');

    const handleLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleRestored = () => {
      setContextLost(false);
    };

    canvas?.addEventListener('webglcontextlost', handleLost);
    canvas?.addEventListener('webglcontextrestored', handleRestored);

    return () => {
      canvas?.removeEventListener('webglcontextlost', handleLost);
      canvas?.removeEventListener('webglcontextrestored', handleRestored);
      controller.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#14121d]">
      <div ref={mountRef} className="w-full h-full" />
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#14121d]/90 text-[#faf7eb] font-pixel">
          <div className="px-6 py-4 pixel-frame text-center">
            <p className="text-base">Graphics context paused — restoring viewport...</p>
          </div>
        </div>
      )}
    </div>
  );
}
