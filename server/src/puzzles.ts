import type { EntityType } from '@blockbust/shared';
import { db, getMeta, setMeta, tx } from './db.ts';
import { priorsFromFame } from './rarity.ts';
import { invalidateShares } from './rarity.ts';

export const QUESTIONS_PER_DAY = 8;
const REPEAT_WINDOW_DAYS = 60;
/** Films below this many TMDB votes don't count for broad prompts (year, genre, studio). */
const BROAD_MIN_VOTES = 300;
const IMDB_MIN_VOTES = 25000;

interface Built {
  category: string;
  subjectKey: string;
  text: string;
  answerType: EntityType;
  /** entity id -> fame */
  answers: Map<number, number>;
  level: number; // 1 easy .. 3 hard
}

type Rng = () => number;

function rngFor(seed: string): Rng {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function pick<T>(rng: Rng, list: T[]): T | undefined {
  return list.length ? list[Math.floor(rng() * list.length)] : undefined;
}

/** Picks from a popularity-sorted list, favoring the top but reaching down the list sometimes. */
function pickWeighted<T>(rng: Rng, list: T[]): T | undefined {
  if (!list.length) return undefined;
  return list[Math.floor(list.length * rng() ** 1.7)];
}

const all = <T>(sql: string, ...params: (string | number)[]) => db.prepare(sql).all(...params) as T[];

const movieFame = (votes: number) => Math.log1p(votes);
const personFame = (pop: number, billing: number | null) => Math.log1p(pop) * 1.2 - 0.08 * (billing ?? 8);

function movieAnswers(rows: { id: number; vote_count: number }[]) {
  return new Map(rows.map((r) => [r.id, movieFame(r.vote_count)]));
}

function shortTitle(t: string) {
  return t.replace(/\s+Collection$/i, '');
}

// Each generator returns one prompt (or undefined if it can't find a good subject today).
const GENERATORS: Record<string, (rng: Rng, used: Set<string>) => Built | undefined> = {
  actor_films(rng, used) {
    const people = all<{ id: number; name: string }>(`
      SELECT p.id, p.name FROM people p JOIN credits c ON c.person_id = p.id AND c.kind = 'cast' AND c.billing <= 10
      GROUP BY p.id HAVING count(*) >= 8 ORDER BY p.popularity DESC LIMIT 400`).filter((p) => !used.has(`person:${p.id}`));
    const p = pickWeighted(rng, people);
    if (!p) return;
    const rows = all<{ id: number; vote_count: number }>(`
      SELECT m.id, m.vote_count FROM credits c JOIN movies m ON m.id = c.movie_id
      WHERE c.person_id = ? AND c.kind = 'cast' AND c.billing <= 10`, p.id);
    return { category: 'Actor', subjectKey: `person:${p.id}`, text: `Name a film starring ${p.name}`, answerType: 'movie', answers: movieAnswers(rows), level: 2 };
  },

  film_cast(rng, used) {
    const movies = all<{ id: number; title: string; year: number }>(`
      SELECT id, title, year FROM movies WHERE vote_count >= 3000 ORDER BY vote_count DESC LIMIT 1200`).filter((m) => !used.has(`movie:${m.id}`));
    const m = pickWeighted(rng, movies);
    if (!m) return;
    const rows = all<{ id: number; popularity: number; billing: number }>(`
      SELECT p.id, p.popularity, c.billing FROM credits c JOIN people p ON p.id = c.person_id
      WHERE c.movie_id = ? AND c.kind = 'cast' AND c.billing <= 15`, m.id);
    if (rows.length < 8) return;
    return {
      category: 'Cast', subjectKey: `movie:${m.id}`, text: `Name an actor in ${m.title} (${m.year})`, answerType: 'person',
      answers: new Map(rows.map((r) => [r.id, personFame(r.popularity, r.billing)])), level: 2,
    };
  },

  director_films(rng, used) {
    const directors = all<{ id: number; name: string }>(`
      SELECT p.id, p.name FROM people p JOIN credits c ON c.person_id = p.id AND c.kind = 'director'
      GROUP BY p.id HAVING count(*) >= 6 ORDER BY sum(1) DESC, p.popularity DESC LIMIT 200`).filter((p) => !used.has(`person:${p.id}`));
    const d = pickWeighted(rng, directors);
    if (!d) return;
    const rows = all<{ id: number; vote_count: number }>(`
      SELECT m.id, m.vote_count FROM credits c JOIN movies m ON m.id = c.movie_id WHERE c.person_id = ? AND c.kind = 'director'`, d.id);
    return { category: 'Director', subjectKey: `person:${d.id}`, text: `Name a film directed by ${d.name}`, answerType: 'movie', answers: movieAnswers(rows), level: 1 };
  },

  director_regulars(rng, used) {
    const directors = all<{ id: number; name: string }>(`
      SELECT p.id, p.name FROM people p JOIN credits c ON c.person_id = p.id AND c.kind = 'director'
      GROUP BY p.id HAVING count(*) >= 6 ORDER BY count(*) DESC LIMIT 150`).filter((p) => !used.has(`regulars:${p.id}`));
    for (let tries = 0; tries < 5; tries++) {
      const d = pickWeighted(rng, directors);
      if (!d) return;
      const rows = all<{ id: number; popularity: number; films: number }>(`
        SELECT p.id, p.popularity, count(*) AS films
        FROM credits dc JOIN credits c ON c.movie_id = dc.movie_id AND c.kind = 'cast' AND c.billing <= 15
        JOIN people p ON p.id = c.person_id
        WHERE dc.person_id = ? AND dc.kind = 'director' AND p.id != dc.person_id
        GROUP BY p.id HAVING count(*) >= 2`, d.id);
      if (rows.length < 5) continue;
      return {
        category: 'Regulars', subjectKey: `regulars:${d.id}`, text: `Name an actor who appeared in 2+ films directed by ${d.name}`, answerType: 'person',
        answers: new Map(rows.map((r) => [r.id, Math.log1p(r.popularity) + 0.4 * r.films])), level: 3,
      };
    }
  },

  collection(rng, used) {
    const cols = all<{ collection_id: number; collection_name: string }>(`
      SELECT collection_id, collection_name FROM movies WHERE collection_id IS NOT NULL
      GROUP BY collection_id HAVING count(*) >= 4 ORDER BY sum(vote_count) DESC LIMIT 150`).filter((c) => !used.has(`collection:${c.collection_id}`));
    const c = pickWeighted(rng, cols);
    if (!c) return;
    const rows = all<{ id: number; vote_count: number }>('SELECT id, vote_count FROM movies WHERE collection_id = ?', c.collection_id);
    return { category: 'Series', subjectKey: `collection:${c.collection_id}`, text: `Name a film in the ${shortTitle(c.collection_name)} series`, answerType: 'movie', answers: movieAnswers(rows), level: 2 };
  },

  genre_decade(rng, used) {
    const genres = ['Action', 'Comedy', 'Horror', 'Science Fiction', 'Animation', 'Romance', 'Thriller', 'Western', 'War', 'Crime', 'Fantasy', 'Mystery', 'Family', 'Music'];
    for (let tries = 0; tries < 8; tries++) {
      const g = pick(rng, genres)!;
      const decade = 1960 + 10 * Math.floor(rng() * 7);
      const key = `genre:${g}:${decade}`;
      if (used.has(key)) continue;
      const rows = all<{ id: number; vote_count: number }>(`
        SELECT m.id, m.vote_count FROM movies m, json_each(m.genres) g
        WHERE g.value = ? AND m.year BETWEEN ? AND ? AND m.vote_count >= ?`, g, decade, decade + 9, BROAD_MIN_VOTES);
      if (rows.length < 12) continue;
      const label = g === 'Science Fiction' ? 'sci-fi' : g === 'Music' ? 'music' : g.toLowerCase();
      return { category: 'Genre', subjectKey: key, text: `Name ${/^[aeiou]/.test(label) ? 'an' : 'a'} ${label} film from the ${decade}s`, answerType: 'movie', answers: movieAnswers(rows), level: 1 };
    }
  },

  studio(rng, used) {
    const studios = all<{ name: string; n: number }>(`
      SELECT s.value AS name, count(*) AS n FROM movies m, json_each(m.studios) s
      WHERE m.vote_count >= ? GROUP BY s.value HAVING count(*) >= 12 ORDER BY n DESC LIMIT 60`, BROAD_MIN_VOTES).filter((s) => !used.has(`studio:${s.name}`));
    const s = pickWeighted(rng, studios);
    if (!s) return;
    const rows = all<{ id: number; vote_count: number; year: number }>(`
      SELECT m.id, m.vote_count, m.year FROM movies m, json_each(m.studios) s WHERE s.value = ? AND m.vote_count >= ?`, s.name, BROAD_MIN_VOTES);
    // Giant studios get narrowed to a decade so the answer list stays meaningful.
    if (rows.length > 150) {
      const decades = [...new Set(rows.map((r) => Math.floor(r.year / 10) * 10))].filter((d) => rows.filter((r) => Math.floor(r.year / 10) * 10 === d).length >= 15);
      const d = pick(rng, decades);
      if (d) {
        const narrowed = rows.filter((r) => Math.floor(r.year / 10) * 10 === d);
        return { category: 'Studio', subjectKey: `studio:${s.name}`, text: `Name a ${s.name} film from the ${d}s`, answerType: 'movie', answers: movieAnswers(narrowed), level: 2 };
      }
    }
    return { category: 'Studio', subjectKey: `studio:${s.name}`, text: `Name a film from ${s.name}`, answerType: 'movie', answers: movieAnswers(rows), level: 2 };
  },

  year(rng, used) {
    for (let tries = 0; tries < 6; tries++) {
      const span = rng() < 0.5 ? 0 : 2;
      const start = 1975 + Math.floor(rng() * 48);
      const key = `year:${start}:${span}`;
      if (used.has(key)) continue;
      const rows = all<{ id: number; vote_count: number }>(
        'SELECT id, vote_count FROM movies WHERE year BETWEEN ? AND ? AND vote_count >= ?', start, start + span, BROAD_MIN_VOTES * 2);
      if (rows.length < 12) continue;
      const text = span ? `Name a film released between ${start} and ${start + span}` : `Name a film released in ${start}`;
      return { category: 'Year', subjectKey: key, text, answerType: 'movie', answers: movieAnswers(rows), level: 1 };
    }
  },

  rating_above(rng, used) {
    const hasImdb = (db.prepare('SELECT count(*) AS n FROM movies WHERE imdb_rating IS NOT NULL').get() as { n: number }).n > 100;
    const bar = pick(rng, [7.8, 8.0, 8.2, 8.4])!;
    const key = `rating_above:${bar}`;
    if (used.has(key)) return;
    const rows = hasImdb
      ? all<{ id: number; vote_count: number }>('SELECT id, vote_count FROM movies WHERE imdb_rating >= ? AND imdb_votes >= ?', bar, IMDB_MIN_VOTES)
      : all<{ id: number; vote_count: number }>('SELECT id, vote_count FROM movies WHERE vote_average >= ? AND vote_count >= 2000', bar);
    if (rows.length < 10) return;
    return { category: 'Rating', subjectKey: key, text: `Name a film rated ${bar.toFixed(1)} or higher on ${hasImdb ? 'IMDb' : 'TMDB'}`, answerType: 'movie', answers: movieAnswers(rows), level: 1 };
  },

  rating_band(rng, used) {
    const hasImdb = (db.prepare('SELECT count(*) AS n FROM movies WHERE imdb_rating IS NOT NULL').get() as { n: number }).n > 100;
    const lo = Math.round((5.0 + rng() * 2.4) * 10) / 10;
    const hi = Math.round((lo + 0.4) * 10) / 10;
    const key = `rating_band:${lo}`;
    if (used.has(key)) return;
    const rows = hasImdb
      ? all<{ id: number; vote_count: number }>('SELECT id, vote_count FROM movies WHERE imdb_rating BETWEEN ? AND ? AND imdb_votes >= ?', lo, hi, IMDB_MIN_VOTES)
      : all<{ id: number; vote_count: number }>('SELECT id, vote_count FROM movies WHERE vote_average BETWEEN ? AND ? AND vote_count >= 2000', lo, hi);
    if (rows.length < 10) return;
    return { category: 'Rating', subjectKey: key, text: `Name a film rated between ${lo.toFixed(1)} and ${hi.toFixed(1)} on ${hasImdb ? 'IMDb' : 'TMDB'}`, answerType: 'movie', answers: movieAnswers(rows), level: 3 };
  },

  pair(rng, used) {
    const pairs = all<{ a: number; b: number; an: string; bn: string; n: number }>(`
      SELECT c1.person_id AS a, c2.person_id AS b, p1.name AS an, p2.name AS bn, count(*) AS n
      FROM credits c1 JOIN credits c2 ON c1.movie_id = c2.movie_id AND c1.person_id < c2.person_id
      JOIN people p1 ON p1.id = c1.person_id JOIN people p2 ON p2.id = c2.person_id
      WHERE c1.kind = 'cast' AND c2.kind = 'cast' AND c1.billing <= 6 AND c2.billing <= 6
      GROUP BY c1.person_id, c2.person_id HAVING count(*) >= 3
      ORDER BY count(*) DESC, p1.popularity + p2.popularity DESC LIMIT 200`).filter((p) => !used.has(`pair:${p.a}:${p.b}`));
    const p = pickWeighted(rng, pairs);
    if (!p) return;
    const rows = all<{ id: number; vote_count: number }>(`
      SELECT m.id, m.vote_count FROM movies m
      WHERE EXISTS (SELECT 1 FROM credits WHERE movie_id = m.id AND person_id = ? AND kind = 'cast' AND billing <= 15)
        AND EXISTS (SELECT 1 FROM credits WHERE movie_id = m.id AND person_id = ? AND kind = 'cast' AND billing <= 15)`, p.a, p.b);
    return { category: 'Pair', subjectKey: `pair:${p.a}:${p.b}`, text: `Name a film starring both ${p.an} and ${p.bn}`, answerType: 'movie', answers: movieAnswers(rows), level: 3 };
  },
};

export const CATEGORIES = Object.keys(GENERATORS);

function recentSubjects(date: string): Set<string> {
  const rows = all<{ subject_key: string }>(`
    SELECT subject_key FROM prompts WHERE date != ? AND date >= date(?, '-${REPEAT_WINDOW_DAYS} days') AND date <= date(?, '+${REPEAT_WINDOW_DAYS} days')`, date, date, date);
  return new Set(rows.map((r) => r.subject_key));
}

function puzzleNumber(date: string): number {
  let epoch = getMeta('epoch');
  if (!epoch || date < epoch) {
    epoch = date;
    setMeta('epoch', epoch);
  }
  return Math.round((Date.parse(date) - Date.parse(epoch)) / 86_400_000) + 1;
}

/** Builds one prompt of a given category; used by the admin "swap" button too. */
export function buildPrompt(category: string, seed: string, used: Set<string>): Built | undefined {
  const rng = rngFor(seed);
  for (let tries = 0; tries < 6; tries++) {
    const b = GENERATORS[category]?.(rng, used);
    if (b && b.answers.size >= 4) return b;
  }
}

function savePrompt(date: string, idx: number, b: Built) {
  const info = db.prepare(`
    INSERT INTO prompts (date, idx, category, subject_key, text, answer_type, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(date, idx, b.category, b.subjectKey, b.text, b.answerType, b.level);
  const promptId = Number(info.lastInsertRowid);
  const ids = [...b.answers.keys()];
  const priors = priorsFromFame(ids.map((id) => b.answers.get(id)!));
  const ins = db.prepare('INSERT INTO answers (prompt_id, entity_id, fame, prior) VALUES (?, ?, ?, ?)');
  ids.forEach((id, i) => ins.run(promptId, id, b.answers.get(id)!, priors[i]));
  return promptId;
}

export function generateDay(date: string, { force = false } = {}): boolean {
  const exists = db.prepare('SELECT 1 FROM puzzles WHERE date = ?').get(date);
  if (exists && !force) return false;
  const movieCount = (db.prepare('SELECT count(*) AS n FROM movies').get() as { n: number }).n;
  if (movieCount < 50) throw new Error('The movie database is nearly empty. Run `npm run sync` (or `npm run demo`) first.');

  const rng = rngFor(`day:${date}`);
  const used = recentSubjects(date);
  const order = [...CATEGORIES].sort(() => rng() - 0.5);
  const built: Built[] = [];
  for (const cat of order) {
    if (built.length >= QUESTIONS_PER_DAY) break;
    const b = buildPrompt(cat, `${date}:${cat}`, used);
    if (b) {
      built.push(b);
      used.add(b.subjectKey);
    }
  }
  // Small databases may not fill every category; top up with repeats of the broad ones.
  for (let i = 0; built.length < QUESTIONS_PER_DAY && i < 20; i++) {
    const cat = pick(rng, ['actor_films', 'film_cast', 'director_films', 'year', 'genre_decade'])!;
    const b = buildPrompt(cat, `${date}:${cat}:${i}`, used);
    if (b) {
      built.push(b);
      used.add(b.subjectKey);
    }
  }
  // Easy first, hard last; bigger answer sets first within a level.
  built.sort((a, b) => a.level - b.level || b.answers.size - a.answers.size);

  tx(() => {
    db.prepare('DELETE FROM puzzles WHERE date = ?').run(date);
    db.prepare('INSERT INTO puzzles (date, number, created_at) VALUES (?, ?, ?)').run(date, puzzleNumber(date), new Date().toISOString());
    built.forEach((b, i) => savePrompt(date, i, b));
  });
  invalidateShares();
  return true;
}

/** Replaces one question of a day with a fresh prompt of the given (or same) category. Clears plays on it. */
export function swapPrompt(date: string, idx: number, category?: string) {
  const old = db.prepare('SELECT id, category, subject_key FROM prompts WHERE date = ? AND idx = ?').get(date, idx) as
    | { id: number; category: string; subject_key: string } | undefined;
  if (!old) throw new Error('No such question');
  const used = recentSubjects(date);
  for (const r of all<{ subject_key: string }>('SELECT subject_key FROM prompts WHERE date = ?', date)) used.add(r.subject_key);
  const cat = category ?? CATEGORIES.find((c) => GENERATORS[c] && catLabel(c) === old.category) ?? 'actor_films';
  const b = buildPrompt(cat, `${date}:${idx}:${Date.now()}`, used);
  if (!b) throw new Error(`Couldn't build a ${cat} prompt`);
  tx(() => {
    db.prepare('DELETE FROM prompts WHERE id = ?').run(old.id);
    savePrompt(date, idx, b);
  });
  invalidateShares();
}

const CAT_LABELS: Record<string, string> = {
  actor_films: 'Actor', film_cast: 'Cast', director_films: 'Director', director_regulars: 'Regulars', collection: 'Series',
  genre_decade: 'Genre', studio: 'Studio', year: 'Year', rating_above: 'Rating', rating_band: 'Rating', pair: 'Pair',
};
function catLabel(c: string) {
  return CAT_LABELS[c];
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(date: string, n: number): string {
  return new Date(Date.parse(date) + n * 86_400_000).toISOString().slice(0, 10);
}

export function generateUpcoming(days = 7, from = today()): string[] {
  const made: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    if (generateDay(d)) made.push(d);
  }
  return made;
}
