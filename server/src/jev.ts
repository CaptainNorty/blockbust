// Optional: asks TypeSafe's Jev to estimate how obscure each answer is, as a second opinion
// alongside TMDB vote counts. Used from the admin portal; never during play.
import { entryLabel, catalog } from './catalog.ts';
import { db, tx } from './db.ts';
import { blendJev, invalidateShares, priorsFromFame } from './rarity.ts';
import type { EntityType } from '@blockbust/shared';

const ENDPOINT = (process.env.TYPESAFE_API_BASE ?? 'https://api.typesafe.ai') + '/v1/systemone';
const MODEL = process.env.JEV_MODEL ?? 'jev-latest';
const MAX_ANSWERS = 150;

const CRITERIA = [
  'Blockbuster: the first answer most casual movie fans would give',
  'Crowd Pleaser: well known; plenty of people would think of it',
  'Hidden Gem: real fans know it, but few would say it first',
  'Cult Classic: a deep cut that only devoted fans would name',
  'Lost Reel: obscure; almost nobody would think of it for this prompt',
];

export const jevEnabled = () => Boolean(process.env.TYPESAFE_API_KEY);

async function scoreOne(state: string): Promise<number> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.TYPESAFE_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      state,
      questions: {
        rarity: {
          type: 'score',
          instructions: 'In a daily movie trivia game, players answer the prompt with any valid answer. How rare would this particular answer be among players?',
          criteria: CRITERIA,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { answers: { rarity: { score: number } } };
  return body.answers.rarity.score;
}

/** Scores the most famous answers of one prompt with Jev, then blends that into the prior. */
export async function classifyPrompt(promptId: number): Promise<{ classified: number }> {
  if (!jevEnabled()) throw new Error('Set TYPESAFE_API_KEY in .env to use Jev.');
  const prompt = db.prepare('SELECT text, answer_type FROM prompts WHERE id = ?').get(promptId) as { text: string; answer_type: EntityType };
  const rows = db.prepare('SELECT entity_id AS id, fame FROM answers WHERE prompt_id = ? ORDER BY fame DESC').all(promptId) as { id: number; fame: number }[];
  const idx = catalog(prompt.answer_type);
  const targets = rows.slice(0, MAX_ANSWERS);
  const scores = new Map<number, number>();
  let next = 0;
  async function worker() {
    while (next < targets.length) {
      const i = next++;
      const r = targets[i];
      const e = idx.entries.get(r.id);
      const state = JSON.stringify({
        prompt: prompt.text,
        answer: entryLabel(prompt.answer_type, r.id),
        detail: e?.detail,
        popularity_rank_among_valid_answers: `${i + 1} of ${rows.length}`,
        [prompt.answer_type === 'movie' ? 'tmdb_vote_count' : 'tmdb_popularity']: e?.pop,
      });
      scores.set(r.id, await scoreOne(state));
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));

  const fame = rows.map((r) => r.fame);
  const base = priorsFromFame(fame);
  const blended = blendJev(rows.map((r, i) => ({ prior: base[i], jev: scores.get(r.id) ?? null })));
  const upd = db.prepare('UPDATE answers SET prior = ?, jev_score = ? WHERE prompt_id = ? AND entity_id = ?');
  tx(() => rows.forEach((r, i) => upd.run(blended[i], scores.get(r.id) ?? null, promptId, r.id)));
  invalidateShares(promptId);
  return { classified: scores.size };
}
