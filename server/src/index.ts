import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { randomUUID } from 'node:crypto';
import {
  normalize, tierById, type EntityType, type FinishResponse, type GuessResponse, type QuestionSummary, type TierId,
} from '@blockbust/shared';
import './admin-jobs.ts';
import { catalog, entryLabel, invalidateCatalog, resolveText, suggest } from './catalog.ts';
import { cancel, enqueue, getJob, initJobs, jobKinds, listJobs } from './jobs.ts';
import { searchTmdb } from './tmdb-sync.ts';
import { db, getMeta } from './db.ts';
import { classifyPrompt, jevEnabled } from './jev.ts';
import { CATEGORIES, generateDay, generateUpcoming, swapPrompt, today } from './puzzles.ts';
import { invalidateShares, shareTable, tierFor } from './rarity.ts';

const SECONDS = Number(process.env.QUESTION_SECONDS ?? 20);
const GRACE_MS = 1500;
const PORT = Number(process.env.PORT ?? 8787);

/** The browser gets this many of the most popular names for instant autocomplete; the rest come from /api/suggest. */
const CLIENT_CATALOG = { movie: Number(process.env.CLIENT_MOVIES ?? 25_000), person: Number(process.env.CLIENT_PEOPLE ?? 30_000) };

initJobs();
const app = new Hono();
app.use('/api/catalog/*', compress());

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

interface PromptRow {
  id: number;
  idx: number;
  text: string;
  category: string;
  answer_type: EntityType;
}

const promptAt = (date: string, idx: number) =>
  db.prepare('SELECT id, idx, text, category, answer_type FROM prompts WHERE date = ? AND idx = ?').get(date, idx) as PromptRow | undefined;

function ensurePuzzle(date: string) {
  const row = db.prepare('SELECT number FROM puzzles WHERE date = ?').get(date) as { number: number } | undefined;
  if (row) return row.number;
  generateDay(date);
  return (db.prepare('SELECT number FROM puzzles WHERE date = ?').get(date) as { number: number }).number;
}

function ensureSession(id: string) {
  db.prepare('INSERT OR IGNORE INTO sessions (id, created_at) VALUES (?, ?)').run(id, new Date().toISOString());
}

// ---------- game ----------

app.get('/api/today', (c) => {
  const date = c.req.query('date') || today();
  const number = ensurePuzzle(date);
  const n = (db.prepare('SELECT count(*) AS n FROM prompts WHERE date = ?').get(date) as { n: number }).n;
  return c.json({ date, number, questionCount: n, secondsPerQuestion: SECONDS });
});

app.post('/api/session', (c) => {
  const id = randomUUID();
  ensureSession(id);
  return c.json({ sessionId: id });
});

app.get('/api/catalog/:type', (c) => {
  const type = c.req.param('type') as EntityType;
  if (type !== 'movie' && type !== 'person') return c.json({ error: 'bad type' }, 400);
  const rows = catalog(type).rows;
  return c.json({ rows: rows.slice(0, CLIENT_CATALOG[type]), complete: rows.length <= CLIENT_CATALOG[type] });
});

app.get('/api/suggest', (c) => {
  const type = c.req.query('type') as EntityType;
  if (type !== 'movie' && type !== 'person') return c.json({ error: 'bad type' }, 400);
  return c.json(suggest(type, c.req.query('q') ?? ''));
});

app.post('/api/question/start', async (c) => {
  const { sessionId, date, index } = await c.req.json();
  ensureSession(sessionId);
  const p = promptAt(date, index);
  if (!p) return c.json({ error: 'No such question' }, 404);
  db.prepare('INSERT OR IGNORE INTO plays (session_id, prompt_id, started_at) VALUES (?, ?, ?)').run(sessionId, p.id, Date.now());
  const play = db.prepare('SELECT started_at FROM plays WHERE session_id = ? AND prompt_id = ?').get(sessionId, p.id) as { started_at: number };
  const remainingMs = Math.max(0, play.started_at + SECONDS * 1000 - Date.now());
  return c.json({ index, text: p.text, category: p.category, answerType: p.answer_type, seconds: SECONDS, remainingMs });
});

