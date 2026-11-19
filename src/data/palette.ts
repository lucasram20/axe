/**
 * Curated 32-color cozy isometric pixel-art palette ("Warm Studio Lab 32").
 * Inspired by handcrafted warm-oak & peach-plaster isometric pixel dioramas
 * paired with crisp AI hardware, sunlit windows, and glowing telemetry LEDs.
 * Shared by the 3D WebGL palette-quantization post-process shader,
 * procedural 16x16/32x32 voxel textures, and the pixel-art HUD overlay.
 */

export interface PaletteColor {
  name: string;
  hex: string;
  rgb: [number, number, number];
}

const RAW_HEX: Array<[string, string]> = [
  // Deep warm espresso inks & charcoal slates (0-3)
  ['ink_void', '#231b1c'],
  ['ink_slate', '#332d34'],
  ['slate_dark', '#47424d'],
  ['slate_mid', '#645e6b'],

  // Warm stone, utility ceramic tiles & plaster creams (4-8)
  ['concrete_shadow', '#8a827d'],
  ['concrete_mid', '#b0a89f'],
  ['concrete_light', '#d1cabf'],
  ['paper_cream', '#eadbc8'],
  ['pure_chalk', '#f8f0df'],

  // Warm peach wallpaper & honey-oak / mahogany woods (9-15)
  ['wood_deep', '#522c1b'],
  ['wood_mahogany', '#8a4623'],
  ['wood_oak', '#b5723a'],
  ['wood_birch', '#d49455'],
  ['wall_peach', '#cda384'],
  ['brass_gold', '#e6b84c'],
  ['sun_highlight', '#ffe478'],

  // Cozy denim rug, steel blues & sunlit window sky (16-21)
  ['navy_deep', '#24344d'],
  ['steel_blue', '#3e587d'],
  ['lab_cobalt', '#5178a8'],
  ['screen_cyan', '#5baad9'],
  ['ice_cyan', '#b0e2f7'],
  ['teal_floor', '#3a6f73'],

  // Botanical foliage & phosphor LED greens (22-26)
  ['pine_dark', '#284d2c'],
  ['leaf_mid', '#467d39'],
  ['phosphor_green', '#66ad45'],
  ['led_lime', '#99db5c'],
  ['mint_glow', '#ccf299'],

  // Terracotta reds, alerts & warm leather/skin accents (27-30)
  ['crimson_dark', '#6b473d'],
  ['alert_red', '#b83c3c'],
  ['coral_bright', '#e0604c'],
  ['salmon_warm', '#f0a684'],

  // Frontier amethyst LED accent (31)
  ['violet_led', '#8f63bf'],
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const PALETTE: PaletteColor[] = RAW_HEX.map(([name, hex]) => ({
  name,
  hex,
  rgb: hexToRgb(hex),
}));

export const PALETTE_MAP: Record<string, string> = Object.fromEntries(
  PALETTE.map((c) => [c.name, c.hex]),
);

export const PALETTE_FLOATS: Float32Array = new Float32Array(
  PALETTE.flatMap((c) => c.rgb),
);
