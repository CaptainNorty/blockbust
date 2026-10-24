import { TIERS } from '@blockbust/shared';

const $ = (id: string) => document.getElementById(id)!;
const get = async <T>(p: string) => (await fetch(p)).json() as Promise<T>;
const post = async <T>(p: string, body: unknown) => {
  const res = await fetch(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json as T;
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const toast = (msg: string) => {
  const t = $('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => (t.style.display = 'none'), 3000);
};
const tierColor = (name: string) => TIERS.find((t) => t.name === name)?.color ?? '#999';

interface Stats {
  counts: { movies: number; people: number; credits: number; imdbRated: number };
  days: { date: string; number: number; players: number }[];
  today: string;
  lastSync: string | null;
  dataSource: string;
  jev: boolean;
  tmdb: boolean;
  categories: string[];
}

interface AdminPrompt {
  id: number;
  idx: number;
  text: string;
  category: string;
  answer_type: string;
  players: number;
  answers: { id: number; label: string; share: number; prior: number; jev: number | null; hits: number; tier: string }[];
}

let stats: Stats;
let date = new URLSearchParams(location.search).get('date') ?? '';

async function loadStats() {
  stats = await get<Stats>('/api/admin/stats');
  date ||= stats.today;
  const c = stats.counts;
  $('source').textContent = stats.dataSource === 'demo' ? 'Demo data (run npm run sync for the real catalog)' : `Synced ${stats.lastSync?.slice(0, 10) ?? 'never'}`;
  $('stats').innerHTML = `<h2>Catalog</h2>
    ${c.movies.toLocaleString()} films<br/>${c.people.toLocaleString()} people<br/>${c.credits.toLocaleString()} credits<br/>${c.imdbRated.toLocaleString()} with IMDb ratings
    <div class="note" style="margin-top:6px">TMDB key: ${stats.tmdb ? 'set' : 'missing'} · Jev: ${stats.jev ? 'ready' : 'set TYPESAFE_API_KEY'}</div>`;
  $('days').innerHTML = stats.days
    .map((d) => `<a href="?date=${d.date}" class="${d.date === date ? 'on' : ''}"><span>#${d.number} · ${d.date}${d.date === stats.today ? ' (today)' : ''}</span><span>${d.players} 👤</span></a>`)
    .join('');
}

async function loadPuzzle() {
  $('dayTitle').textContent = `Puzzle for ${date}`;
  ($('playLink') as HTMLAnchorElement).href = `/?date=${date}`;
  const prompts = await get<AdminPrompt[]>(`/api/admin/puzzle?date=${date}`);
  if (!prompts.length) {
    $('prompts').innerHTML = '<p>No puzzle for this day yet. Use "Build next 7 days" or "Rebuild this day".</p>';
    return;
  }
  const catOptions = ['<option value="">same type</option>', ...stats.categories.map((c) => `<option>${c}</option>`)].join('');
  $('prompts').innerHTML = prompts.map((p) => `
    <div class="prompt">
      <header>
        <h3>${p.idx + 1}. ${esc(p.text)}</h3>
        <span class="meta">${p.category} · ${p.answers.length} answers · ${p.players} hits</span>
        <select data-cat="${p.idx}">${catOptions}</select>
        <button data-swap="${p.idx}">Swap</button>
        <button data-jev="${p.id}" ${stats.jev ? '' : 'disabled title="Set TYPESAFE_API_KEY in .env"'}>Classify with Jev</button>
      </header>
      <div class="scroll"><table>
        <tr><th>Answer</th><th>Tier now</th><th class="num">Share</th><th class="num">Starting guess</th><th class="num">Jev (0–4)</th><th class="num">Hits</th></tr>
        ${p.answers.map((a) => `<tr>
          <td>${esc(a.label)}</td>
          <td class="tier" style="color:${tierColor(a.tier)}">${a.tier}</td>
          <td class="num">${(a.share * 100).toFixed(1)}%</td>
          <td class="num">${(a.prior * 100).toFixed(1)}%</td>
          <td class="num">${a.jev == null ? '' : a.jev.toFixed(2)}</td>
          <td class="num">${a.hits || ''}</td>
        </tr>`).join('')}
      </table></div>
    </div>`).join('');

  document.querySelectorAll<HTMLButtonElement>('[data-swap]').forEach((b) => (b.onclick = async () => {
    const idx = Number(b.dataset.swap);
    const cat = (document.querySelector(`[data-cat="${idx}"]`) as HTMLSelectElement).value;
    b.disabled = true;
    try {
      await post('/api/admin/swap', { date, idx, category: cat });
      await loadPuzzle();
    } catch (e) {
      toast((e as Error).message);
      b.disabled = false;
    }
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-jev]').forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    b.textContent = 'Asking Jev…';
    try {
      const r = await post<{ classified: number }>('/api/admin/jev', { promptId: Number(b.dataset.jev) });
      toast(`Jev scored ${r.classified} answers`);
      await loadPuzzle();
    } catch (e) {
      toast((e as Error).message);
      b.disabled = false;
      b.textContent = 'Classify with Jev';
    }
  }));
}

async function loadUnknown() {
  const rows = await get<{ raw: string; prompt: string; type: string }[]>('/api/admin/unknown-guesses');
  $('unknown').innerHTML = rows.length
    ? rows.map((r) => `<div><b>${esc(r.raw)}</b> <span class="note">for “${esc(r.prompt)}”</span></div>`).join('')
    : '<div class="note">None yet.</div>';
}

$('gen').onclick = async () => {
  const r = await post<{ built: string[] }>('/api/admin/generate', { days: 7 });
  toast(r.built.length ? `Built ${r.built.length} days` : 'Next 7 days already exist');
  await loadStats();
};
$('rebuild').onclick = async () => {
  if (!confirm(`Replace every question for ${date}? Plays on that day are lost.`)) return;
  await post('/api/admin/generate', { date });
  await loadStats();
  await loadPuzzle();
};
$('reset').onclick = async () => {
  await post('/api/admin/reset-plays', { date });
  toast('Cleared plays. Starting guesses are back in charge.');
  await loadStats();
  await loadPuzzle();
};

let searchTimer = 0;
$('aSearch').oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = window.setTimeout(async () => {
    const type = ($('aType') as HTMLSelectElement).value;
    const q = ($('aSearch') as HTMLInputElement).value;
    const rows = await get<[number, string, string][]>(`/api/admin/search?type=${type}&q=${encodeURIComponent(q)}`);
    $('aPick').innerHTML = rows.map(([id, label, detail]) => `<option value="${id}">${esc(label)} (${esc(String(detail))})</option>`).join('');
  }, 200);
};
$('aAdd').onclick = async () => {
  const entityId = Number(($('aPick') as HTMLSelectElement).value);
  const alias = ($('aAlias') as HTMLInputElement).value;
  if (!entityId || !alias) return toast('Pick an entity and type an alias');
  await post('/api/admin/alias', { type: ($('aType') as HTMLSelectElement).value, entityId, alias });
  toast('Alias added');
  ($('aAlias') as HTMLInputElement).value = '';
};

loadStats().then(() => Promise.all([loadPuzzle(), loadUnknown()]));
