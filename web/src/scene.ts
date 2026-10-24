// The pixel-art dig: a cross-section of the Earth, a shaft, and a miner who digs deeper as you score.
// Everything is drawn at 320x180 and scaled up by CSS with image-rendering: pixelated.
//
// On the way down: roots and buried film reels, limestone caverns with bats and glowing mushrooms,
// a fossil bed, crystal geodes, magma chambers, the diamond depths, a molten iron sea, and the
// white-hot inner core.

/** The world is wider than most screens; the camera shows the middle of it, centred on the shaft. */
const WORLD_W = 1400;
export const CORE_KM = 6371;

type RGB = [number, number, number];

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

type BiomeId = 'soil' | 'caverns' | 'fossils' | 'geodes' | 'magma' | 'diamonds' | 'outer' | 'inner';

interface Biome {
  id: BiomeId;
  name: string;
  topKm: number;
  rock: RGB;
  rock2: RGB;
  /** Light with no lamp: 0 = pitch black, 1 = fully lit. */
  ambient: number;
  /** Tint of that ambient light. */
  tint: RGB;
}

export const BIOMES: Biome[] = [
  { id: 'soil', name: 'Topsoil', topKm: 0, rock: hex('#7a5233'), rock2: hex('#5e3d25'), ambient: 0.3, tint: [1, 1, 1] },
  { id: 'caverns', name: 'Limestone Caverns', topKm: 8, rock: hex('#6c7383'), rock2: hex('#4e5463'), ambient: 0.3, tint: [0.85, 0.92, 1.1] },
  { id: 'fossils', name: 'Fossil Bed', topKm: 25, rock: hex('#a8835a'), rock2: hex('#876644'), ambient: 0.42, tint: [1.05, 1, 0.9] },
  { id: 'geodes', name: 'Crystal Geodes', topKm: 35, rock: hex('#3d2f52'), rock2: hex('#2b2140'), ambient: 0.22, tint: [0.95, 0.85, 1.15] },
  { id: 'magma', name: 'Magma Chambers', topKm: 300, rock: hex('#2c2626'), rock2: hex('#1c1818'), ambient: 0.3, tint: [1.2, 0.8, 0.6] },
  { id: 'diamonds', name: 'Diamond Depths', topKm: 660, rock: hex('#3a1414'), rock2: hex('#260c0c'), ambient: 0.35, tint: [1.15, 0.8, 0.75] },
  { id: 'outer', name: 'Molten Iron Sea', topKm: 2890, rock: hex('#d1520f'), rock2: hex('#a8380a'), ambient: 0.95, tint: [1, 1, 1] },
  { id: 'inner', name: 'Inner Core', topKm: 5150, rock: hex('#f7c548'), rock2: hex('#fff1bf'), ambient: 1, tint: [1, 1, 1] },
];

// Kilometres -> world pixels. Thin layers get stretched so each zone has room on screen.
const KM = [0, 8, 25, 35, 300, 660, 2890, 5150, CORE_KM];
const PX = [0, 260, 640, 860, 1300, 1720, 2220, 2720, 3120];

export function kmToPx(km: number): number {
  const k = Math.max(0, Math.min(CORE_KM, km));
  for (let i = 1; i < KM.length; i++) {
    if (k <= KM[i]) return PX[i - 1] + ((k - KM[i - 1]) / (KM[i] - KM[i - 1])) * (PX[i] - PX[i - 1]);
  }
  return PX[PX.length - 1];
}

function pxToKm(px: number): number {
  if (px <= 0) return 0;
  for (let i = 1; i < PX.length; i++) {
    if (px <= PX[i]) return KM[i - 1] + ((px - PX[i - 1]) / (PX[i] - PX[i - 1])) * (KM[i] - KM[i - 1]);
  }
  return CORE_KM;
}

export function biomeAt(km: number): Biome {
  let b = BIOMES[0];
  for (const x of BIOMES) if (km >= x.topKm) b = x;
  return b;
}

/** Kept for callers that think in layers. */
export const layerAt = biomeAt;

/** Biome for a world row, with a ragged pixel border between zones. */
function biomeForPx(x: number, wy: number): Biome {
  const jitter = Math.floor(hash(x >> 2, 77) * 10) - 5;
  return biomeAt(pxToKm(wy + jitter));
}

const SHAFT_X = WORLD_W / 2;
const SHAFT_HALF = 7;
const PX_BOTTOM = PX[PX.length - 1];

// ---------- sprites: one character per pixel, '.' is transparent ----------

const MINER = [
  '...YYYY...',
  '..YYYYYYL.',
  '..yYYYYy..',
  '...SSSS...',
  '...SeSe...',
  '...SSSS...',
  '..RRRRRR..',
  '.SRRBBRRS.',
  '.S.BBBB.S.',
  '...BBBB...',
  '...BbbB...',
  '...B..B...',
  '...B..B...',
  '..KK..KK..',
];
const MINER_PAL: Record<string, string> = {
  Y: '#f2c230', y: '#b8891c', L: '#fff7b0', S: '#e8b48a', e: '#2b1d14', R: '#c8432f', B: '#3f6fb5', b: '#2b4f86', K: '#2a2420',
};

export interface Skin {
  id: string;
  name: string;
  /** Best daily streak needed to unlock it. */
  streak: number;
  pal: Record<string, string>;
  handle: string;
  head: string;
}

