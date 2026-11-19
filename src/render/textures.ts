/**
 * Procedural 16x16 & 32x32 pixel-art CanvasTextures and 4-band Toon GradientMap.
 * Warm handcrafted honey-oak planks, diamond peach wallpaper, sunlit windows,
 * denim rugs, clean ceramic utility tiles, and crisp pixel character faces/outfits.
 * All textures use NearestFilter and generateMipmaps = false for razor-sharp pixels.
 */

import * as THREE from 'three';
import type { FloorType } from '../data/items';

export interface PixelTexturePack {
  toonGradient: THREE.DataTexture;
  floors: Record<FloorType, THREE.CanvasTexture>;
  wood: THREE.CanvasTexture;
  wallPlaster: THREE.CanvasTexture;
  windowDaylight: THREE.CanvasTexture;
  serverFront: THREE.CanvasTexture;
  whiteboard: THREE.CanvasTexture;
  screenCode: THREE.CanvasTexture;
  road: THREE.CanvasTexture;
  charFace: THREE.CanvasTexture;
  charTorso: THREE.CanvasTexture;
  dispose: () => void;
}

function makePixelCanvas(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, s: number) => void,
  clampEdge = false,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = clampEdge ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.wrapT = clampEdge ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createToonGradientMap(): THREE.DataTexture {
  // 4 crisp stepped cel-shading bands with warm readable shadow floor
  const data = new Uint8Array([
    102, 102, 102, 255,
    158, 158, 158, 255,
    218, 218, 218, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function createPixelTextures(): PixelTexturePack {
  const toonGradient = createToonGradientMap();

  // Warm sunlit botanical grass (cozy mid-green with pixel tufts)
  const grass = makePixelCanvas(16, (ctx) => {
    ctx.fillStyle = '#467d39';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#66ad45';
    const tufts = [
      [2, 2], [3, 2], [11, 3], [7, 7], [8, 7], [13, 11], [4, 13], [10, 10], [1, 9],
    ];
    for (const [x, y] of tufts) ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = '#284d2c';
    const shadows = [[1, 3], [12, 4], [6, 8], [14, 12], [3, 14], [9, 6]];
    for (const [x, y] of shadows) ctx.fillRect(x, y, 1, 1);
  });

  // Honey-oak staggered wood planks (signature warm floor from reference art)
  const garage = makePixelCanvas(32, (ctx) => {
    ctx.fillStyle = '#b5723a';
    ctx.fillRect(0, 0, 32, 32);

    // 4 horizontal wood planks per tile with warm tone variation & grain highlights
    const plankTones = ['#b5723a', '#c48144', '#ab6833', '#bf7b40'];
    const joints = [6, 20, 12, 26];
    for (let p = 0; p < 4; p++) {
      const y = p * 8;
      ctx.fillStyle = plankTones[p];
      ctx.fillRect(0, y, 32, 7);

      // Subtle golden highlight along top bevel of each plank
      ctx.fillStyle = '#d49455';
      ctx.fillRect(1, y + 1, 11, 1);
      ctx.fillRect(17, y + 2, 9, 1);

      // Grain streaks
      ctx.fillStyle = '#8a4623';
      ctx.fillRect(4, y + 4, 7, 1);
      ctx.fillRect(22, y + 5, 6, 1);

      // Horizontal seam between planks
      ctx.fillStyle = '#6b3a1f';
      ctx.fillRect(0, y + 7, 32, 1);

      // Staggered vertical plank butt-joint
      const jx = joints[p];
      ctx.fillRect(jx, y, 1, 8);
      ctx.fillStyle = '#d49455';
      ctx.fillRect((jx + 1) % 32, y + 1, 1, 5);
    }
  });

  // Sunlit bright studio birch-oak / warm cream parquet for Research Lab zone
  const lab = makePixelCanvas(32, (ctx) => {
    ctx.fillStyle = '#d49455';
    ctx.fillRect(0, 0, 32, 32);
    const tones = ['#d49455', '#dca064', '#c9884c', '#d89a5c'];
    const joints = [10, 24, 4, 18];
    for (let p = 0; p < 4; p++) {
      const y = p * 8;
      ctx.fillStyle = tones[p];
      ctx.fillRect(0, y, 32, 7);
      ctx.fillStyle = '#eadbc8';
      ctx.fillRect(2, y + 1, 10, 1);
      ctx.fillStyle = '#b5723a';
      ctx.fillRect(14, y + 4, 8, 1);
      ctx.fillStyle = '#8a4623';
      ctx.fillRect(0, y + 7, 32, 1);
      ctx.fillRect(joints[p], y, 1, 8);
    }
  });

  // Clean ceramic utility / server room floor tiles (echoes reference tiled utility zone)
  const server = makePixelCanvas(16, (ctx) => {
    ctx.fillStyle = '#c9c3b9';
    ctx.fillRect(0, 0, 16, 16);
    // Crisp 2x2 ceramic sub-tiles
    ctx.fillStyle = '#d8d2c7';
    ctx.fillRect(1, 1, 6, 6);
    ctx.fillRect(9, 9, 6, 6);
    ctx.fillStyle = '#bfb8ae';
    ctx.fillRect(9, 1, 6, 6);
    ctx.fillRect(1, 9, 6, 6);
    // Grout lines
    ctx.fillStyle = '#8a827d';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(0, 8, 16, 1);
    ctx.fillRect(8, 0, 1, 16);
    // Subtle blue tech airflow dot
    ctx.fillStyle = '#5178a8';
    ctx.fillRect(4, 4, 1, 1);
    ctx.fillRect(12, 12, 1, 1);
  });

  // Cozy slate-denim woven lounge rug (straight from the reference living room rug!)
  const lounge = makePixelCanvas(16, (ctx) => {
    ctx.fillStyle = '#3e587d';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#5178a8';
    for (let y = 1; y < 15; y += 2) {
      for (let x = (y % 4 === 1 ? 1 : 3); x < 15; x += 4) {
        ctx.fillRect(x, y, 2, 1);
      }
    }
    // Stitched dark border hem
    ctx.fillStyle = '#24344d';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);
  });

  // Warm furniture oak wood grain
  const wood = makePixelCanvas(16, (ctx) => {
    ctx.fillStyle = '#d49455';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#b5723a';
    ctx.fillRect(0, 4, 16, 1);
    ctx.fillRect(0, 10, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillStyle = '#eadbc8';
    ctx.fillRect(2, 2, 5, 1);
    ctx.fillRect(8, 7, 6, 1);
  });

  // Warm peach/taupe wallpaper with subtle diamond motif & wooden baseboard (reference walls!)
  const wallPlaster = makePixelCanvas(32, (ctx) => {
    ctx.fillStyle = '#cda384';
    ctx.fillRect(0, 0, 32, 32);
    // Subtle lighter diamond wallpaper motif
    ctx.fillStyle = '#d9b598';
    for (let y = 2; y < 25; y += 6) {
      for (let x = (y % 12 === 2 ? 2 : 5); x < 30; x += 6) {
        ctx.fillRect(x, y, 2, 1);
        ctx.fillRect(x - 1, y + 1, 4, 1);
        ctx.fillRect(x, y + 2, 2, 1);
      }
    }
    // Top plaster trim band
    ctx.fillStyle = '#eadbc8';
    ctx.fillRect(0, 0, 32, 2);
    // Bottom wood wainscoting / baseboard
    ctx.fillStyle = '#8a4623';
    ctx.fillRect(0, 26, 32, 1);
    ctx.fillStyle = '#b5723a';
    ctx.fillRect(0, 27, 32, 4);
    ctx.fillStyle = '#522c1b';
    ctx.fillRect(0, 31, 32, 1);
  }, true);

  // Sunlit daylight window pane with sky-blue gradient, soft clouds & leafy treetops
  const windowDaylight = makePixelCanvas(16, (ctx) => {
    // Bright sky top
    ctx.fillStyle = '#b0e2f7';
    ctx.fillRect(0, 0, 16, 16);
    // Sunlit pale cloud shimmer
    ctx.fillStyle = '#f8f0df';
    ctx.fillRect(2, 2, 6, 3);
    ctx.fillRect(9, 4, 5, 2);
    // Diagonal window glass shine
    ctx.fillRect(3, 6, 2, 2);
    ctx.fillRect(5, 8, 2, 2);
    // Leafy green garden branches peeking at bottom
    ctx.fillStyle = '#66ad45';
    ctx.fillRect(1, 11, 5, 4);
    ctx.fillRect(10, 10, 5, 5);
    ctx.fillStyle = '#99db5c';
    ctx.fillRect(2, 11, 3, 2);
    ctx.fillRect(11, 11, 3, 2);
    // Cream window muntin crossbars
    ctx.fillStyle = '#f8f0df';
    ctx.fillRect(7, 0, 2, 16);
    ctx.fillRect(0, 6, 16, 2);
  }, true);

  const serverFront = makePixelCanvas(16, (ctx) => {
    ctx.fillStyle = '#332d34';
    ctx.fillRect(0, 0, 16, 16);
    for (let row = 0; row < 4; row++) {
      const y = 1 + row * 4;
      ctx.fillStyle = '#47424d';
      ctx.fillRect(1, y, 14, 3);
      ctx.fillStyle = '#231b1c';
      ctx.fillRect(2, y + 1, 8, 1);
      ctx.fillStyle = row % 2 === 0 ? '#99db5c' : '#5baad9';
      ctx.fillRect(12, y + 1, 1, 1);
      ctx.fillStyle = '#e6b84c';
      ctx.fillRect(14, y + 1, 1, 1);
    }
  });

  const whiteboard = makePixelCanvas(32, (ctx) => {
    ctx.fillStyle = '#f8f0df';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#645e6b';
    ctx.fillRect(6, 8, 18, 1);
    ctx.fillRect(6, 16, 18, 1);
    ctx.fillRect(10, 12, 10, 1);
    ctx.fillStyle = '#5178a8';
    ctx.fillRect(4, 6, 4, 4);
    ctx.fillRect(4, 14, 4, 4);
    ctx.fillStyle = '#e0604c';
    ctx.fillRect(14, 9, 4, 4);
    ctx.fillRect(14, 16, 4, 4);
    ctx.fillStyle = '#66ad45';
    ctx.fillRect(24, 11, 4, 4);
    ctx.fillStyle = '#8f63bf';
    ctx.fillRect(4, 24, 3, 2);
    ctx.fillRect(7, 25, 4, 2);
    ctx.fillRect(11, 26, 5, 2);
    ctx.fillRect(16, 27, 10, 1);
  });

  const screenCode = makePixelCanvas(16, (ctx) => {
    ctx.fillStyle = '#24344d';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#b0e2f7';
    ctx.fillRect(2, 2, 8, 1);
    ctx.fillStyle = '#99db5c';
    ctx.fillRect(2, 5, 11, 1);
    ctx.fillRect(4, 8, 7, 1);
    ctx.fillStyle = '#ffe478';
    ctx.fillRect(2, 11, 9, 1);
    ctx.fillStyle = '#5baad9';
    ctx.fillRect(4, 13, 6, 1);
  });

  const road = makePixelCanvas(16, (ctx) => {
    ctx.fillStyle = '#47424d';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#645e6b';
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillStyle = '#e6b84c';
    ctx.fillRect(3, 7, 6, 2);
  });

  // Crisp 16x16 pixel-art character face (neutral bright base so instanceColor tints skin cleanly!)
  const charFace = makePixelCanvas(16, (ctx) => {
    // Pure white base => multiplied by staff.skinTone via instanceColor
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 16, 16);

    // Subtle top forehead hair-shadow fringe
    ctx.fillStyle = '#ded4ca';
    ctx.fillRect(0, 0, 16, 3);
    ctx.fillRect(1, 3, 2, 1);
    ctx.fillRect(13, 3, 2, 1);

    // Expressive chunky 2x3 dark espresso pixel eyes + bright pixel catchlight
    ctx.fillStyle = '#231b1c';
    ctx.fillRect(3, 6, 3, 4);
    ctx.fillRect(10, 6, 3, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 6, 1, 1);
    ctx.fillRect(11, 6, 1, 1);

    // Rosy pixel cheeks
    ctx.fillStyle = '#f2b8b0';
    ctx.fillRect(2, 10, 2, 1);
    ctx.fillRect(12, 10, 2, 1);

    // Friendly tiny pixel smile
    ctx.fillStyle = '#6b473d';
    ctx.fillRect(6, 12, 4, 1);

    // Subtle chin shading
    ctx.fillStyle = '#e0d6cc';
    ctx.fillRect(0, 15, 16, 1);
  }, true);

  // Crisp 16x16 pixel-art shirt / jacket detail (white-based so instanceColor tints role outfit cleanly!)
  const charTorso = makePixelCanvas(16, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 16, 16);

    // Crisp V-collar & light shirt undershirt triangle at top center
    ctx.fillStyle = '#f8f0df';
    ctx.fillRect(6, 0, 4, 3);
    ctx.fillStyle = '#d1cabf';
    ctx.fillRect(5, 0, 1, 3);
    ctx.fillRect(10, 0, 1, 3);

    // Subtle jacket center seam & pocket shading
    ctx.fillStyle = '#d4cdc6';
    ctx.fillRect(7, 3, 2, 11);
    ctx.fillRect(2, 9, 4, 1);
    ctx.fillRect(10, 9, 4, 1);

    // Tiny lab ID lanyard badge on left chest
    ctx.fillStyle = '#ffe478';
    ctx.fillRect(10, 4, 3, 4);
    ctx.fillStyle = '#5baad9';
    ctx.fillRect(11, 5, 1, 2);

    // Dark belt trim along hem
    ctx.fillStyle = '#524b52';
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillStyle = '#e6b84c';
    ctx.fillRect(7, 14, 2, 2);
  }, true);

  const floors: Record<FloorType, THREE.CanvasTexture> = {
    grass,
    garage,
    lab,
    server,
    lounge,
  };

  return {
    toonGradient,
    floors,
    wood,
    wallPlaster,
    windowDaylight,
    serverFront,
    whiteboard,
    screenCode,
    road,
    charFace,
    charTorso,
    dispose: () => {
      toonGradient.dispose();
      Object.values(floors).forEach((t) => t.dispose());
      wood.dispose();
      wallPlaster.dispose();
      windowDaylight.dispose();
      serverFront.dispose();
      whiteboard.dispose();
      screenCode.dispose();
      road.dispose();
      charFace.dispose();
      charTorso.dispose();
    },
  };
}
