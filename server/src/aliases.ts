import { normalize } from '@blockbust/shared';
import { db } from './db.ts';

// Nicknames people actually type. Add to these whenever a fair guess gets marked as unknown
// (the admin portal lists recent unknown guesses).
const PEOPLE: Record<string, string[]> = {
  'Samuel L. Jackson': ['sam jackson', 'samuel jackson', 'sam l jackson'],
  'Dwayne Johnson': ['the rock'],
  'Arnold Schwarzenegger': ['arnold', 'arnie'],
  'Leonardo DiCaprio': ['leo dicaprio', 'leo'],
  'Robert Downey Jr.': ['rdj', 'robert downey'],
  'Paul Thomas Anderson': ['pta'],
  'Philip Seymour Hoffman': ['psh'],
  'Michael B. Jordan': ['michael jordan'],
  'Joseph Gordon-Levitt': ['jgl'],
  'Sylvester Stallone': ['sly stallone'],
  'Jennifer Lopez': ['j lo', 'jlo'],
  'Tom Cruise': ['cruise'],
};

const MOVIES: Record<string, string[]> = {
  'The Lord of the Rings: The Fellowship of the Ring': ['fellowship of the ring', 'lotr 1', 'lotr'],
  'The Lord of the Rings: The Two Towers': ['two towers', 'lotr 2'],
  'The Lord of the Rings: The Return of the King': ['return of the king', 'lotr 3'],
  'Terminator 2: Judgment Day': ['t2', 'terminator 2'],
  'Star Wars': ['a new hope', 'star wars a new hope', 'star wars 4', 'star wars episode 4'],
  'The Empire Strikes Back': ['esb', 'star wars 5', 'star wars episode 5'],
  'Return of the Jedi': ['star wars 6', 'star wars episode 6'],
  'Harry Potter and the Philosopher\'s Stone': ['harry potter and the sorcerers stone', 'sorcerers stone', 'harry potter 1'],
  'Pirates of the Caribbean: The Curse of the Black Pearl': ['pirates of the caribbean', 'curse of the black pearl'],
  'Mad Max: Fury Road': ['fury road'],
  'Raiders of the Lost Ark': ['indiana jones and the raiders of the lost ark', 'indiana jones 1'],
  'Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb': ['dr strangelove', 'doctor strangelove'],
  'Eternal Sunshine of the Spotless Mind': ['eternal sunshine'],
  'Borat: Cultural Learnings of America for Make Benefit Glorious Nation of Kazakhstan': ['borat'],
};

/** Adds built-in nickname aliases plus automatic ones ("Title: Subtitle" also matches "Subtitle" and "Title Subtitle" variants). */
export function seedPersonAliases() {
  const insert = db.prepare('INSERT OR IGNORE INTO aliases (entity_type, entity_id, alias) VALUES (?, ?, ?)');
  const person = db.prepare('SELECT id FROM people WHERE name = ? ORDER BY popularity DESC LIMIT 1');
  const movie = db.prepare('SELECT id FROM movies WHERE title = ? ORDER BY vote_count DESC LIMIT 1');
  db.exec('BEGIN');
  for (const [name, list] of Object.entries(PEOPLE)) {
    const row = person.get(name) as { id: number } | undefined;
    if (row) list.forEach((a) => insert.run('person', row.id, normalize(a)));
  }
  for (const [title, list] of Object.entries(MOVIES)) {
    const row = movie.get(title) as { id: number } | undefined;
    if (row) list.forEach((a) => insert.run('movie', row.id, normalize(a)));
  }
  // "Kill Bill: Vol. 1" -> also "kill bill vol 1"; "Alien: Covenant" stays as is. Subtitle-only aliases only
  // when the subtitle is long enough to be distinctive.
  const titled = db.prepare("SELECT id, title FROM movies WHERE title LIKE '%:%'").all() as { id: number; title: string }[];
  for (const m of titled) {
    const sub = m.title.slice(m.title.indexOf(':') + 1).trim();
    if (sub.split(/\s+/).length >= 3) insert.run('movie', m.id, normalize(sub));
  }
  db.exec('COMMIT');
}