/** Miners you earn by keeping a daily streak going. */
export const SKINS: Skin[] = [
  { id: 'rookie', name: 'Rookie Digger', streak: 0, pal: MINER_PAL, handle: '#8a5a2b', head: '#b9bec7' },
  { id: 'prospector', name: 'Prospector', streak: 3, pal: { ...MINER_PAL, Y: '#9a6a3a', y: '#6b4523', L: '#9a6a3a', R: '#4f8f52', B: '#7a6248', b: '#5a4734', K: '#3a2a1c' }, handle: '#6b4523', head: '#d08a45' },
  { id: 'nightshift', name: 'Night Shift', streak: 7, pal: { ...MINER_PAL, Y: '#3a4250', y: '#262c36', L: '#bff6ff', R: '#f28c28', B: '#2e3440', b: '#20252e', K: '#15181d' }, handle: '#3a4250', head: '#e6e6e6' },
  { id: 'gemhunter', name: 'Gem Hunter', streak: 14, pal: { ...MINER_PAL, Y: '#9b6bff', y: '#6b44c4', L: '#d4fff8', R: '#5ad7ff', B: '#4a3866', b: '#33264a', K: '#221a30' }, handle: '#4a3866', head: '#ff6fb5' },
  { id: 'magma', name: 'Magma Walker', streak: 30, pal: { ...MINER_PAL, Y: '#e0601a', y: '#9a3a0c', L: '#ffe066', R: '#3a3030', B: '#5a1c14', b: '#3a120c', K: '#1c1818' }, handle: '#2c2626', head: '#ff9a3d' },
  { id: 'legend', name: 'Core Legend', streak: 60, pal: { ...MINER_PAL, Y: '#fff1bf', y: '#e0b83c', L: '#ffffff', R: '#f7c548', B: '#c99a1e', b: '#9a7414', K: '#6b5010' }, handle: '#f7c548', head: '#ffffff' },
  { id: 'diamond', name: 'Diamond Digger', streak: 100, pal: { ...MINER_PAL, Y: '#bff6ff', y: '#6ec8dc', L: '#ffffff', R: '#e6e6e6', B: '#5ad7ff', b: '#3a9ec0', K: '#2a5a70' }, handle: '#d4fff8', head: '#bff6ff' },
];
export const skinById = (id: string | undefined) => SKINS.find((s) => s.id === id) ?? SKINS[0];

/** A still portrait of a miner for menus, as a data URL. Locked skins come out as a dark silhouette. */
export function minerPortrait(skin: Skin, locked = false): string {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  const pal = locked ? Object.fromEntries(Object.keys(skin.pal).map((k) => [k, '#4a413a'])) : skin.pal;
  drawMiner(ctx, pal, locked ? '#4a413a' : skin.handle, locked ? '#4a413a' : skin.head, 3, 1, 0);
  return c.toDataURL();
}

function drawMiner(ctx: CanvasRenderingContext2D, pal: Record<string, string>, handle: string, head: string, mx: number, my: number, swing: number) {
  drawSprite(ctx, MINER, pal, mx, my);
  // Pickaxe: swings from over the shoulder down to the floor.
  const a = -2.3 + Math.sin(swing * Math.PI) * 2.6;
  const px = mx + 8;
  const py = my + 7;
  const hx = Math.round(px + Math.cos(a) * 7);
  const hy = Math.round(py + Math.sin(a) * 7);
  line(ctx, px, py, hx, hy, handle);
  line(ctx, Math.round(hx - Math.sin(a) * 3), Math.round(hy + Math.cos(a) * 3), Math.round(hx + Math.sin(a) * 3), Math.round(hy - Math.cos(a) * 3), head);
}

const REEL = ['.kkkkk.', 'kggkggk', 'kgkkkgk', 'kkkokkk', 'kgkkkgk', 'kggkggk', '.kkkkk.'];
const VHS = ['kkkkkkkkkk', 'kwwkkkkwwk', 'kwokkkkowk', 'kkkllllkkk', '.kkkkkkkk.'];
const DINO = [
  '.......................bbb.',
  '......................bbbbb',
  '.....................bb.b..',
  '....................bb.....',
  '...................bb......',
  '......b.b.b.b.b...bb.......',
  '...bbbbbbbbbbbbbbbb........',
  '.bb..b.b.b.b.b.b.b.........',
  'b....b.b.b.b.b.b.b.........',
  '.....b.......b.............',
  '....b.b.....b.b............',
  '...b...b...b...b...........',
];
const AMMONITE = ['..bbb..', '.b...b.', 'b..bb.b', 'b.b.b.b', 'b.b..b.', '.b..bb.', '..bb...'];
const FISH = ['..b.b.b.b...', 'b.b.b.b.b.bb', 'bbbbbbbbbbbb', 'b.b.b.b.b.bb', '..b.b.b.b...'];
const MUSHROOM = ['.ccc.', 'ccCcc', '..s..', '..s..'];
const DIAMOND = ['..w..', '.wcw.', 'wcCcw', '.wcw.', '..w..'];
const BAT = [
  ['k.....k', 'kk.r.kk', '..kkk..'],
  ['.......', 'kkkrkkk', 'k.kkk.k'],
];
const WORM = ['.pp..', 'p..pp'];

const PAL: Record<string, RGB> = {
  k: hex('#2f2f36'), g: hex('#9aa0a8'), o: hex('#d9d9d9'), w: hex('#e6e6e6'), l: hex('#c9a227'),
  b: hex('#efe6cf'), c: hex('#6ef0e0'), C: hex('#d4fff8'), s: hex('#cfc6b0'), r: hex('#ff4d4d'), p: hex('#e58fa0'),
};

// ---------- world features, generated once ----------

