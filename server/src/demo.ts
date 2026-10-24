// Loads the small built-in catalog (no TMDB key needed) and builds the next 7 days.
import type { MovieDetail } from './tmdb.ts';
import { db, setMeta, tx } from './db.ts';
import { ingestMovie } from './ingest.ts';
import { seedPersonAliases } from './aliases.ts';
import { DEMO } from './demo-data.ts';
import { generateUpcoming } from './puzzles.ts';

const real = (db.prepare("SELECT count(*) AS n FROM movies WHERE id < 900000000").get() as { n: number }).n;
if (real > 0 && !process.argv.includes('--force')) {
  console.log('The database already has synced TMDB movies; refusing to mix in demo data (pass --force to do it anyway).');
  process.exit(0);
}

// Demo ids live far above real TMDB ids so they never collide.
let nextPerson = 900_000_000;
const personIds = new Map<string, number>();
const personId = (name: string) => {
  if (!personIds.has(name)) personIds.set(name, nextPerson++);
  return personIds.get(name)!;
};
const collectionIds = new Map<string, number>();

const rows = DEMO.trim().split('\n').map((l) => l.split('|'));
// Person popularity: roughly how often they show up, weighted by how big the films are.
const presence = new Map<string, number>();
for (const [, , dirs, cast, , , , votes] of rows) {
  for (const n of [...cast.split(';'), ...dirs.split(';')]) presence.set(n, (presence.get(n) ?? 0) + Number(votes));
}

tx(() => {
  rows.forEach(([title, year, dirs, cast, genres, studio, series, votes, imdb], i) => {
    const id = 900_000_000 + i;
    if (series && !collectionIds.has(series)) collectionIds.set(series, 900_000_000 + collectionIds.size);
    const detail: MovieDetail = {
      id, title, original_title: title, release_date: `${year}-01-01`,
      popularity: Number(votes) * 3, vote_count: Math.round(Number(votes) * 1000), vote_average: Number(imdb),
      imdb_id: `demo${i}`, genres: genres.split(';').map((name) => ({ name })),
      production_companies: [{ name: studio }],
      belongs_to_collection: series ? { id: collectionIds.get(series)!, name: series } : null,
      credits: {
        cast: cast.split(';').map((name, order) => ({ id: personId(name), name, popularity: presence.get(name)! / 2, known_for_department: 'Acting', order, character: '' })),
        crew: dirs.split(';').map((name) => ({ id: personId(name), name, popularity: presence.get(name)! / 2, known_for_department: 'Directing', job: 'Director' })),
      },
    };
    ingestMovie(detail);
    db.prepare('UPDATE movies SET imdb_rating = ?, imdb_votes = ? WHERE id = ?').run(Number(imdb), Math.round(Number(votes) * 40000), id);
  });
});
seedPersonAliases();
setMeta('data_source', 'demo');
setMeta('last_sync', new Date().toISOString());
console.log(`Loaded ${rows.length} demo movies and ${personIds.size} people.`);
const made = generateUpcoming(7);
console.log(made.length ? `Built puzzles for ${made.join(', ')}` : 'Puzzles for the next 7 days already exist.');
