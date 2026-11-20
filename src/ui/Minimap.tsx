/**
 * Interactive corner pixel-art minimap showing floor zones, placed hardware,
 * walking staff dots, and the current camera viewport rectangle. Click to jump.
 */

import { useEffect, useRef } from 'react';
import { CATALOG_BY_ID, type FloorType } from '../data/items';
import { STAFF_ROLES } from '../data/staff';
import { floorIndex, getRotatedFootprint } from '../sim/grid';
import { useGameStore } from '../store/useGameStore';

const FLOOR_COLORS: Record<FloorType, string> = {
  grass: '#2f6e49',
  garage: '#8c96ab',
  lab: '#e6e2d3',
  server: '#2e6e70',
  lounge: '#cf8d59',
};

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const game = useGameStore((s) => s.game);
  const cameraBounds = useGameStore((s) => s.cameraBounds);
  const jumpCameraTo = useGameStore((s) => s.jumpCameraTo);

  const CELL_PX = game.gridWidth >= 36 ? 4 : game.gridWidth >= 24 ? 5 : 7;
  const wPx = game.gridWidth * CELL_PX;
  const hPx = game.gridHeight * CELL_PX;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    // 1. Floor tiles
    for (let z = 0; z < game.gridHeight; z++) {
      for (let x = 0; x < game.gridWidth; x++) {
        const f = game.floors[floorIndex(x, z, game.gridWidth)];
        ctx.fillStyle = FLOOR_COLORS[f] ?? '#2f6e49';
        ctx.fillRect(x * CELL_PX, z * CELL_PX, CELL_PX, CELL_PX);
      }
    }

    // 2. Placed items
    for (const item of game.items) {
      const def = CATALOG_BY_ID[item.itemId];
      if (!def) continue;
      const [fw, fd] = getRotatedFootprint(item.itemId, item.rotation);
      ctx.fillStyle = def.accentColor;
      ctx.fillRect(
        item.gx * CELL_PX + 1,
        item.gz * CELL_PX + 1,
        fw * CELL_PX - 2,
        fd * CELL_PX - 2,
      );
    }

    // 3. Staff dots
    for (const s of game.staff) {
      ctx.fillStyle = STAFF_ROLES[s.role].shirtColor;
      ctx.fillRect(Math.round(s.x * CELL_PX) - 1, Math.round(s.z * CELL_PX) - 1, 3, 3);
      ctx.fillStyle = '#faf7eb';
      ctx.fillRect(Math.round(s.x * CELL_PX), Math.round(s.z * CELL_PX), 1, 1);
    }

    // 4. Camera viewport rectangle
    ctx.strokeStyle = '#ffe478';
    ctx.lineWidth = 2;
    const rx = (cameraBounds.centerX - cameraBounds.halfW) * CELL_PX;
    const ry = (cameraBounds.centerZ - cameraBounds.halfH) * CELL_PX;
    const rw = cameraBounds.halfW * 2 * CELL_PX;
    const rh = cameraBounds.halfH * 2 * CELL_PX;
    ctx.strokeRect(
      Math.max(1, rx),
      Math.max(1, ry),
      Math.min(wPx - 2, rw),
      Math.min(hPx - 2, rh),
    );
  }, [game.floors, game.items, game.staff, game.gridWidth, game.gridHeight, cameraBounds, wPx, hPx]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const nz = (e.clientY - rect.top) / rect.height;
    jumpCameraTo(nx * game.gridWidth, nz * game.gridHeight);
  };

  return (
    <aside
      aria-label="Lab minimap"
      className="pointer-events-auto fixed bottom-3 right-3 z-20 hidden md:block [@media(max-height:500px)]:hidden pixel-frame p-1.5"
    >
      <div className="flex items-center justify-between text-[10px] font-pixel-display text-[#b8c0cf] mb-1 px-0.5">
        <span>MAP</span>
        <span className="text-[#8de4ff]">CLICK JUMP</span>
      </div>
      <canvas
        ref={canvasRef}
        width={wPx}
        height={hPx}
        onClick={handleClick}
        className="block border-2 border-[#14121d] cursor-crosshair"
        style={{ width: wPx, height: hPx, imageRendering: 'pixelated' }}
      />
    </aside>
  );
}