interface Chamber {
  kind: 'cave' | 'magma' | 'geode';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

interface Sprite {
  rows: string[];
  x: number;
  y: number;
  size?: number;
  pal?: Record<string, RGB>;
  glow?: { color: RGB; radius: number };
}

interface Crystal {
  x: number;
  y: number; // base
  h: number;
  lean: number;
  color: RGB;
}

interface Glow {
  x: number;
  y: number;
  color: RGB;
  radius: number;
  flicker?: number;
}

function sideX(i: number, rx: number): number {
  // Keep chambers clear of the shaft: alternate left and right of it.
  const left = i % 2 === 0;
  const room = SHAFT_X - SHAFT_HALF - 14 - rx * 2;
  return left ? SHAFT_X - SHAFT_HALF - 14 - rx - Math.floor(hash(i, 12) * Math.max(1, room)) : SHAFT_X + SHAFT_HALF + 14 + rx + Math.floor(hash(i, 12) * Math.max(1, room));
}

function buildWorld() {
  const chambers: Chamber[] = [];
  const sprites: Sprite[] = [];
  const crystals: Crystal[] = [];
  const glows: Glow[] = [];
  const bats: { x: number; y: number; range: number; phase: number }[] = [];

  // Topsoil: film reels, VHS tapes, worms.
  for (let i = 0; i < 112; i++) {
    const y = 14 + Math.floor(hash(i, 1) * (PX[1] - 26));
    let x = 6 + Math.floor(hash(i, 2) * (WORLD_W - 16));
    if (Math.abs(x - SHAFT_X) < 20) x = (x + 80) % (WORLD_W - 16);
    const r = hash(i, 3);
    sprites.push({ rows: r < 0.45 ? REEL : r < 0.8 ? VHS : WORM, x, y });
  }

  // Limestone caverns: big chambers with stalactites, mushrooms and bats.
  for (let i = 0; i < 24; i++) {
    const rx = 26 + Math.floor(hash(i, 21) * 30);
    const ry = 16 + Math.floor(hash(i, 22) * 14);
    const cy = PX[1] + 40 + (i >> 2) * 58 + Math.floor(hash(i, 23) * 30);
    const cx = sideX(i + 100, rx);
    chambers.push({ kind: 'cave', cx, cy, rx, ry });
    for (let m = 0; m < 4; m++) {
      const mx = cx - rx + 8 + Math.floor(hash(i, 30 + m) * (rx * 2 - 16));
      const floor = Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - ((mx - cx) / rx) ** 2))) - 5;
      sprites.push({ rows: MUSHROOM, x: mx - 2, y: floor - 1, glow: { color: hex('#6ef0e0'), radius: 16 } });
    }
    bats.push({ x: cx, y: cy - ry * 0.4, range: rx * 0.6, phase: hash(i, 40) * 6 });
  }

  // Fossil bed: a big skeleton, ammonites, fish, and more lost film.
  sprites.push({ rows: DINO, x: SHAFT_X - 150, y: PX[2] + 60, size: 2 });
  sprites.push({ rows: DINO, x: SHAFT_X + 200, y: PX[2] + 140, size: 2 });
  sprites.push({ rows: DINO, x: SHAFT_X - 520, y: PX[2] + 120, size: 2 });
  for (let i = 0; i < 70; i++) {
    const y = PX[2] + 10 + Math.floor(hash(i, 51) * (PX[3] - PX[2] - 24));
    let x = 6 + Math.floor(hash(i, 52) * (WORLD_W - 20));
    if (Math.abs(x - SHAFT_X) < 22) x = (x + 90) % (WORLD_W - 20);
    if ((x > SHAFT_X - 160 && x < SHAFT_X - 90 && y > PX[2] + 50 && y < PX[2] + 100) || (x > SHAFT_X + 190 && x < SHAFT_X + 260 && y > PX[2] + 130 && y < PX[2] + 180)) continue;
    const r = hash(i, 53);
    sprites.push({ rows: r < 0.4 ? AMMONITE : r < 0.75 ? FISH : REEL, x, y });
  }

  // Crystal geodes: hollow pockets lined with glowing crystals, plus clusters in the rock.
  const gemColors = ['#b07cff', '#5ad7ff', '#ff6fb5', '#62f59a'].map(hex);
  for (let i = 0; i < 24; i++) {
    const rx = 22 + Math.floor(hash(i, 61) * 22);
    const ry = 14 + Math.floor(hash(i, 62) * 10);
    const cy = PX[3] + 50 + (i >> 2) * 64 + Math.floor(hash(i, 63) * 30);
    const cx = sideX(i + 200, rx);
    chambers.push({ kind: 'geode', cx, cy, rx, ry });
    const color = gemColors[i % gemColors.length];
    for (let k = 0; k < 9; k++) {
      const x = cx - rx + 5 + Math.floor((k / 8) * (rx * 2 - 10));
      const floor = Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2))) - 1;
      crystals.push({ x, y: floor, h: 5 + Math.floor(hash(i * 9 + k, 64) * 10), lean: (hash(k, i) - 0.5) * 0.8, color });
    }
    glows.push({ x: cx, y: cy + ry * 0.5, color, radius: rx + 18 });
  }
  for (let i = 0; i < 63; i++) {
    const y = PX[3] + 20 + Math.floor(hash(i, 71) * (PX[4] - PX[3] - 30));
    let x = 10 + Math.floor(hash(i, 72) * (WORLD_W - 20));
    if (Math.abs(x - SHAFT_X) < 18) x = (x + 100) % (WORLD_W - 20);
    const color = gemColors[Math.floor(hash(i, 73) * gemColors.length)];
    for (let k = 0; k < 3; k++) crystals.push({ x: x + k * 3 - 3, y, h: 4 + Math.floor(hash(i, 74 + k) * 6), lean: (k - 1) * 0.35, color });
    glows.push({ x, y: y - 4, color, radius: 14 });
  }

  // Magma chambers: half-full of lava, with lava falls.
  for (let i = 0; i < 20; i++) {
    const rx = 30 + Math.floor(hash(i, 81) * 26);
    const ry = 18 + Math.floor(hash(i, 82) * 10);
    const cy = PX[4] + 50 + (i >> 2) * 70 + Math.floor(hash(i, 83) * 30);
    const cx = sideX(i + 300, rx);
    chambers.push({ kind: 'magma', cx, cy, rx, ry });
    glows.push({ x: cx, y: cy + ry * 0.4, color: hex('#ff7a1a'), radius: rx + 30, flicker: 1 });
  }

  // Diamond depths.
  for (let i = 0; i < 175; i++) {
    const y = PX[5] + 10 + Math.floor(hash(i, 91) * (PX[6] - PX[5] - 20));
    let x = 6 + Math.floor(hash(i, 92) * (WORLD_W - 12));
    if (Math.abs(x - SHAFT_X) < 14) x = (x + 60) % (WORLD_W - 12);
    sprites.push({ rows: DIAMOND, x, y, glow: { color: hex('#bff6ff'), radius: 10 } });
  }

  for (const s of sprites) if (s.glow) glows.push({ x: s.x + 2, y: s.y + 2, ...s.glow });

  chambers.sort((a, b) => a.cy - b.cy);
  return { chambers, sprites, crystals, glows, bats };
}

