import { normalize } from '@blockbust/shared';
import { db } from './db.ts';
import type { MovieDetail } from './tmdb.ts';

const MAX_BILLING = 25;
const ALIAS_COUNTRIES = new Set(['US', 'GB', 'CA', 'AU', 'IE', 'NZ']);

const upsertMovie = db.prepare(`
INSERT INTO movies (id, title, original_title, year, popularity, vote_count, vote_average, imdb_id, genres, studios, collection_id, collection_name, synced_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET title = excluded.title, original_title = excluded.original_title, year = excluded.year,
  popularity = excluded.popularity, vote_count = excluded.vote_count, vote_average = excluded.vote_average,
  imdb_id = excluded.imdb_id, genres = excluded.genres, studios = excluded.studios,
  collection_id = excluded.collection_id, collection_name = excluded.collection_name, synced_at = excluded.synced_at`);

const upsertPerson = db.prepare(`
INSERT INTO people (id, name, popularity, department) VALUES (?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET name = excluded.name, popularity = max(people.popularity, excluded.popularity),
  department = coalesce(excluded.department, people.department)`);

const insertCredit = db.prepare(`
INSERT INTO credits (movie_id, person_id, kind, billing, character) VALUES (?, ?, ?, ?, ?)
ON CONFLICT DO UPDATE SET billing = excluded.billing, character = excluded.character`);

const clearCredits = db.prepare('DELETE FROM credits WHERE movie_id = ?');
const clearMovieAliases = db.prepare("DELETE FROM aliases WHERE entity_type = 'movie' AND entity_id = ?");
const insertAlias = db.prepare('INSERT OR IGNORE INTO aliases (entity_type, entity_id, alias) VALUES (?, ?, ?)');

/** Writes one movie with its cast, director(s) and alternative titles. Call inside a transaction. */
export function ingestMovie(m: MovieDetail) {
  const year = m.release_date ? Number(m.release_date.slice(0, 4)) : null;
  upsertMovie.run(
    m.id, m.title, m.original_title, year, m.popularity, m.vote_count, m.vote_average, m.imdb_id || null,
    JSON.stringify(m.genres.map((g) => g.name)),
    JSON.stringify(m.production_companies.map((c) => c.name)),
    m.belongs_to_collection?.id ?? null, m.belongs_to_collection?.name ?? null,
    new Date().toISOString(),
  );
  clearCredits.run(m.id);
  for (const c of m.credits.cast) {
    if (c.order > MAX_BILLING) continue;
    upsertPerson.run(c.id, c.name, c.popularity ?? 0, c.known_for_department ?? null);
    insertCredit.run(m.id, c.id, 'cast', c.order, c.character ?? null);
  }
  for (const c of m.credits.crew) {
    if (c.job !== 'Director') continue;
    upsertPerson.run(c.id, c.name, c.popularity ?? 0, c.known_for_department ?? null);
    insertCredit.run(m.id, c.id, 'director', null, null);
  }
  clearMovieAliases.run(m.id);
  const own = normalize(m.title);
  const titles = [m.original_title, ...(m.alternative_titles?.titles ?? []).filter((t) => ALIAS_COUNTRIES.has(t.iso_3166_1)).map((t) => t.title)];
  for (const t of titles) {
    const n = normalize(t ?? '');
    if (n && n !== own && /[a-z]/.test(n)) insertAlias.run('movie', m.id, n);
  }
}
