// Everything that pulls data from TMDB (and IMDb ratings). Used by the admin jobs and by `npm run sync`.
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { seedPersonAliases } from './aliases.ts';
import { invalidateCatalog } from './catalog.ts';
import { DATA_DIR, db, getMeta, setMeta, tx } from './db.ts';
import { ingestMovie } from './ingest.ts';
import type { JobCtx } from './jobs.ts';
import { invalidateShares } from './rarity.ts';
import { tmdbClient, type DiscoverPage, type MovieDetail, type PersonCredits, type PersonSearchPage } from './tmdb.ts';

function client() {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY is missing. Put it in .env at the project root and restart `npm run dev`.');
  return tmdbClient(key);
}

/** Runs `fn` over items with a fixed number of workers, checking for cancellation between items. */
async function pool<T>(items: T[], workers: number, ctx: JobCtx, fn: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    while (next < items.length) {
      ctx.check();
      await fn(items[next++]);
    }
  }));
}

/** The most-voted movie ids. TMDB stops paging after 500 pages (10,000 results), so bigger syncs go year by year. */
async function discover(target: number, minVotes: number, ctx: JobCtx): Promise<number[]> {
  const get = client();
  const base = { sort_by: 'vote_count.desc', include_adult: 'false', include_video: 'false' };
  if (target <= 10_000) {
    const ids: number[] = [];
    const pages = Math.ceil(target / 20);
    for (let page = 1; page <= pages; page++) {
      ctx.check();
      const res = await get<DiscoverPage>('/discover/movie', { ...base, page });
      ids.push(...res.results.map((r) => r.id));
      ctx.progress(ids.length, target, 'Finding the most-voted movies');
      if (page >= res.total_pages) break;
    }
    return ids.slice(0, target);
  }
  const found = new Map<number, number>();
  const years: number[] = [];
  for (let y = new Date().getFullYear() + 1; y >= 1900; y--) years.push(y);
  let doneYears = 0;
  await pool(years, 6, ctx, async (year) => {
    for (let page = 1; page <= 500; page++) {
      ctx.check();
      const res = await get<DiscoverPage>('/discover/movie', { ...base, primary_release_year: year, 'vote_count.gte': minVotes, page });
      for (const r of res.results) found.set(r.id, r.vote_count);
      if (page >= res.total_pages) break;
    }
    ctx.progress(++doneYears, years.length, `Finding movies with ${minVotes}+ votes, year by year`);
  });
  ctx.log(`Found ${found.size.toLocaleString()} movies with ${minVotes}+ votes`);
  return [...found.entries()].sort((a, b) => b[1] - a[1]).slice(0, target).map(([id]) => id);
}

/** Fetches full details (cast, directors, studios, alternative titles) and writes them to the database. */
async function fetchDetails(ids: number[], ctx: JobCtx, { refresh = false, step = 'Fetching movie details' } = {}) {
  const get = client();
  const have = new Set((db.prepare('SELECT id FROM movies WHERE synced_at IS NOT NULL').all() as { id: number }[]).map((r) => r.id));
  const todo = refresh ? ids : ids.filter((id) => !have.has(id));
  if (todo.length < ids.length) ctx.log(`${(ids.length - todo.length).toLocaleString()} already in the database`);
  const buffer: MovieDetail[] = [];
  const flush = () => buffer.length && tx(() => buffer.splice(0).forEach(ingestMovie));
  let done = 0;
  let skipped = 0;
  const started = Date.now();
  try {
    await pool(todo, 8, ctx, async (id) => {
      try {
        buffer.push(await get<MovieDetail>(`/movie/${id}`, { append_to_response: 'credits,alternative_titles' }));
      } catch (e) {
        if ((e as Error).message.includes('401')) throw e;
        skipped++;
        ctx.log(`Skipped movie ${id}: ${(e as Error).message}`);
      }
      done++;
      if (buffer.length >= 100) flush();
      const eta = done > 20 ? Math.round(((Date.now() - started) / done) * (todo.length - done) / 1000) : null;
      ctx.progress(done, todo.length, step);
      if (done % 1000 === 0) ctx.log(`${done.toLocaleString()} / ${todo.length.toLocaleString()} movies${eta != null ? `, ${duration(eta * 1000)} left` : ''}`);
    });
  } finally {
    // Keep whatever was fetched, even if the job was cancelled.
    flush();
  }
  return { fetched: done - skipped, skipped };
}