/** Where a chamber's ceiling/floor is at column x, or null if x is outside it. */
function chamberSpan(c: Chamber, x: number): [number, number] | null {
  const dx = (x - c.cx) / c.rx;
  if (Math.abs(dx) >= 1) return null;
  const h = c.ry * Math.sqrt(1 - dx * dx);
  return [c.cy - h, c.cy + h];
}

/** Stalactite / stalagmite teeth length at column x. */
function teeth(x: number, seed: number, max: number): number {
  const cell = Math.floor(x / 6);
  const local = Math.abs((x % 6) - 3) / 3;
  return Math.max(0, Math.floor(hash(cell, seed) * max * (1 - local)));
}

interface Particle {
  x: number;
  y: number; // world px
  vx: number;
  vy: number;
  life: number;
  color: string;
  glow?: boolean;
}

interface Marker {
  km: number;
  color: RGB;
  side: number;
}

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private img: ImageData;
  private km = 0;
  private targetKm = 0;
  /** Logical (pre-scale) size; one logical pixel is `pixel` CSS pixels. */
  W = 320;
  H = 180;
  private pixel = 3;
  private offX = 0;
  private camY = -100;
  private t = 0;
  private swing = 0;
  private shake = 0;
  private particles: Particle[] = [];
  private markers: Marker[] = [];
  private world = buildWorld();
  private skin = SKINS[0];
  onDepth?: (km: number, layer: string) => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.img = this.ctx.createImageData(1, 1);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Fills the window with pixels about 2-3 screen pixels big (roughly 330+ logical pixels tall). */
  resize() {
    const cssW = Math.max(1, innerWidth);
    const cssH = Math.max(1, innerHeight);
    this.pixel = Math.max(2, Math.floor(Math.min(cssH / 330, cssW / 260)));
    this.W = Math.ceil(cssW / this.pixel);
    this.H = Math.ceil(cssH / this.pixel);
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.canvas.style.width = `${this.W * this.pixel}px`;
    this.canvas.style.height = `${this.H * this.pixel}px`;
    this.ctx.imageSmoothingEnabled = false;
    this.img = this.ctx.createImageData(this.W, this.H);
    this.offX = SHAFT_X - Math.floor(this.W / 2);
  }

  /** Where the miner sits on screen: a bit above the middle, so the bottom panel doesn't cover him. */
  private get minerY() {
    return Math.round(this.H * 0.42);
  }

  get depthKm() {
    return this.targetKm;
  }

  /** Digs (animated) to a new depth. */
  digTo(km: number) {
    this.targetKm = Math.min(CORE_KM, km);
  }

  setDepth(km: number) {
    this.targetKm = this.km = Math.min(CORE_KM, km);
    this.camY = kmToPx(this.km) - this.minerY;
  }

  setSkin(id: string) {
    this.skin = skinById(id);
  }

  reset() {
    this.markers = [];
    this.setDepth(0);
  }

  /** Leaves a glowing gem in the shaft wall at the depth an answer was found. */
  addMarker(km: number, color: string) {
    this.markers.push({ km, color: hex(color), side: this.markers.length % 2 ? -1 : 1 });
  }

  /** Pickaxe bounces off: sparks and a little shake, no progress. */
  clank() {
    this.shake = 0.25;
    this.swing = 1;
    const fy = kmToPx(this.km);
    for (let i = 0; i < 10; i++) {
      this.particles.push({ x: SHAFT_X + 6, y: fy - 2, vx: (Math.random() - 0.3) * 60, vy: -Math.random() * 70, life: 0.35, color: '#ffe066', glow: true });
    }
  }

  private update(dt: number) {
    this.t += dt;
    const digging = this.targetKm - this.km > 0.05;
    if (digging) {
      const fromPx = kmToPx(this.km);
      const toPx = kmToPx(this.targetKm);
      // Ease in pixel space so long digs don't take forever.
      const step = Math.max(20 * dt, (toPx - fromPx) * 2.2 * dt);
      this.km = fromPx + step >= toPx ? this.targetKm : pxToKm(fromPx + step);
      const floor = kmToPx(this.km);
      const b = biomeAt(this.km);
      if (Math.random() < 0.8) {
        const c = mix(b.rock, [255, 255, 255], 0.15);
        this.particles.push({
          x: SHAFT_X + (Math.random() - 0.5) * 10, y: floor - 1,
          vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 50, life: 0.6,
          color: `rgb(${c.map(Math.round).join(',')})`,
        });
      }
      this.onDepth?.(this.km, b.name);
    }
    this.swing = digging ? (this.t * 7) % 1 : Math.max(0, this.swing - dt * 3);

    // Ambient particles: drips in the caves, sparkles in the geodes, embers below.
    const { W, H, offX } = this;
    const view = biomeAt(pxToKm(this.camY + H / 2));
    const spawn = (p: Particle) => this.particles.length < 260 && this.particles.push(p);
    if (view.id === 'caverns' && Math.random() < 0.15) {
      spawn({ x: offX + Math.random() * W, y: this.camY + Math.random() * H * 0.5, vx: 0, vy: 0, life: 1.2, color: '#9fd3ff' });
    } else if (view.id === 'geodes' && Math.random() < 0.3) {
      spawn({ x: offX + Math.random() * W, y: this.camY + Math.random() * H, vx: 0, vy: -4, life: 0.5, color: '#ffffff', glow: true });
    } else if (['magma', 'diamonds', 'outer', 'inner'].includes(view.id) && Math.random() < 0.35) {
      spawn({ x: offX + Math.random() * W, y: this.camY + H + 4, vx: (Math.random() - 0.5) * 6, vy: -20 - Math.random() * 25, life: 3, color: view.id === 'inner' ? '#ffffff' : '#ff9a3d', glow: true });
    }
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (!p.glow) p.vy += 220 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    const targetCam = kmToPx(this.km) - this.minerY;
    this.camY += (targetCam - this.camY) * Math.min(1, dt * 6);
    this.shake = Math.max(0, this.shake - dt);
  }

  /** Static world pixels, built lazily in bands of BAND rows: RGB plus a flag byte (see F_*). */
  private bands: (Uint8Array | undefined)[] = [];
  private light = new Float32Array(0);

  private band(i: number): Uint8Array {
    let b = this.bands[i];
    if (!b) {
      b = buildBand(i, this.world);
      this.bands[i] = b;
    }
    return b;
  }

  private draw() {
    const { ctx, t, W, H, offX } = this;
    const data = this.img.data;
    const camY = Math.round(this.camY);
    const floor = Math.round(kmToPx(this.km));
    const lampX = SHAFT_X + 3;
    const lampY = floor - 13;
    const { chambers, sprites, crystals, glows, bats } = this.world;
    const lava = chambers.filter((c) => c.kind === 'magma' && c.cy + c.ry >= camY && c.cy - c.ry <= camY + H);

    // Light, computed per 2x2 block: zone ambient, the miner's lamp, and every glow on screen.
    const LW = (W + 1) >> 1;
    const LH = (H + 1) >> 1;
    if (this.light.length < LW * LH * 3) this.light = new Float32Array(LW * LH * 3);
    const L = this.light;
    for (let by = 0; by < LH; by++) {
      const wy = camY + by * 2;
      const b = biomeAt(pxToKm(Math.max(0, wy)));
      let amb = b.ambient;
      if (wy < 160) amb += (1 - amb) * (1 - Math.max(0, wy) / 160) ** 2;
      const r = amb * b.tint[0], g = amb * b.tint[1], bl = amb * b.tint[2];
      for (let o = by * LW * 3, end = o + LW * 3; o < end; o += 3) {
        L[o] = r;
        L[o + 1] = g;
        L[o + 2] = bl;
      }
    }
    const addLight = (x: number, y: number, radius: number, r: number, g: number, bl: number) => {
      const bx0 = Math.max(0, Math.floor((x - radius - offX) / 2));
      const bx1 = Math.min(LW - 1, Math.ceil((x + radius - offX) / 2));
      const by0 = Math.max(0, Math.floor((y - radius - camY) / 2));
      const by1 = Math.min(LH - 1, Math.ceil((y + radius - camY) / 2));
      for (let by = by0; by <= by1; by++) {
        const dy = camY + by * 2 - y;
        for (let bx = bx0; bx <= bx1; bx++) {
          const dx = offX + bx * 2 - x;
          const d2 = dx * dx + dy * dy;
          if (d2 >= radius * radius) continue;
          const f = 1 - Math.sqrt(d2) / radius;
          const o = (by * LW + bx) * 3;
          L[o] += f * r;
          L[o + 1] += f * g;
          L[o + 2] += f * bl;
        }
      }
    };
    addLight(lampX, lampY, 70, 0.85, 0.85, 0.85 * 0.9);
    for (const g of glows) {
      if (g.y + g.radius < camY || g.y - g.radius > camY + H || g.x + g.radius < offX || g.x - g.radius > offX + W) continue;
      const k = (g.flicker ? 0.85 + 0.15 * Math.sin(t * 5 + g.x) : 1) * 0.9 / 255;
      addLight(g.x, g.y, g.radius, g.color[0] * k, g.color[1] * k, g.color[2] * k);
    }
    // Stepped light for a pixel look.
    for (let i = 0; i < LW * LH * 3; i++) L[i] = Math.round(Math.min(1.15, L[i]) * 6) / 6;

    const outer = BIOMES[6];
    const inner = BIOMES[7];
    const cloudShift = Math.floor(t * 4);
    for (let sy = 0; sy < H; sy++) {
      const wy = camY + sy;
      const bi = Math.floor((wy + SKY_H) / BAND);
      let o = sy * W * 4;
      if (bi < 0 || bi >= BAND_COUNT) {
        for (let sx = 0; sx < W; sx++, o += 4) {
          const c = bi < 0 ? SKY_TOP : inner.rock;
          data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
        continue;
      }
      const band = this.band(bi);
      const row = ((wy + SKY_H) % BAND) * WORLD_W * 4;
      const lrow = (sy >> 1) * LW * 3;
      // Per-row parts of the animated textures.
      const crackT = 0.5 + 0.5 * Math.sin(t * 3 + wy * 0.2);
      const swirlA = Math.sin(wy * 0.03 + t * 0.6) * 2 + t * 0.8;
      const swirlB = Math.sin(wy * 0.06 - t);
      const cloudRow = wy < 0 && wy >= -CLOUD_H ? (wy + CLOUD_H) * WORLD_W : -1;
      for (let sx = 0; sx < W; sx++, o += 4) {
        const wx = ((sx + offX) % WORLD_W + WORLD_W) % WORLD_W;
        const p = row + wx * 4;
        let r = band[p], g = band[p + 1], bl = band[p + 2];
        const f = band[p + 3];
        if (f & F_DYN) {
          if (f & F_OUTER) {
            const swirl = Math.sin(wx * 0.045 + swirlA) + swirlB;
            const k = 0.5 + 0.25 * swirl;
            r = outer.rock2[0] + (255 - outer.rock2[0]) * k;
            g = outer.rock2[1] + (180 - outer.rock2[1]) * k;
            bl = outer.rock2[2] + (60 - outer.rock2[2]) * k;
            if (swirl < 0.05 && swirl > -0.05) {
              r += (255 - r) * 0.6; g += (226 - g) * 0.6; bl += (140 - bl) * 0.6;
            }
          } else if (f & F_INNER) {
            const k = 0.25 + 0.15 * Math.sin(t * 2 + wx * 0.1 + wy * 0.1);
            r = inner.rock[0] + (inner.rock2[0] - inner.rock[0]) * k;
            g = inner.rock[1] + (inner.rock2[1] - inner.rock[1]) * k;
            bl = inner.rock[2] + (inner.rock2[2] - inner.rock[2]) * k;
          } else if (f & F_LAVA) {
            for (const ch of lava) {
              const span = chamberSpan(ch, wx);
              if (!span || wy < span[0] || wy > span[1]) continue;
              const c = chamberPixel(ch, wx, wy, span, t);
              if (c) { r = c[0]; g = c[1]; bl = c[2]; }
              break;
            }
          } else {
            // Magma crack.
            r = 255; g = 120 + 80 * crackT; bl = 30 + 50 * crackT;
          }
        }
        if (cloudRow >= 0 && CLOUDS[cloudRow + ((wx + cloudShift) % WORLD_W)]) {
          r = 244; g = 248; bl = 252;
        }
        const dx = wx - SHAFT_X;
        if (dx <= SHAFT_HALF && dx >= -SHAFT_HALF && wy <= floor && wy >= 3) {
          // The shaft: dug-out darkness, timber supports near the top, iron rings further down.
          const id = f & (F_OUTER | F_INNER) ? 'core' : biomeForPx(wx, wy).id;
          if (id === 'core') { r = r * 0.6 + 24; g = g * 0.6 + 6.4; bl *= 0.6; }
          else { r *= 0.32; g *= 0.32; bl *= 0.32; }
          if (dx === SHAFT_HALF || dx === -SHAFT_HALF) { r *= 1.6; g *= 1.6; bl *= 1.6; }
          if (wy > 6 && wy % 44 < 3 && id !== 'core') {
            const top = wy % 44 === 0;
            const c: RGB = id === 'soil' || id === 'caverns' || id === 'fossils' ? (top ? [150, 105, 60] : [110, 74, 40]) : top ? [140, 146, 156] : [90, 94, 104];
            r = c[0]; g = c[1]; bl = c[2];
          }
        }
        if (!(f & F_UNLIT) && wy >= 0) {
          const l = lrow + (sx >> 1) * 3;
          r *= L[l]; g *= L[l + 1]; bl *= L[l + 2];
        }
        data[o] = r > 255 ? 255 : r;
        data[o + 1] = g > 255 ? 255 : g;
        data[o + 2] = bl > 255 ? 255 : bl;
        data[o + 3] = 255;
      }
    }

    const put = (x: number, wy: number, c: RGB, lit = true) => {
      const sy = wy - camY;
      const sx = x - offX;
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) return;
      const o = (sy * W + sx) * 4;
      let r = c[0], g = c[1], bl = c[2];
      if (lit && wy >= 0) {
        const l = ((sy >> 1) * LW + (sx >> 1)) * 3;
        r *= L[l]; g *= L[l + 1]; bl *= L[l + 2];
      }
      data[o] = Math.min(255, r);
      data[o + 1] = Math.min(255, g);
      data[o + 2] = Math.min(255, bl);
    };
    const putSprite = (rows: string[], x: number, y: number, lit = true, pal = PAL, size = 1) =>
      rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
        if (ch === '.') return;
        for (let i = 0; i < size * size; i++) put(x + dx * size + (i % size), y + dy * size + Math.floor(i / size), pal[ch], lit);
      }));

    // Static sprites and crystals live in the band cache; only the twinkling diamonds are redrawn.
    for (const s of sprites) {
      if (s.rows !== DIAMOND || s.y + 5 < camY || s.y > camY + H || s.x + 5 < offX || s.x > offX + W) continue;
      const tw = 0.6 + 0.4 * Math.sin(t * 4 + s.x * 0.7 + s.y);
      putSprite(s.rows, s.x, s.y, false, { ...PAL, w: scale(PAL.w, tw), c: scale(PAL.c, tw) });
    }
    void crystals;

    for (const bat of bats) {
      if (bat.y < camY - 4 || bat.y > camY + H) continue;
      const frame = BAT[Math.floor(t * 8 + bat.phase) % 2];
      putSprite(frame, Math.round(bat.x + Math.sin(t * 0.9 + bat.phase) * bat.range) - 3, Math.round(bat.y + Math.sin(t * 2.3 + bat.phase) * 3), true);
    }

    // Answer gems in the shaft walls, glowing in their tier color.
    for (const m of this.markers) {
      const y = Math.round(kmToPx(m.km)) - 4;
      const x = SHAFT_X + m.side * (SHAFT_HALF + 3);
      const glow = scale(m.color, 0.75 + 0.25 * Math.sin(t * 3 + m.km));
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= 2) put(x + dx, y + dy, Math.abs(dx) + Math.abs(dy) === 2 ? scale(glow, 0.6) : glow, false);
      }
      put(x - 1, y - 1, [255, 255, 255], false);
    }

    if (camY < 4) drawHeadframe(put);
    if (camY + H > PX_BOTTOM - 40) drawCenter(put, t);

    ctx.putImageData(this.img, 0, 0);

    const jx = this.shake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
    const my = floor - camY - MINER.length;
    const mx = SHAFT_X - offX - 5 + jx;
    drawMiner(ctx, this.skin.pal, this.skin.handle, this.skin.head, mx, my, this.swing);

    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillRect(Math.round(p.x - offX), Math.round(p.y - camY), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

/** Base rock texture per zone. */
function rock(b: Biome, x: number, wy: number, t: number): RGB {
  const n = hash(x >> 1, wy >> 1);
  const shade = n < 0.2 ? 0.85 : n > 0.86 ? 1.12 : 1;
  let c = scale(b.rock, shade);
  switch (b.id) {
    case 'soil': {
      if (hash(x >> 2, wy >> 2) < 0.18) c = scale(b.rock2, shade);
      if (hash(x, wy) < 0.012) c = [150, 140, 128]; // pebbles
      // Roots reaching down from the grass.
      for (let r = 0; r < 8; r++) {
        const rx = 18 + r * 41 + Math.sin(wy * 0.08 + r) * 4;
        const len = 40 + hash(r, 5) * 90;
        if (wy < len && Math.abs(x - rx) < 1.2 - wy / len) c = [70, 46, 28];
      }
      break;
    }
    case 'caverns': {
      // Strata lines and drip stains.
      const band = (wy + Math.round(Math.sin(x * 0.05) * 3)) % 13;
      if (band === 0) c = scale(b.rock2, shade);
      if (hash(x, 3) < 0.04 && hash(x, wy >> 4) < 0.5) c = mix(c, [150, 160, 175], 0.3);
      break;
    }
    case 'fossils': {
      const band = Math.floor((wy + Math.sin(x * 0.04) * 5) / 9) % 3;
      c = scale(band === 0 ? b.rock : band === 1 ? b.rock2 : mix(b.rock, [200, 170, 120], 0.4), shade);
      break;
    }
    case 'geodes': {
      if (hash(x >> 2, wy >> 2) < 0.25) c = scale(b.rock2, shade);
      if (hash(x, wy) < 0.006) c = [200, 160, 255];
      break;
    }
    case 'magma': {
      if (hash(x >> 2, wy >> 2) < 0.3) c = scale(b.rock2, shade);
      // Glowing cracks.
      const crack = Math.abs(Math.sin(x * 0.11 + Math.sin(wy * 0.07) * 2.2) + Math.sin(wy * 0.05 + x * 0.02));
      if (crack < 0.045 && hash(x >> 3, wy >> 3) < 0.55) c = mix([255, 120, 30], [255, 200, 80], 0.5 + 0.5 * Math.sin(t * 3 + wy * 0.2));
      break;
    }
    case 'diamonds': {
      if (hash(x >> 2, wy >> 2) < 0.3) c = scale(b.rock2, shade);
      const vein = Math.abs(Math.sin(x * 0.06 - wy * 0.04) + Math.sin(wy * 0.09)) < 0.04;
      if (vein && hash(x >> 3, wy >> 3) < 0.4) c = [110, 30, 24];
      break;
    }
    case 'outer': {
      // Swirling currents of molten iron.
      const swirl = Math.sin(x * 0.045 + Math.sin(wy * 0.03 + t * 0.6) * 2 + t * 0.8) + Math.sin(wy * 0.06 - t);
      c = mix(b.rock2, [255, 180, 60], 0.5 + 0.25 * swirl);
      if (Math.abs(swirl) < 0.05) c = mix(c, [255, 226, 140], 0.6);
      break;
    }
    case 'inner': {
      // A lattice of white-hot iron crystals.
      const gx = (x + Math.floor(wy * 0.5)) % 16;
      const gy = wy % 16;
      c = gx === 0 || gy === 0 ? b.rock2 : mix(b.rock, b.rock2, 0.25 + 0.15 * Math.sin(t * 2 + x * 0.1 + wy * 0.1));
      break;
    }
  }
  return c;
}

/** What a chamber looks like inside: open air, stalactites, lava, or crystal-lit hollow. */
function chamberPixel(ch: Chamber, x: number, wy: number, [top, bottom]: [number, number], t: number): RGB | null {
  if (ch.kind === 'cave') {
    if (wy < top + teeth(x, ch.cy, 9)) return [96, 104, 120]; // stalactite
    if (wy > bottom - teeth(x + 3, ch.cy + 1, 6)) return [104, 112, 128]; // stalagmite
    if (wy > bottom - 2 && hash(x, 9) < 0.5) return [70, 130, 170]; // puddle
    return mix([38, 44, 58], [62, 70, 88], (wy - top) / (bottom - top));
  }
  if (ch.kind === 'geode') {
    if (wy < top + 2 || wy > bottom - 2) return [90, 70, 130];
    return [30, 18, 48];
  }
  // Magma chamber: dark air above a lava pool, with a lava fall.
  const level = ch.cy + ch.ry * 0.15 + Math.sin(x * 0.2 + t * 2) * 1.2;
  const fallX = ch.cx + ch.rx * 0.4;
  if (Math.abs(x - fallX) < 2 && wy < level) {
    return mix([255, 130, 30], [255, 220, 120], 0.5 + 0.5 * Math.sin(wy * 0.5 - t * 12));
  }
  if (wy >= level) {
    const bubble = hash(x >> 1, Math.floor(wy / 2 + t * 4)) < 0.03;
    return bubble ? [255, 236, 160] : mix([255, 90, 20], [255, 170, 40], 0.5 + 0.5 * Math.sin(x * 0.15 + wy * 0.3 + t * 2));
  }
  if (wy < top + teeth(x, ch.cy, 6)) return [40, 30, 28];
  return mix([20, 10, 8], [70, 24, 10], (wy - top) / (level - top));
}

function sky(x: number, wy: number): RGB {
  const horizon: RGB = [170, 214, 240];
  let c = mix(SKY_TOP, horizon, Math.max(0, Math.min(1, (wy + 140) / 140)));
  if (Math.hypot(x - SHAFT_X - 102, wy + 92) < 9) c = [255, 233, 140];
  const hill = -6 - Math.round(Math.sin(x * 0.03) * 5 + Math.sin(x * 0.011 + 1) * 7);
  if (wy > hill) c = [76, 140, 74];
  return c;
}

function drawHeadframe(put: (x: number, y: number, c: RGB, lit?: boolean) => void) {
  const wood: RGB = [120, 80, 44];
  const dark: RGB = [80, 52, 28];
  for (let i = 0; i < 34; i++) {
    put(SHAFT_X - 14 + Math.round(i * 0.35), -i, wood, false);
    put(SHAFT_X + 14 - Math.round(i * 0.35), -i, wood, false);
  }
  for (let x = SHAFT_X - 11; x <= SHAFT_X + 11; x++) put(x, -12, dark, false);
  for (let a = 0; a < 40; a++) put(SHAFT_X + Math.round(Math.cos(a) * 5), -36 + Math.round(Math.sin(a) * 5), [60, 60, 66], false);
  for (let y = -36; y < 0; y++) put(SHAFT_X + 5, y, [200, 200, 200], false);
  // A film clapper for a sign.
  for (let x = SHAFT_X + 22; x < SHAFT_X + 36; x++) for (let y = -10; y < -2; y++) put(x, y, (x + y) % 4 < 2 && y < -7 ? [240, 240, 240] : [30, 30, 34], false);
  for (let y = -2; y < 0; y++) put(SHAFT_X + 28, y, dark, false);
}

/** The very center of the Earth: a pulsing white star. */
function drawCenter(put: (x: number, y: number, c: RGB, lit?: boolean) => void, t: number) {
  const cy = PX_BOTTOM + 14;
  const r = 9 + Math.sin(t * 3) * 1.5;
  for (let dy = -16; dy <= 16; dy++) for (let dx = -16; dx <= 16; dx++) {
    const d = Math.hypot(dx, dy);
    const ray = (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) && d < r + 7;
    if (d < r) put(SHAFT_X + dx, cy + dy, d < r * 0.5 ? [255, 255, 255] : [255, 248, 210], false);
    else if (ray) put(SHAFT_X + dx, cy + dy, [255, 255, 240], false);
  }
}

// ---------- the band cache: static pixels are worked out once, not every frame ----------

const BAND = 64;
/** Sky rows cached above the surface. */
const SKY_H = 384;
const SKY_TOP: RGB = [62, 120, 196];
const BAND_COUNT = Math.ceil((SKY_H + PX_BOTTOM + 640) / BAND);
/** Flag byte: animated pixel, drawn without lighting, and which animation. */
const F_DYN = 1;
const F_UNLIT = 2;
const F_OUTER = 4;
const F_INNER = 8;
const F_LAVA = 16;

/** Cloud mask for the rows just above the surface; it scrolls sideways over time. */
const CLOUD_H = 140;
const CLOUDS = (() => {
  const m = new Uint8Array(CLOUD_H * WORLD_W);
  const cloud = (cx: number, wy: number, ox: number, oy: number, w: number) =>
    wy <= oy + 3 &&
    (Math.hypot(cx - ox, wy - oy) < w * 0.32 || Math.hypot(cx - ox - w * 0.4, wy - oy - 1) < w * 0.24 ||
      Math.hypot(cx - ox + w * 0.42, wy - oy - 1) < w * 0.22 || (Math.abs(cx - ox) < w * 0.75 && wy > oy - 1));
  const list: [number, number, number][] = [[60, -100, 22], [190, -78, 16], [330, -110, 26], [520, -95, 20], [690, -84, 24], [900, -104, 22], [1120, -80, 18], [1300, -98, 26]];
  for (let wy = -CLOUD_H; wy < 0; wy++) for (let x = 0; x < WORLD_W; x++) {
    if (list.some(([ox, oy, w]) => cloud(x, wy, ox, oy, w))) m[(wy + CLOUD_H) * WORLD_W + x] = 1;
  }
  return m;
})();

function buildBand(i: number, world: ReturnType<typeof buildWorld>): Uint8Array {
  const out = new Uint8Array(BAND * WORLD_W * 4);
  const y0 = i * BAND - SKY_H;
  const y1 = y0 + BAND;
  const chambers = world.chambers.filter((c) => c.cy + c.ry >= y0 && c.cy - c.ry <= y1);
  const set = (x: number, wy: number, c: RGB, f: number) => {
    if (x < 0 || x >= WORLD_W || wy < y0 || wy >= y1) return;
    const o = ((wy - y0) * WORLD_W + x) * 4;
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = f;
  };
  for (let wy = y0; wy < y1; wy++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (wy < 0) {
        set(x, wy, sky(x, wy), F_UNLIT);
        continue;
      }
      const b = wy >= PX_BOTTOM ? BIOMES[BIOMES.length - 1] : biomeForPx(x, wy);
      let c = rock(b, x, wy, 0);
      let f = 0;
      if (b.id === 'outer') f = F_DYN | F_UNLIT | F_OUTER;
      else if (b.id === 'inner') {
        const gx = (x + Math.floor(wy * 0.5)) % 16;
        f = gx === 0 || wy % 16 === 0 ? F_UNLIT : F_DYN | F_UNLIT | F_INNER;
      } else if (b.id === 'magma' && isCrack(x, wy)) f = F_DYN;
      for (const ch of chambers) {
        const span = chamberSpan(ch, x);
        if (!span || wy < span[0] || wy > span[1]) continue;
        if (ch.kind === 'magma') f = F_DYN | F_LAVA;
        else {
          const air = chamberPixel(ch, x, wy, span, 0);
          if (air) c = air;
          f = 0;
        }
        break;
      }
      if (wy < 3) {
        c = wy === 0 ? [90, 170, 70] : [62, 128, 52];
        f = 0;
      }
      set(x, wy, c, f);
    }
  }
  // Bake in the sprites that never move. Glowing ones ignore lighting.
  for (const s of world.sprites) {
    const size = s.size ?? 1;
    if (s.rows === DIAMOND || s.y + s.rows.length * size < y0 || s.y > y1) continue;
    s.rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
      if (ch === '.') return;
      for (let k = 0; k < size * size; k++) set(s.x + dx * size + (k % size), s.y + dy * size + Math.floor(k / size), PAL[ch], s.glow ? F_UNLIT : 0);
    }));
  }
  for (const cr of world.crystals) {
    if (cr.y < y0 || cr.y - cr.h > y1) continue;
    for (let k = 0; k < cr.h; k++) {
      const x = Math.round(cr.x + cr.lean * k);
      const w = k < cr.h - 2 ? 1 : 0;
      for (let dx = -w; dx <= w; dx++) set(x + dx, cr.y - k, dx === -1 ? mix(cr.color, [255, 255, 255], 0.5) : cr.color, F_UNLIT);
    }
    set(Math.round(cr.x + cr.lean * (cr.h - 1)), cr.y - cr.h + 1, [255, 255, 255], F_UNLIT);
  }
  return out;
}

function isCrack(x: number, wy: number): boolean {
  const crack = Math.abs(Math.sin(x * 0.11 + Math.sin(wy * 0.07) * 2.2) + Math.sin(wy * 0.05 + x * 0.02));
  return crack < 0.045 && hash(x >> 3, wy >> 3) < 0.55;
}

function drawSprite(ctx: CanvasRenderingContext2D, rows: string[], pal: Record<string, string>, x: number, y: number) {
  rows.forEach((row, dy) => {
    [...row].forEach((ch, dx) => {
      if (ch === '.') return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x + dx, y + dy, 1, 1);
    });
  });
}

function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string) {
  ctx.fillStyle = color;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}
