// npm run puzzles                 -> build any missing days from today through 6 days out
// npm run puzzles -- 2026-10-30   -> rebuild one day (replaces it)
import { db } from './db.ts';
import { generateDay, generateUpcoming } from './puzzles.ts';

const date = process.argv[2];
if (date) {
  generateDay(date, { force: true });
  console.log(`Rebuilt ${date}`);
} else {
  const made = generateUpcoming(7);
  console.log(made.length ? `Built ${made.join(', ')}` : 'The next 7 days already exist.');
}
const rows = db.prepare(`
  SELECT p.date, p.idx, p.text, (SELECT count(*) FROM answers a WHERE a.prompt_id = p.id) AS answers
  FROM prompts p WHERE p.date >= date('now', '-1 day') ORDER BY p.date, p.idx`).all() as { date: string; idx: number; text: string; answers: number }[];
let last = '';
for (const r of rows) {
  if (r.date !== last) console.log(`\n${r.date}`);
  last = r.date;
  console.log(`  ${r.idx + 1}. ${r.text}  (${r.answers} answers)`);
}