app.post('/api/guess', async (c) => {
  const { sessionId, date, index, entityId, text } = await c.req.json();
  const p = promptAt(date, index);
  if (!p) return c.json({ error: 'No such question' }, 404);
  const play = db.prepare('SELECT started_at, hit_entity FROM plays WHERE session_id = ? AND prompt_id = ?').get(sessionId, p.id) as
    | { started_at: number; hit_entity: number | null } | undefined;
  const reply = (r: GuessResponse) => c.json(r);
  if (!play || play.hit_entity != null || Date.now() > play.started_at + SECONDS * 1000 + GRACE_MS) return reply({ result: 'expired' });

  let id: number | null = null;
  if (typeof entityId === 'number' && catalog(p.answer_type).entries.has(entityId)) id = entityId;
  else {
    const r = resolveText(p.answer_type, String(text ?? ''));
    if (r.kind === 'ambiguous') return reply({ result: 'ambiguous', candidates: r.candidates });
    if (r.kind === 'match') id = r.id;
  }

  const logGuess = db.prepare('INSERT INTO guesses (session_id, prompt_id, raw, entity_id, correct, at) VALUES (?, ?, ?, ?, ?, ?)');
  const bump = db.prepare('UPDATE plays SET guesses = guesses + 1 WHERE session_id = ? AND prompt_id = ?');
  if (id == null) {
    logGuess.run(sessionId, p.id, String(text ?? ''), null, 0, Date.now());
    bump.run(sessionId, p.id);
    return reply({ result: 'unknown' });
  }
  const label = entryLabel(p.answer_type, id);
  const repeat = db.prepare('SELECT 1 FROM guesses WHERE session_id = ? AND prompt_id = ? AND entity_id = ?').get(sessionId, p.id, id);
  if (repeat) return reply({ result: 'repeat', label });

  const t = tierFor(p.id, id);
  logGuess.run(sessionId, p.id, String(text ?? label), id, t ? 1 : 0, Date.now());
  bump.run(sessionId, p.id);
  if (!t) return reply({ result: 'miss', label });

  db.prepare('UPDATE plays SET hit_entity = ?, points = ?, share = ?, tier = ? WHERE session_id = ? AND prompt_id = ?')
    .run(id, t.tier.points, t.share, t.tier.id, sessionId, p.id);
  invalidateShares(p.id);
  return reply({ result: 'hit', label, tier: t.tier.id, share: t.share, points: t.tier.points });
});

app.post('/api/finish', async (c) => {
  const { sessionId, date } = await c.req.json();
  const number = ensurePuzzle(date);
  const prompts = db.prepare('SELECT id, idx, text, answer_type FROM prompts WHERE date = ? ORDER BY idx').all(date) as unknown as PromptRow[];
  const questions: QuestionSummary[] = prompts.map((p) => {
    const play = db.prepare('SELECT hit_entity, points, share, tier, guesses FROM plays WHERE session_id = ? AND prompt_id = ?').get(sessionId, p.id) as
      | { hit_entity: number | null; points: number; share: number; tier: TierId; guesses: number } | undefined;
    const { shares } = shareTable(p.id);
    const top = [...shares.entries()].sort((a, b) => b[1] - a[1]);
    return {
      index: p.idx,
      text: p.text,
      hit: play?.hit_entity != null ? { label: entryLabel(p.answer_type, play.hit_entity), tier: play.tier, points: play.points, share: play.share } : null,
      guesses: play?.guesses ?? 0,
      answerCount: top.length,
      topAnswers: [...top.slice(0, 8), ...top.slice(-3)]
        .filter((v, i, arr) => arr.findIndex((x) => x[0] === v[0]) === i)
        .map(([id, share]) => ({ label: entryLabel(p.answer_type, id), share, tier: tierFor(p.id, id)!.tier.id })),
    };
  });
  const score = questions.reduce((s, q) => s + (q.hit?.points ?? 0), 0);
  db.prepare(`INSERT INTO results (session_id, date, score, finished_at) VALUES (?, ?, ?, ?)
    ON CONFLICT DO UPDATE SET score = excluded.score, finished_at = excluded.finished_at`).run(sessionId, date, score, new Date().toISOString());
  const others = db.prepare('SELECT score FROM results WHERE date = ? AND session_id != ?').all(date, sessionId) as { score: number }[];
  const percentile = others.length ? others.filter((o) => o.score < score).length / others.length : null;
  const all = [...others.map((o) => o.score), score];
  const bucketSize = 100;
  const buckets = new Map<number, number>();
  for (const s of all) buckets.set(Math.floor(s / bucketSize) * bucketSize, (buckets.get(Math.floor(s / bucketSize) * bucketSize) ?? 0) + 1);
  const histogram = [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([bucket, count]) => ({ bucket, count }));
  const res: FinishResponse = { date, number, score, percentile, players: all.length, histogram, questions };
  return c.json(res);
});

// ---------- admin ----------

