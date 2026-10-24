import { normalize, type Candidate, type CatalogRow, type EntityType } from '@blockbust/shared';
import { db } from './db.ts';

interface Entry {
  id: number;
  label: string;
  detail: string;
  pop: number;
}

interface Index {
  entries: Map<number, Entry>;
  /** Normalized name or alias -> entity ids. */
  exact: Map<string, number[]>;
  /** Searchable strings (names and aliases). */
  keys: { norm: string; id: number }[];
  /** Trigram -> positions in keys. */
  grams: Map<string, number[]>;
  rows: CatalogRow[];
}

const indexes = new Map<EntityType, Index>();

function trigrams(s: string): string[] {
  const p = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < p.length - 2; i++) out.add(p.slice(i, i + 3));
  return [...out];
}

function build(type: EntityType): Index {
  const list: Entry[] =
    type === 'movie'
      ? (db.prepare("SELECT id, title AS label, coalesce(year, '') AS detail, vote_count AS pop FROM movies").all() as unknown as Entry[])
      : (db.prepare(`
          SELECT p.id, p.name AS label, p.popularity AS pop,
            coalesce((SELECT m.title FROM credits c JOIN movies m ON m.id = c.movie_id
                      WHERE c.person_id = p.id ORDER BY m.vote_count DESC LIMIT 1), '') AS detail
          FROM people p
          WHERE EXISTS (SELECT 1 FROM credits c WHERE c.person_id = p.id AND (c.kind = 'director' OR c.billing <= 15))
        `).all() as unknown as Entry[]);
  const entries = new Map(list.map((e) => [e.id, { ...e, detail: String(e.detail) }]));
  const exact = new Map<string, number[]>();
  const keys: Index['keys'] = [];
  const add = (norm: string, id: number) => {
    if (!norm) return;
    const ids = exact.get(norm) ?? [];
    if (!ids.includes(id)) ids.push(id);
    exact.set(norm, ids);
    keys.push({ norm, id });
  };
  for (const e of entries.values()) add(normalize(e.label), e.id);
  const aliases = db.prepare('SELECT entity_id, alias FROM aliases WHERE entity_type = ?').all(type) as { entity_id: number; alias: string }[];
  for (const a of aliases) if (entries.has(a.entity_id)) add(a.alias, a.entity_id);
  const grams = new Map<string, number[]>();
  keys.forEach((k, i) => {
    for (const g of trigrams(k.norm)) {
      const arr = grams.get(g);
      if (arr) arr.push(i);
      else grams.set(g, [i]);
    }
  });
  const rows: CatalogRow[] = [...entries.values()]
    .sort((a, b) => b.pop - a.pop)
    .map((e) => [e.id, e.label, e.detail, Math.round(e.pop * 10) / 10]);
  return { entries, exact, keys, grams, rows };
}

export function catalog(type: EntityType): Index {
  let idx = indexes.get(type);
  if (!idx) {
    idx = build(type);
    indexes.set(type, idx);
  }
  return idx;
}

export function invalidateCatalog() {
  indexes.clear();
}

export function entryLabel(type: EntityType, id: number): string {
  return catalog(type).entries.get(id)?.label ?? `#${id}`;
}

/** Optimal string alignment distance (Damerau-Levenshtein with adjacent transpositions). */
export function editDistance(a: string, b: string, max = 4): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

function allowedDistance(len: number) {
  if (len <= 5) return 1;
  if (len <= 12) return 2;
  return 3;
}

export type Resolution =
  | { kind: 'match'; id: number }
  | { kind: 'ambiguous'; candidates: Candidate[] }
  | { kind: 'unknown' };

function toCandidate(idx: Index, id: number): Candidate {
  const e = idx.entries.get(id)!;
  return { id, label: e.label, detail: e.detail };
}

/**
 * Turns free text into one catalog entity. Never looks at the answer set, so the result
 * reveals nothing about which answers are valid.
 */
export function resolveText(type: EntityType, text: string): Resolution {
  const idx = catalog(type);
  const n = normalize(text);
  if (!n) return { kind: 'unknown' };

  const exact = idx.exact.get(n);
  if (exact?.length === 1) return { kind: 'match', id: exact[0] };
  if (exact && exact.length > 1) {
    const sorted = [...exact].sort((a, b) => idx.entries.get(b)!.pop - idx.entries.get(a)!.pop);
    return { kind: 'ambiguous', candidates: sorted.slice(0, 4).map((id) => toCandidate(idx, id)) };
  }

  // A unique prefix ("close encounters", "kill bill vol 2") counts as a match.
  if (n.length >= 5) {
    const prefixed = new Set(idx.keys.filter((k) => k.norm.startsWith(n + ' ')).map((k) => k.id));
    if (prefixed.size === 1) return { kind: 'match', id: [...prefixed][0] };
  }

  // Trigram shortlist, then edit distance.
  const counts = new Map<number, number>();
  const qGrams = trigrams(n);
  for (const g of qGrams) for (const k of idx.grams.get(g) ?? []) counts.set(k, (counts.get(k) ?? 0) + 1);
  const shortlist = [...counts.entries()]
    .map(([k, shared]) => {
      const key = idx.keys[k];
      const dice = (2 * shared) / (qGrams.length + trigrams(key.norm).length);
      return { key, dice };
    })
    .sort((a, b) => b.dice - a.dice)
    .slice(0, 40);

  const limit = allowedDistance(n.length);
  const scored = shortlist
    .map((s) => ({ ...s, dist: editDistance(n, s.key.norm, limit) }))
    .filter((s) => s.dist <= limit);

  // Keep the best key per entity.
  const best = new Map<number, { dist: number; dice: number }>();
  for (const s of scored) {
    const prev = best.get(s.key.id);
    if (!prev || s.dist < prev.dist || (s.dist === prev.dist && s.dice > prev.dice)) best.set(s.key.id, s);
  }
  const ranked = [...best.entries()].sort(
    (a, b) => a[1].dist - b[1].dist || b[1].dice - a[1].dice || idx.entries.get(b[0])!.pop - idx.entries.get(a[0])!.pop,
  );
  if (ranked.length === 1) return { kind: 'match', id: ranked[0][0] };
  if (ranked.length > 1) {
    const [first, second] = ranked;
    if (first[1].dist < second[1].dist) return { kind: 'match', id: first[0] };
    // Same distance: accept the clearly more popular one, otherwise ask.
    const p1 = idx.entries.get(first[0])!.pop;
    const p2 = idx.entries.get(second[0])!.pop;
    if (p1 > p2 * 8) return { kind: 'match', id: first[0] };
    return { kind: 'ambiguous', candidates: ranked.slice(0, 3).map(([id]) => toCandidate(idx, id)) };
  }

  const close = shortlist.filter((s) => s.dice >= 0.45);
  const ids = [...new Set(close.map((s) => s.key.id))].slice(0, 3);
  if (ids.length) return { kind: 'ambiguous', candidates: ids.map((id) => toCandidate(idx, id)) };
  return { kind: 'unknown' };
}
