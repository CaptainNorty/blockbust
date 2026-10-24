import { normalize, type CatalogRow } from '@blockbust/shared';

interface Row {
  id: number;
  label: string;
  detail: string;
  pop: number;
  norm: string;
  words: string[];
}

export interface Suggestion {
  id: number;
  label: string;
  detail: string;
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

/**
 * Searches the whole catalog (never just the answers), so suggestions reveal nothing.
 * Prefix and word-prefix matches first, with a typo-tolerant fallback.
 *
 * The browser only holds the most popular names. When those don't fill the list, `more()` asks the
 * server, which searches everything.
 */
export class Autocomplete {
  private rows: Row[];
  private cache = new Map<string, Promise<CatalogRow[]>>();

  constructor(rows: CatalogRow[], private complete = true, private remote?: (q: string) => Promise<CatalogRow[]>) {
    this.rows = rows.map(([id, label, detail, pop]) => {
      const norm = normalize(label);
      return { id, label, detail, pop, norm, words: norm.split(' ') };
    });
  }

  search(query: string, limit = 7): Suggestion[] {
    const q = normalize(query);
    if (q.length < 2) return [];
    const qWords = q.split(' ');
    const scored: { row: Row; score: number }[] = [];
    for (const row of this.rows) {
      let score = 0;
      if (row.norm === q) score = 4;
      else if (row.norm.startsWith(q)) score = 3;
      else if (qWords.every((w) => row.words.some((rw) => rw.startsWith(w)))) score = 2;
      else if (q.length >= 3 && row.norm.includes(q)) score = 1;
      if (score) scored.push({ row, score });
    }
    if (scored.length < 3 && q.length >= 4) {
      const qb = bigrams(q);
      for (const row of this.rows) {
        if (scored.some((s) => s.row === row)) continue;
        const rb = bigrams(row.norm.slice(0, q.length + 3));
        let shared = 0;
        for (const b of qb) if (rb.has(b)) shared++;
        const dice = (2 * shared) / (qb.size + rb.size);
        if (dice >= 0.55) scored.push({ row, score: dice });
      }
    }
    // Popularity is on a log scale so a famous match beats a slightly better obscure one.
    scored.sort((a, b) => b.score - a.score || b.row.pop - a.row.pop);
    return scored.slice(0, limit).map(({ row }) => ({ id: row.id, label: row.label, detail: row.detail }));
  }

  /** Local results topped up from the server's full catalog, or null when the local list was enough. */
  async more(query: string, local: Suggestion[], limit = 7): Promise<Suggestion[] | null> {
    const q = normalize(query);
    if (this.complete || !this.remote || q.length < 3 || local.length >= limit) return null;
    let p = this.cache.get(q);
    if (!p) {
      p = this.remote(query).catch(() => []);
      this.cache.set(q, p);
    }
    const rows = await p;
    const seen = new Set(local.map((s) => s.id));
    const extra = rows.filter(([id]) => !seen.has(id)).map(([id, label, detail]) => ({ id, label, detail }));
    return extra.length ? [...local, ...extra].slice(0, limit) : null;
  }
}