const duration = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))} s` : `${Math.round(ms / 60_000)} min`);

function afterCatalogChange() {
  seedPersonAliases();
  invalidateCatalog();
  invalidateShares();
}

function dropDemo(ctx: JobCtx) {
  if (getMeta('data_source') !== 'demo') return;
  ctx.log('Removing the demo catalog and its puzzles first');
  tx(() => {
    db.exec('DELETE FROM guesses; DELETE FROM puzzles;');
    db.exec('DELETE FROM credits WHERE movie_id >= 900000000; DELETE FROM aliases WHERE entity_id >= 900000000;');
    db.exec('DELETE FROM movies WHERE id >= 900000000; DELETE FROM people WHERE id >= 900000000;');
  });
  setMeta('data_source', 'tmdb');
}

export interface SyncOptions {
  movies?: number;
  minVotes?: number;
  refresh?: boolean;
  imdb?: boolean;
}

export async function syncTmdb(opts: SyncOptions, ctx: JobCtx): Promise<string> {
  const target = Math.max(100, Math.min(100_000, Number(opts.movies ?? 20_000)));
  const minVotes = Math.max(1, Number(opts.minVotes ?? 25));
  client();
  dropDemo(ctx);
  setMeta('data_source', 'tmdb');
  const started = Date.now();
  ctx.log(`Syncing the top ${target.toLocaleString()} movies from TMDB`);
  const ids = await discover(target, minVotes, ctx);
  const { fetched, skipped } = await fetchDetails(ids, ctx, { refresh: Boolean(opts.refresh) });
  afterCatalogChange();
  if (opts.imdb !== false) await importImdbRatings(ctx).catch((e) => ctx.log(`IMDb ratings skipped: ${(e as Error).message}`));
  setMeta('last_sync', new Date().toISOString());
  const c = counts();
  return `Done in ${duration(Date.now() - started)}: fetched ${fetched.toLocaleString()} movies (${skipped} skipped). ` +
    `Catalog: ${c.movies.toLocaleString()} films, ${c.people.toLocaleString()} people. Rebuild upcoming puzzles to use the new data.`;
}

export function counts() {
  return db.prepare('SELECT (SELECT count(*) FROM movies) AS movies, (SELECT count(*) FROM people) AS people, (SELECT count(*) FROM credits) AS credits').get() as {
    movies: number; people: number; credits: number;
  };
}

export async function importImdbRatings(ctx: JobCtx): Promise<string> {
  const cacheDir = resolve(DATA_DIR, 'cache');
  mkdirSync(cacheDir, { recursive: true });
  const file = resolve(cacheDir, 'title.ratings.tsv.gz');
  const dayOld = existsSync(file) && Date.now() - statSync(file).mtimeMs > 86_400_000;
  if (!existsSync(file) || dayOld) {
    ctx.progress(0, 1, 'Downloading IMDb ratings (non-commercial dataset, ~8 MB)');
    const res = await fetch(process.env.IMDB_RATINGS_URL ?? 'https://datasets.imdbws.com/title.ratings.tsv.gz');
    if (!res.ok || !res.body) throw new Error(`IMDb download failed: ${res.status}`);
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(file));
  }
  const wanted = new Map((db.prepare('SELECT id, imdb_id FROM movies WHERE imdb_id IS NOT NULL').all() as { id: number; imdb_id: string }[]).map((r) => [r.imdb_id, r.id]));
  const update = db.prepare('UPDATE movies SET imdb_rating = ?, imdb_votes = ? WHERE id = ?');
  const lines = createInterface({ input: createReadStream(file).pipe(createGunzip()) });
  ctx.progress(0, wanted.size, 'Joining IMDb ratings');
  let matched = 0;
  db.exec('BEGIN');
  try {
    for await (const line of lines) {
      const [tconst, rating, votes] = line.split('\t');
      const id = wanted.get(tconst);
      if (id) {
        update.run(Number(rating), Number(votes), id);
        if (++matched % 2000 === 0) ctx.progress(matched, wanted.size);
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  ctx.progress(matched, wanted.size);
  return `IMDb ratings joined for ${matched.toLocaleString()} of ${wanted.size.toLocaleString()} movies`;
}

// ---------- filling gaps: one movie or one person at a time ----------

export async function searchTmdb(type: 'movie' | 'person', query: string) {
  const get = client();
  if (type === 'movie') {
    const res = await get<DiscoverPage>('/search/movie', { query, include_adult: 'false' });
    const have = new Set((db.prepare(`SELECT id FROM movies WHERE id IN (${res.results.map((r) => r.id).join(',') || 0})`).all() as { id: number }[]).map((r) => r.id));
    return res.results.slice(0, 10).map((r) => ({
      id: r.id, label: r.title, detail: `${r.release_date?.slice(0, 4) || '?'} · ${r.vote_count.toLocaleString()} votes`, inCatalog: have.has(r.id),
    }));
  }
  const res = await get<PersonSearchPage>('/search/person', { query, include_adult: 'false' });
  return res.results.slice(0, 10).map((r) => ({
    id: r.id, label: r.name,
    detail: [r.known_for_department, ...(r.known_for ?? []).slice(0, 2).map((k) => k.title ?? k.name)].filter(Boolean).join(' · '),
    inCatalog: Boolean(db.prepare('SELECT 1 FROM people WHERE id = ?').get(r.id)),
  }));
}

export async function addMovies(ids: number[], ctx: JobCtx): Promise<string> {
  const { fetched } = await fetchDetails(ids, ctx, { refresh: true, step: 'Fetching movies' });
  afterCatalogChange();
  const titles = db.prepare(`SELECT title, year FROM movies WHERE id IN (${ids.map(Number).join(',')})`).all() as { title: string; year: number }[];
  return `Added ${fetched} movie${fetched === 1 ? '' : 's'}: ${titles.map((t) => `${t.title} (${t.year})`).join(', ')}`;
}

/** Adds every film a person acted in or directed (with at least `minVotes` TMDB votes) that's missing. */
export async function addFilmography(personId: number, minVotes: number, ctx: JobCtx): Promise<string> {
  const get = client();
  const person = await get<{ name: string }>(`/person/${personId}`);
  const credits = await get<PersonCredits>(`/person/${personId}/movie_credits`);
  const films = [...credits.cast, ...credits.crew.filter((c) => c.job === 'Director')].filter((f) => f.vote_count >= minVotes);
  const ids = [...new Set(films.map((f) => f.id))];
  ctx.log(`${person.name}: ${ids.length} films with ${minVotes}+ votes`);
  const { fetched } = await fetchDetails(ids, ctx, { step: `Fetching ${person.name}'s films` });
  afterCatalogChange();
  return `Added ${fetched} new film${fetched === 1 ? '' : 's'} for ${person.name}`;
}
