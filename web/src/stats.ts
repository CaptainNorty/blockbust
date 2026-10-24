// Stats and streaks, kept on this device only. Streaks (not scores) unlock miners, since a score
// can be farmed by replaying on another device but a streak needs you to show up every day.

import { SKINS, type Skin } from './scene.ts';

interface Day {
  score: number;
  km: number;
}

interface Stats {
  days: Record<string, Day>;
  skin?: string;
}

const KEY = 'blockbust:stats';

export function loadStats(): Stats {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (s && typeof s.days === 'object') return s;
  } catch {}
  return { days: {} };
}

function store(s: Stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/** Records today's dig. Only the first finish of a day counts. */
export function recordDay(date: string, score: number, km: number) {
  const s = loadStats();
  if (s.days[date]) return;
  s.days[date] = { score, km };
  store(s);
}

export function setSkinChoice(id: string) {
  const s = loadStats();
  s.skin = id;
  store(s);
}

const dayNum = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface Summary {
  played: number;
  current: number;
  best: number;
  bestKm: number;
  avgKm: number;
  /** Did the player already dig on `today`? */
  playedToday: boolean;
}

export function summarize(s: Stats, today: string): Summary {
  const nums = Object.keys(s.days).map(dayNum).sort((a, b) => a - b);
  const set = new Set(nums);
  let best = 0;
  let run = 0;
  let prev = NaN;
  for (const n of nums) {
    run = n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  // The streak stays alive through today until you miss a whole day.
  const t = dayNum(today);
  let current = 0;
  for (let n = set.has(t) ? t : t - 1; set.has(n); n--) current++;
  const days = Object.values(s.days);
  return {
    played: days.length,
    current,
    best,
    bestKm: days.reduce((m, d) => Math.max(m, d.km), 0),
    avgKm: days.length ? Math.round(days.reduce((m, d) => m + d.km, 0) / days.length) : 0,
    playedToday: set.has(t),
  };
}

/** Skins unlock on your best streak ever, so a broken streak never takes one away. */
export const isUnlocked = (skin: Skin, sum: Summary) => sum.best >= skin.streak;

export function nextSkin(sum: Summary): Skin | undefined {
  return SKINS.find((k) => !isUnlocked(k, sum));
}