app.get('/api/admin/stats', (c) => {
  const counts = db.prepare(`SELECT (SELECT count(*) FROM movies) AS movies, (SELECT count(*) FROM people) AS people,
    (SELECT count(*) FROM credits) AS credits, (SELECT count(*) FROM movies WHERE imdb_rating IS NOT NULL) AS imdbRated`).get();
  const days = db.prepare('SELECT date, number, (SELECT count(*) FROM results r WHERE r.date = p.date) AS players FROM puzzles p ORDER BY date DESC LIMIT 60').all();
  return c.json({
    counts, days, today: today(), lastSync: getMeta('last_sync') ?? null, dataSource: getMeta('data_source') ?? 'tmdb',
    jev: jevEnabled(), tmdb: Boolean(process.env.TMDB_API_KEY), categories: CATEGORIES,
  });
});

app.post('/api/admin/generate', async (c) => {
  const { days = 7, date } = await c.req.json().catch(() => ({}));
  if (date) {
    generateDay(date, { force: true });
    return c.json({ built: [date] });
  }
  return c.json({ built: generateUpcoming(days) });
});

app.get('/api/admin/puzzle', (c) => {
  const date = c.req.query('date') || today();
  const prompts = db.prepare('SELECT id, idx, text, category, answer_type FROM prompts WHERE date = ? ORDER BY idx').all(date) as unknown as PromptRow[];
  return c.json(prompts.map((p) => {
    const { shares, players } = shareTable(p.id);
    const answers = db.prepare(`SELECT entity_id AS id, prior, jev_score AS jev,
        (SELECT count(*) FROM plays pl WHERE pl.prompt_id = a.prompt_id AND pl.hit_entity = a.entity_id) AS hits
      FROM answers a WHERE prompt_id = ?`).all(p.id) as { id: number; prior: number; jev: number | null; hits: number }[];
    return {
      ...p, players,
      answers: answers
        .map((a) => ({ ...a, label: entryLabel(p.answer_type, a.id), share: shares.get(a.id)!, tier: tierFor(p.id, a.id)!.tier.name }))
        .sort((a, b) => b.share - a.share),
    };
  }));
});

app.post('/api/admin/swap', async (c) => {
  const { date, idx, category } = await c.req.json();
  swapPrompt(date, idx, category || undefined);
  return c.json({ ok: true });
});

app.post('/api/admin/jev', async (c) => {
  const { promptId } = await c.req.json();
  return c.json(await classifyPrompt(promptId));
});

app.post('/api/admin/reset-plays', async (c) => {
  const { date } = await c.req.json();
  db.prepare('DELETE FROM plays WHERE prompt_id IN (SELECT id FROM prompts WHERE date = ?)').run(date);
  db.prepare('DELETE FROM guesses WHERE prompt_id IN (SELECT id FROM prompts WHERE date = ?)').run(date);
  db.prepare('DELETE FROM results WHERE date = ?').run(date);
  invalidateShares();
  return c.json({ ok: true });
});

app.get('/api/admin/unknown-guesses', (c) => {
  const rows = db.prepare(`SELECT g.raw, p.text AS prompt, p.answer_type AS type, g.at FROM guesses g JOIN prompts p ON p.id = g.prompt_id
    WHERE g.entity_id IS NULL ORDER BY g.at DESC LIMIT 100`).all();
  return c.json(rows);
});

app.get('/api/admin/search', (c) => {
  const type = (c.req.query('type') ?? 'movie') as EntityType;
  const q = normalize(c.req.query('q') ?? '');
  const rows = catalog(type).rows.filter((r) => normalize(r[1]).includes(q)).slice(0, 10);
  return c.json(rows);
});

app.post('/api/admin/alias', async (c) => {
  const { type, entityId, alias } = await c.req.json();
  db.prepare('INSERT OR IGNORE INTO aliases (entity_type, entity_id, alias) VALUES (?, ?, ?)').run(type, entityId, normalize(alias));
  invalidateCatalog();
  return c.json({ ok: true });
});

// ---------- admin: jobs ----------

app.get('/api/admin/jobs', (c) => c.json({ kinds: jobKinds(), jobs: listJobs() }));
app.get('/api/admin/jobs/:id', (c) => {
  const job = getJob(Number(c.req.param('id')));
  return job ? c.json(job) : c.json({ error: 'No such job' }, 404);
});
app.post('/api/admin/jobs', async (c) => {
  const { kind, params } = await c.req.json();
  return c.json({ id: enqueue(kind, params ?? {}) });
});
app.post('/api/admin/jobs/:id/cancel', (c) => {
  cancel(Number(c.req.param('id')));
  return c.json({ ok: true });
});
app.get('/api/admin/tmdb/search', async (c) => {
  const type = c.req.query('type') === 'person' ? 'person' : 'movie';
  return c.json(await searchTmdb(type, c.req.query('q') ?? ''));
});

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Blockbust API on http://localhost:${PORT}`);
});
