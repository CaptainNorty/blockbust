import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = resolve(here, '../data');
export const DB_PATH = process.env.BLOCKBUST_DB ?? resolve(DATA_DIR, 'blockbust.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY,           -- TMDB id
  title TEXT NOT NULL,
  original_title TEXT,
  year INTEGER,
  popularity REAL DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  vote_average REAL DEFAULT 0,
  imdb_id TEXT,
  imdb_rating REAL,
  imdb_votes INTEGER,
  genres TEXT DEFAULT '[]',         -- JSON array of names
  studios TEXT DEFAULT '[]',        -- JSON array of names
  collection_id INTEGER,
  collection_name TEXT,
  synced_at TEXT
);
CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY,           -- TMDB id
  name TEXT NOT NULL,
  popularity REAL DEFAULT 0,
  department TEXT
);
CREATE TABLE IF NOT EXISTS credits (
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id),
  kind TEXT NOT NULL,               -- 'cast' | 'director'
  billing INTEGER,                  -- cast order, 0 = top billed
  character TEXT,
  PRIMARY KEY (movie_id, person_id, kind)
);
CREATE INDEX IF NOT EXISTS credits_person ON credits(person_id, kind);
CREATE TABLE IF NOT EXISTS aliases (
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  alias TEXT NOT NULL,              -- normalized
  PRIMARY KEY (entity_type, entity_id, alias)
);
CREATE TABLE IF NOT EXISTS puzzles (
  date TEXT PRIMARY KEY,            -- YYYY-MM-DD
  number INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL REFERENCES puzzles(date) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  category TEXT NOT NULL,
  subject_key TEXT NOT NULL,        -- used to avoid repeating a subject
  text TEXT NOT NULL,
  answer_type TEXT NOT NULL,        -- 'movie' | 'person'
  difficulty REAL DEFAULT 0,
  UNIQUE (date, idx)
);
CREATE TABLE IF NOT EXISTS answers (
  prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  entity_id INTEGER NOT NULL,
  fame REAL NOT NULL,
  prior REAL NOT NULL,              -- predicted share of players, sums to 1 per prompt
  jev_score REAL,                   -- 0 (Blockbuster) .. 4 (Lost Reel), if classified
  PRIMARY KEY (prompt_id, entity_id)
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS plays (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  prompt_id INTEGER NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,      -- epoch ms
  hit_entity INTEGER,
  points INTEGER DEFAULT 0,
  share REAL,
  tier TEXT,
  guesses INTEGER DEFAULT 0,
  PRIMARY KEY (session_id, prompt_id)
);
CREATE TABLE IF NOT EXISTS guesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  prompt_id INTEGER NOT NULL,
  raw TEXT NOT NULL,
  entity_id INTEGER,
  correct INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS results (
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  score INTEGER NOT NULL,
  finished_at TEXT NOT NULL,
  PRIMARY KEY (session_id, date)
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

export function setMeta(key: string, value: string) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

export function getMeta(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
}

export function tx<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
