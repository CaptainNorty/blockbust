// The jobs you can start from the admin page.
import { db } from './db.ts';
import { classifyPrompt, jevEnabled } from './jev.ts';
import { defineJob } from './jobs.ts';
import { addDays, generateDay, today } from './puzzles.ts';
import { addFilmography, addMovies, importImdbRatings, syncTmdb } from './tmdb-sync.ts';

const tick = () => new Promise((r) => setImmediate(r));

defineJob('tmdb-sync', {
  title: 'Sync from TMDB',
  run: (p, ctx) => syncTmdb({ movies: Number(p.movies ?? 20000), minVotes: Number(p.minVotes ?? 25), refresh: Boolean(p.refresh), imdb: p.imdb !== false }, ctx),
});

defineJob('imdb-ratings', {
  title: 'Refresh IMDb ratings',
  run: (_p, ctx) => importImdbRatings(ctx),
});

defineJob('tmdb-add-movies', {
  title: 'Add movies from TMDB',
  run: (p, ctx) => addMovies((p.ids as number[]).map(Number), ctx),
});

defineJob('tmdb-add-person', {
  title: "Add a person's films from TMDB",
  run: (p, ctx) => addFilmography(Number(p.personId), Number(p.minVotes ?? 10), ctx),
});

defineJob('rebuild-puzzles', {
  title: 'Rebuild puzzles',
  async run(p, ctx) {
    const from = String(p.from || today());
    const days = Math.max(1, Math.min(60, Number(p.days ?? 7)));
    const includePlayed = Boolean(p.includePlayed);
    let built = 0;
    for (let i = 0; i < days; i++) {
      ctx.check();
      const date = addDays(from, i);
      const plays = (db.prepare('SELECT count(*) AS n FROM plays WHERE prompt_id IN (SELECT id FROM prompts WHERE date = ?)').get(date) as { n: number }).n;
      if (plays && !includePlayed) {
        ctx.log(`${date}: kept (${plays} plays already)`);
      } else {
        generateDay(date, { force: true });
        const r = db.prepare('SELECT count(*) AS q, (SELECT count(*) FROM answers WHERE prompt_id IN (SELECT id FROM prompts WHERE date = ?)) AS a FROM prompts WHERE date = ?').get(date, date) as { q: number; a: number };
        ctx.log(`${date}: ${r.q} questions, ${r.a.toLocaleString()} valid answers`);
        built++;
      }
      ctx.progress(i + 1, days, 'Building puzzles');
      await tick();
    }
    return `Rebuilt ${built} of ${days} days`;
  },
});

defineJob('jev-label', {
  title: 'Label answers with Jev',
  async run(p, ctx) {
    if (!jevEnabled()) throw new Error('Set TYPESAFE_API_KEY in .env (and restart npm run dev) to use Jev.');
    const from = String(p.from || today());
    const to = addDays(from, Math.max(1, Number(p.days ?? 7)) - 1);
    const onlyNew = p.onlyNew !== false;
    const prompts = db.prepare(`SELECT id, date, idx, text,
        (SELECT count(*) FROM answers a WHERE a.prompt_id = p.id AND a.jev_score IS NOT NULL) AS labeled
      FROM prompts p WHERE date BETWEEN ? AND ? ORDER BY date, idx`).all(from, to) as { id: number; date: string; idx: number; text: string; labeled: number }[];
    const todo = onlyNew ? prompts.filter((q) => !q.labeled) : prompts;
    ctx.log(`${todo.length} of ${prompts.length} questions to label (${from} to ${to})`);
    let answers = 0;
    for (const [i, q] of todo.entries()) {
      ctx.check();
      ctx.progress(i, todo.length, 'Asking Jev about each answer');
      const r = await classifyPrompt(q.id);
      answers += r.classified;
      ctx.log(`${q.date} #${q.idx + 1} "${q.text}": ${r.classified} answers scored`);
    }
    ctx.progress(todo.length, todo.length);
    return `Jev labeled ${answers.toLocaleString()} answers across ${todo.length} questions`;
  },
});
