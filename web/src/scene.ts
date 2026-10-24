// The pixel-art dig: a cross-section of the Earth, a shaft, and a miner who digs deeper as you score.
// Everything is drawn at 320x180 and scaled up by CSS with image-rendering: pixelated.
//
// On the way down: roots and buried film reels, limestone caverns with bats and glowing mushrooms,
// a fossil bed, crystal geodes, magma chambers, the diamond depths, a molten iron sea, and the
// white-hot inner core.

/** The world is wider than most screens; the camera shows the middle of it, centred on the shaft. */
const WORLD_W = 800;
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
  for (let i = 0; i < 64; i++) {
    const y = 14 + Math.floor(hash(i, 1) * (PX[1] - 26));
    let x = 6 + Math.floor(hash(i, 2) * (WORLD_W - 16));
    if (Math.abs(x - SHAFT_X) < 20) x = (x + 80) % (WORLD_W - 16);
    const r = hash(i, 3);
    sprites.push({ rows: r < 0.45 ? REEL : r < 0.8 ? VHS : WORM, x, y });
  }

  // Limestone caverns: big chambers with stalactites, mushrooms and bats.
  for (let i = 0; i < 12; i++) {
    const rx = 26 + Math.floor(hash(i, 21) * 30);
    const ry = 16 + Math.floor(hash(i, 22) * 14);
    const cy = PX[1] + 40 + (i >> 1) * 58 + Math.floor(hash(i, 23) * 30);
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
  for (let i = 0; i < 40; i++) {
    const y = PX[2] + 10 + Math.floor(hash(i, 51) * (PX[3] - PX[2] - 24));
    let x = 6 + Math.floor(hash(i, 52) * (WORLD_W - 20));
    if (Math.abs(x - SHAFT_X) < 22) x = (x + 90) % (WORLD_W - 20);
    if ((x > SHAFT_X - 160 && x < SHAFT_X - 90 && y > PX[2] + 50 && y < PX[2] + 100) || (x > SHAFT_X + 190 && x < SHAFT_X + 260 && y > PX[2] + 130 && y < PX[2] + 180)) continue;
    const r = hash(i, 53);
    sprites.push({ rows: r < 0.4 ? AMMONITE : r < 0.75 ? FISH : REEL, x, y });
  }

  // Crystal geodes: hollow pockets lined with glowing crystals, plus clusters in the rock.
  const gemColors = ['#b07cff', '#5ad7ff', '#ff6fb5', '#62f59a'].map(hex);
  for (let i = 0; i < 12; i++) {
    const rx = 22 + Math.floor(hash(i, 61) * 22);
    const ry = 14 + Math.floor(hash(i, 62) * 10);
    const cy = PX[3] + 50 + (i >> 1) * 68 + Math.floor(hash(i, 63) * 30);
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
  for (let i = 0; i < 36; i++) {
    const y = PX[3] + 20 + Math.floor(hash(i, 71) * (PX[4] - PX[3] - 30));
    let x = 10 + Math.floor(hash(i, 72) * (WORLD_W - 20));
    if (Math.abs(x - SHAFT_X) < 18) x = (x + 100) % (WORLD_W - 20);
    const color = gemColors[Math.floor(hash(i, 73) * gemColors.length)];
    for (let k = 0; k < 3; k++) crystals.push({ x: x + k * 3 - 3, y, h: 4 + Math.floor(hash(i, 74 + k) * 6), lean: (k - 1) * 0.35, color });
    glows.push({ x, y: y - 4, color, radius: 14 });
  }

  // Magma chambers: half-full of lava, with lava falls.
  for (let i = 0; i < 10; i++) {
    const rx = 30 + Math.floor(hash(i, 81) * 26);
    const ry = 18 + Math.floor(hash(i, 82) * 10);
    const cy = PX[4] + 50 + (i >> 1) * 74 + Math.floor(hash(i, 83) * 30);
    const cx = sideX(i + 300, rx);
    chambers.push({ kind: 'magma', cx, cy, rx, ry });
    glows.push({ x: cx, y: cy + ry * 0.4, color: hex('#ff7a1a'), radius: rx + 30, flicker: 1 });
  }

  // Diamond depths.
  for (let i = 0; i < 100; i++) {
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

  /** Fills the window with chunky pixels: about 220 logical pixels tall. */
  resize() {
    const cssW = Math.max(1, innerWidth);
    const cssH = Math.max(1, innerHeight);
    this.pixel = Math.max(2, Math.round(Math.min(cssH / 220, cssW / 180)));
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

  private draw() {
    const { ctx, t, W, H, offX } = this;
    const data = this.img.data;
    const camY = Math.round(this.camY);
    const floor = Math.round(kmToPx(this.km));
    const lampX = SHAFT_X + 3;
    const lampY = floor - 13;
    const { chambers, sprites, crystals, glows, bats } = this.world;
    const onScreen = chambers.filter((c) => c.cy + c.ry >= camY && c.cy - c.ry <= camY + H);
    const lights = glows
      .filter((g) => g.y + g.radius >= camY && g.y - g.radius <= camY + H)
      .map((g) => ({ ...g, k: g.flicker ? 0.85 + 0.15 * Math.sin(t * 5 + g.x) : 1 }));

    const lightAt = (x: number, wy: number, b: Biome): RGB => {
      let amb = b.ambient;
      if (wy < 160) amb += (1 - amb) * (1 - Math.max(0, wy) / 160) ** 2;
      const lamp = Math.max(0, 1 - Math.hypot(x - lampX, wy - lampY) / 70) * 0.85;
      let r = amb * b.tint[0] + lamp;
      let g = amb * b.tint[1] + lamp;
      let bl = amb * b.tint[2] + lamp * 0.9;
      for (const L of lights) {
        const d = Math.hypot(x - L.x, wy - L.y);
        if (d >= L.radius) continue;
        const f = (1 - d / L.radius) * 0.9 * L.k;
        r += (f * L.color[0]) / 255;
        g += (f * L.color[1]) / 255;
        bl += (f * L.color[2]) / 255;
      }
      // Stepped light for a pixel look.
      const q = (v: number) => Math.round(Math.min(1.15, v) * 6) / 6;
      return [q(r), q(g), q(bl)];
    };

    for (let sy = 0; sy < H; sy++) {
      const wy = camY + sy;
      for (let sx = 0; sx < W; sx++) {
        const wx = sx + offX;
        let c: RGB;
        let light: RGB = [1, 1, 1];
        if (wy < 0) {
          c = sky(wx, wy, t);
        } else {
          const b = wy >= PX_BOTTOM ? BIOMES[BIOMES.length - 1] : biomeForPx(wx, wy);
          c = rock(b, wx, wy, t);
          // Chambers carve open space out of the rock.
          for (const ch of onScreen) {
            const span = chamberSpan(ch, wx);
            if (!span || wy < span[0] || wy > span[1]) continue;
            const air = chamberPixel(ch, wx, wy, span, t);
            if (air) c = air;
            break;
          }
          const inShaft = Math.abs(wx - SHAFT_X) <= SHAFT_HALF && wy <= floor;
          if (inShaft) {
            const edge = Math.abs(wx - SHAFT_X) === SHAFT_HALF;
            c = b.id === 'outer' || b.id === 'inner' ? mix(c, [60, 16, 0], 0.4) : scale(c, 0.32);
            if (edge) c = scale(c, 1.6);
            // Timber supports near the top, iron rings further down.
            if (wy > 6 && wy % 44 < 3) {
              if (b.id === 'soil' || b.id === 'caverns' || b.id === 'fossils') c = wy % 44 === 0 ? [150, 105, 60] : [110, 74, 40];
              else if (b.id === 'geodes' || b.id === 'magma' || b.id === 'diamonds') c = wy % 44 === 0 ? [140, 146, 156] : [90, 94, 104];
            }
          }
          if (wy < 3) c = wy === 0 ? [90, 170, 70] : [62, 128, 52];
          if (b.id !== 'outer' && b.id !== 'inner') light = lightAt(wx, wy, b);
        }
        const o = (sy * W + sx) * 4;
        data[o] = Math.min(255, c[0] * light[0]);
        data[o + 1] = Math.min(255, c[1] * light[1]);
        data[o + 2] = Math.min(255, c[2] * light[2]);
        data[o + 3] = 255;
      }
    }

    const put = (x: number, wy: number, c: RGB, lit = true) => {
      const sy = wy - camY;
      const sx = x - offX;
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) return;
      const l = lit && wy >= 0 ? lightAt(x, wy, biomeAt(pxToKm(wy))) : [1, 1, 1];
      const o = (sy * W + sx) * 4;
      data[o] = Math.min(255, c[0] * l[0]);
      data[o + 1] = Math.min(255, c[1] * l[1]);
      data[o + 2] = Math.min(255, c[2] * l[2]);
    };
    const putSprite = (rows: string[], x: number, y: number, lit = true, pal = PAL, size = 1) =>
      rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
        if (ch === '.') return;
        for (let i = 0; i < size * size; i++) put(x + dx * size + (i % size), y + dy * size + Math.floor(i / size), pal[ch], lit);
      }));

    for (const s of sprites) {
      if (s.y + s.rows.length * (s.size ?? 1) < camY || s.y > camY + H) continue;
      if (s.rows === DIAMOND) {
        // Diamonds twinkle.
        const tw = 0.6 + 0.4 * Math.sin(t * 4 + s.x * 0.7 + s.y);
        putSprite(s.rows, s.x, s.y, false, { ...PAL, w: scale(PAL.w, tw), c: scale(PAL.c, tw) });
      } else putSprite(s.rows, s.x, s.y, !s.glow, PAL, s.size);
    }

    for (const cr of crystals) {
      if (cr.y < camY - 4 || cr.y - cr.h > camY + H) continue;
      const pulse = 0.85 + 0.15 * Math.sin(t * 2 + cr.x);
      for (let i = 0; i < cr.h; i++) {
        const x = Math.round(cr.x + cr.lean * i);
        const w = i < cr.h - 2 ? 1 : 0;
        for (let dx = -w; dx <= w; dx++) put(x + dx, cr.y - i, scale(dx === -1 ? mix(cr.color, [255, 255, 255], 0.5) : cr.color, pulse), false);
      }
      put(Math.round(cr.x + cr.lean * (cr.h - 1)), cr.y - cr.h + 1, [255, 255, 255], false);
    }

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
    drawSprite(ctx, MINER, MINER_PAL, mx, my);
    // Pickaxe: swings from over the shoulder down to the floor.
    const a = -2.3 + Math.sin(this.swing * Math.PI) * 2.6;
    const px = mx + 8;
    const py = my + 7;
    const hx = Math.round(px + Math.cos(a) * 7);
    const hy = Math.round(py + Math.sin(a) * 7);
    line(ctx, px, py, hx, hy, '#8a5a2b');
    line(ctx, Math.round(hx - Math.sin(a) * 3), Math.round(hy + Math.cos(a) * 3), Math.round(hx + Math.sin(a) * 3), Math.round(hy - Math.cos(a) * 3), '#b9bec7');

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

function sky(x: number, wy: number, t: number): RGB {
  const top: RGB = [62, 120, 196];
  const horizon: RGB = [170, 214, 240];
  let c = mix(top, horizon, Math.min(1, (wy + 140) / 140));
  if (Math.hypot(x - SHAFT_X - 102, wy + 92) < 9) c = [255, 233, 140];
  // Puffy clouds: a few overlapping circles on a flat base.
  const cx = (x + t * 4) % WORLD_W;
  const cloud = (ox: number, oy: number, w: number) =>
    wy <= oy + 3 &&
    (Math.hypot(cx - ox, wy - oy) < w * 0.32 || Math.hypot(cx - ox - w * 0.4, wy - oy - 1) < w * 0.24 ||
      Math.hypot(cx - ox + w * 0.42, wy - oy - 1) < w * 0.22 || (Math.abs(cx - ox) < w * 0.75 && wy > oy - 1));
  if (cloud(60, -100, 22) || cloud(190, -78, 16) || cloud(330, -110, 26) || cloud(520, -95, 20) || cloud(690, -84, 24)) c = [244, 248, 252];
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
