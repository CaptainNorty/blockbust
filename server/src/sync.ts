// Pulls the most-voted movies from TMDB (with cast, directors, studios, collections) into SQLite,
// then joins IMDb ratings from IMDb's free dataset.
//   npm run sync                 -> top 6000 movies by vote count
//   npm run sync -- --movies 10000
//   npm run sync -- --refresh    -> re-fetch movies already in the database
//   npm run sync -- --no-imdb
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { DATA_DIR, db, getMeta, setMeta, tx } from './db.ts';
import { ingestMovie } from './ingest.ts';
import { tmdbClient, type DiscoverPage, type MovieDetail } from './tmdb.ts';
import { seedPersonAliases } from './aliases.ts';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, dflt: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};

const key = process.env.TMDB_API_KEY;
if (!key) {
  console.error('Missing TMDB_API_KEY. Copy .env.example to .env and paste your TMDB key.');
  process.exit(1);
}
const get = tmdbClient(key);
const target = opt('movies', 6000);
const concurrency = opt('concurrency', 8);

async function discoverIds(): Promise<number[]> {
  const ids: number[] = [];
  const pages = Math.min(500, Math.ceil(target / 20));
  for (let page = 1; page <= pages; page++) {
    const res = await get<DiscoverPage>('/discover/movie', {
      sort_by: 'vote_count.desc', include_adult: 'false', include_video: 'false', page,
    });
    ids.push(...res.results.map((r) => r.id));
    if (page >= res.total_pages) break;
    if (page % 25 === 0) console.log(`  discovered ${ids.length} movies`);
  }
  return ids.slice(0, target);
}

async function fetchMovies(ids: number[]) {
  const have = new Set((db.prepare('SELECT id FROM movies WHERE synced_at IS NOT NULL').all() as { id: number }[]).map((r) => r.id));
  const todo = flag('refresh') ? ids : ids.filter((id) => !have.has(id));
  console.log(`Fetching details for ${todo.length} movies (${ids.length - todo.length} already synced)`);
  let done = 0;
  let next = 0;
  const buffer: MovieDetail[] = [];
  const flush = () => {
    if (!buffer.length) return;
    tx(() => buffer.splice(0).forEach(ingestMovie));
  };
  async function worker() {
    while (next < todo.length) {
      const id = todo[next++];
      try {
        buffer.push(await get<MovieDetail>(`/movie/${id}`, { append_to_response: 'credits,alternative_titles' }));
      } catch (e) {
        console.warn(`  skipped movie ${id}: ${(e as Error).message}`);
        if ((e as Error).message.includes('401')) throw e;
      }
      done++;
      if (buffer.length >= 100) flush();
      if (done % 250 === 0) console.log(`  ${done}/${todo.length}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  flush();
}

async function importImdbRatings() {
  const cacheDir = resolve(DATA_DIR, 'cache');
  mkdirSync(cacheDir, { recursive: true });
  const file = resolve(cacheDir, 'title.ratings.tsv.gz');
  const dayOld = existsSync(file) && Date.now() - statSync(file).mtimeMs > 86_400_000;
  if (!existsSync(file) || dayOld) {
    console.log('Downloading IMDb ratings (non-commercial dataset, ~8 MB)');
    const res = await fetch('https://datasets.imdbws.com/title.ratings.tsv.gz');
    if (!res.ok || !res.body) throw new Error(`IMDb download failed: ${res.status}`);
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(file));
  }
  const wanted = new Map((db.prepare('SELECT id, imdb_id FROM movies WHERE imdb_id IS NOT NULL').all() as { id: number; imdb_id: string }[]).map((r) => [r.imdb_id, r.id]));
  const update = db.prepare('UPDATE movies SET imdb_rating = ?, imdb_votes = ? WHERE id = ?');
  const lines = createInterface({ input: createReadStream(file).pipe(createGunzip()) });
  let matched = 0;
  db.exec('BEGIN');
  for await (const line of lines) {
    const [tconst, rating, votes] = line.split('\t');
    const id = wanted.get(tconst);
    if (id) {
      update.run(Number(rating), Number(votes), id);
      matched++;
    }
  }
  db.exec('COMMIT');
  console.log(`IMDb ratings joined for ${matched} movies`);
}

if (getMeta('data_source') === 'demo') {
  console.log('Removing the demo catalog and its puzzles first');
  tx(() => {
    db.exec('DELETE FROM guesses; DELETE FROM puzzles;');
    db.exec('DELETE FROM credits WHERE movie_id >= 900000000; DELETE FROM aliases WHERE entity_id >= 900000000;');
    db.exec('DELETE FROM movies WHERE id >= 900000000; DELETE FROM people WHERE id >= 900000000;');
  });
}
setMeta('data_source', 'tmdb');

const started = Date.now();
console.log(`Syncing the top ${target} movies from TMDB`);
const ids = await discoverIds();
await fetchMovies(ids);
seedPersonAliases();
if (!flag('no-imdb')) {
  try {
    await importImdbRatings();
  } catch (e) {
    console.warn(`IMDb ratings skipped: ${(e as Error).message}`);
  }
}
setMeta('last_sync', new Date().toISOString());
const counts = db.prepare('SELECT (SELECT count(*) FROM movies) AS movies, (SELECT count(*) FROM people) AS people, (SELECT count(*) FROM credits) AS credits').get();
console.log(`Done in ${Math.round((Date.now() - started) / 1000)}s`, counts);
console.log('Next: npm run puzzles   (builds the next 7 days)');
