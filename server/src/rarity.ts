import { tierForShare, type Tier } from '@blockbust/shared';
import { db } from './db.ts';

/** How many real first-hits it takes for players to outweigh the starting guess. */
export const PRIOR_WEIGHT = 50;

/** Jev score levels (0..4) mapped to a typical share for that tier. */
const JEV_SHARE = [0.35, 0.16, 0.06, 0.015, 0.003];

/**
 * Turns fame scores into predicted shares of players. A softmax over standardized fame:
 * the most famous answers soak up most of the share, the long tail gets crumbs.
 */
export function priorsFromFame(fame: number[]): number[] {
  if (!fame.length) return [];
  // Players pile onto the obvious picks harder when the list is long.
  const sharpness = Math.min(2.6, Math.max(1.4, 1.6 + 0.3 * Math.log(fame.length / 10)));
  const mean = fame.reduce((a, b) => a + b, 0) / fame.length;
  const sd = Math.sqrt(fame.reduce((a, b) => a + (b - mean) ** 2, 0) / fame.length) || 1;
  const w = fame.map((f) => Math.exp((sharpness * (f - mean)) / sd));
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / total);
}

/** Blends the fame prior with Jev's tier estimate (geometric mean), then renormalizes. */
export function blendJev(prompts: { prior: number; jev: number | null }[]): number[] {
  const raw = prompts.map(({ prior, jev }) => {
    if (jev == null) return prior;
    const lo = Math.floor(jev);
    const hi = Math.min(4, lo + 1);
    const frac = jev - lo;
    const jevShare = Math.exp(Math.log(JEV_SHARE[lo]) * (1 - frac) + Math.log(JEV_SHARE[hi]) * frac);
    return Math.sqrt(prior * jevShare);
  });
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  return raw.map((x) => x / total);
}

const firstHits = db.prepare(`
  SELECT hit_entity AS id, count(*) AS n FROM plays WHERE prompt_id = ? AND hit_entity IS NOT NULL GROUP BY hit_entity`);
const priorsFor = db.prepare('SELECT entity_id AS id, prior FROM answers WHERE prompt_id = ?');

export interface ShareTable {
  shares: Map<number, number>;
  players: number;
}

const cache = new Map<number, { at: number; table: ShareTable }>();

/** Current share estimate per valid answer: (hits + k * prior) / (N + k). Cached for a few seconds. */
export function shareTable(promptId: number): ShareTable {
  const hit = cache.get(promptId);
  if (hit && Date.now() - hit.at < 5000) return hit.table;
  const counts = new Map((firstHits.all(promptId) as { id: number; n: number }[]).map((r) => [r.id, r.n]));
  const players = [...counts.values()].reduce((a, b) => a + b, 0);
  const shares = new Map<number, number>();
  for (const { id, prior } of priorsFor.all(promptId) as { id: number; prior: number }[]) {
    shares.set(id, ((counts.get(id) ?? 0) + PRIOR_WEIGHT * prior) / (players + PRIOR_WEIGHT));
  }
  const table = { shares, players };
  cache.set(promptId, { at: Date.now(), table });
  return table;
}

export function invalidateShares(promptId?: number) {
  if (promptId == null) cache.clear();
  else cache.delete(promptId);
}

export function tierFor(promptId: number, entityId: number): { tier: Tier; share: number } | null {
  const share = shareTable(promptId).shares.get(entityId);
  if (share == null) return null;
  return { tier: tierForShare(share), share };
}
