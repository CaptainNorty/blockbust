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
  $('catalogCard').innerHTML = `<h2>Catalog</h2>
    <b>${c.movies.toLocaleString()}</b> films · <b>${c.people.toLocaleString()}</b> people · ${c.imdbRated.toLocaleString()} with IMDb ratings
    <div class="note" style="margin-top:6px">${stats.dataSource === 'demo' ? 'Still the built-in demo set: run a sync to replace it.' : `Last sync ${stats.lastSync?.slice(0, 16).replace('T', ' ') ?? 'never'}`}<br/>
    TMDB key: ${stats.tmdb ? '✅ found in .env' : '❌ missing (add TMDB_API_KEY to .env, restart npm run dev)'} · Jev: ${stats.jev ? '✅ ready' : '❌ add TYPESAFE_API_KEY'}</div>`;
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
    ? rows.map((r) => `<div><b>${esc(r.raw)}</b> <span class="note">for “${esc(r.prompt)}”</span> <a href="#data" data-find="${esc(r.raw)}" data-type="${r.type}">find on TMDB</a></div>`).join('')
    : '<div class="note">None yet.</div>';
  document.querySelectorAll<HTMLAnchorElement>('[data-find]').forEach((a) => (a.onclick = () => {
    ($('tType') as HTMLSelectElement).value = a.dataset.type!;
    ($('tQuery') as HTMLInputElement).value = a.dataset.find!;
    setTimeout(searchTmdb, 0);
  }));
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

// ---------- tabs ----------

function showTab() {
  const data = location.hash === '#data';
  $('jobsTab').hidden = !data;
  $('puzzlesTab').hidden = data;
  $('navData').classList.toggle('on', data);
  $('navPuzzles').classList.toggle('on', !data);
  if (data) loadJobs();
}
window.addEventListener('hashchange', showTab);

// ---------- jobs ----------

interface Job {
  id: number;
  kind: string;
  params: Record<string, unknown>;
  status: string;
  done: number;
  total: number;
  step: string | null;
  summary: string | null;
  tail?: string;
  log?: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

const val = (id: string) => ($(id) as HTMLInputElement).value;
const checked = (id: string) => ($(id) as HTMLInputElement).checked;
let titles: Record<string, string> = {};
const open = new Set<number>();
let pollTimer = 0;

const since = (a: string, b?: string | null) => {
  const ms = (b ? Date.parse(`${b}Z`) : Date.now()) - Date.parse(`${a}Z`);
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
};

function describe(j: Job) {
  const p = j.params;
  switch (j.kind) {
    case 'tmdb-sync': return `${Number(p.movies).toLocaleString()} films${p.refresh ? ', re-fetch' : ''}`;
    case 'tmdb-add-movies': return `${(p.ids as number[]).length} film(s)`;
    case 'tmdb-add-person': return String(p.name ?? `person ${p.personId}`);
    case 'rebuild-puzzles': case 'jev-label': return `${p.days} days from ${p.from}`;
    default: return '';
  }
}

async function loadJobs() {
  clearTimeout(pollTimer);
  const { kinds, jobs } = await get<{ kinds: { kind: string; title: string }[]; jobs: Job[] }>('/api/admin/jobs');
  titles = Object.fromEntries(kinds.map((k) => [k.kind, k.title]));
  const details = await Promise.all(jobs.filter((j) => open.has(j.id)).map((j) => get<Job>(`/api/admin/jobs/${j.id}`)));
  const logs = new Map(details.map((d) => [d.id, d.log ?? '']));
  const scrolls = new Map([...document.querySelectorAll<HTMLElement>('#jobs pre')].map((pre) => [Number(pre.dataset.id), pre.scrollHeight - pre.scrollTop - pre.clientHeight < 20]));
  $('jobs').innerHTML = jobs.length ? jobs.map((j) => {
    const active = j.status === 'running' || j.status === 'queued';
    const pct = j.total ? Math.round((j.done / j.total) * 100) : 0;
    return `<div class="job">
      <div class="job-head" data-toggle="${j.id}">
        <span class="status ${j.status}">${j.status}</span>
        <b>${esc(titles[j.kind] ?? j.kind)} <span class="note">${esc(describe(j))}</span></b>
        <span class="note">${j.started_at ? since(j.started_at, j.finished_at) : ''}</span>
        ${active ? `<button data-cancel="${j.id}">Cancel</button>` : ''}
      </div>
      ${j.status === 'running' ? `<div class="bar"><div style="width:${pct}%"></div></div>
        <div class="line">${esc(j.step ?? '')} ${j.total ? `· ${j.done.toLocaleString()} / ${j.total.toLocaleString()} (${pct}%)` : ''}</div>` : ''}
      <div class="line">${esc(active ? j.tail ?? '' : j.summary ?? '')}</div>
      ${open.has(j.id) ? `<pre data-id="${j.id}">${esc(logs.get(j.id) ?? '')}</pre>` : ''}
    </div>`;
  }).join('') : '<p class="note">No jobs yet. Start one on the left.</p>';
  document.querySelectorAll<HTMLElement>('#jobs pre').forEach((pre) => {
    if (scrolls.get(Number(pre.dataset.id)) ?? true) pre.scrollTop = pre.scrollHeight;
  });
  document.querySelectorAll<HTMLElement>('[data-toggle]').forEach((h) => (h.onclick = (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const id = Number(h.dataset.toggle);
    if (!open.delete(id)) open.add(id);
    loadJobs();
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-cancel]').forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    await post(`/api/admin/jobs/${b.dataset.cancel}/cancel`, {});
    loadJobs();
  }));
  const busy = jobs.some((j) => j.status === 'running' || j.status === 'queued');
  // A job just finished: the catalog or puzzles may have changed.
  if (wasBusy && !busy) {
    await loadStats();
    loadPuzzle();
  }
  wasBusy = busy;
  if (location.hash === '#data') pollTimer = window.setTimeout(loadJobs, busy ? 1000 : 5000);
}
let wasBusy = false;

async function startJob(kind: string, params: Record<string, unknown>) {
  try {
    const { id } = await post<{ id: number }>('/api/admin/jobs', { kind, params });
    open.add(id);
    location.hash = '#data';
    toast(`Started: ${titles[kind] ?? kind}`);
    loadJobs();
  } catch (e) {
    toast((e as Error).message);
  }
}

const syncEta = () => {
  const n = Number(val('syncMovies'));
  const mins = Math.ceil(n / 40 / 60);
  $('syncEta').textContent = `Roughly ${mins} minute${mins === 1 ? '' : 's'} the first time (TMDB allows ~40 requests a second).`;
};
$('syncMovies').oninput = syncEta;
$('syncGo').onclick = () => startJob('tmdb-sync', { movies: Number(val('syncMovies')), minVotes: Number(val('syncMinVotes')), refresh: checked('syncRefresh'), imdb: checked('syncImdb') });
$('imdbGo').onclick = () => startJob('imdb-ratings', {});
$('pGo').onclick = () => startJob('rebuild-puzzles', { from: val('pFrom'), days: Number(val('pDays')), includePlayed: checked('pPlayed') });
$('jGo').onclick = () => startJob('jev-label', { from: val('jFrom'), days: Number(val('jDays')), onlyNew: checked('jNew') });

$('tType').onchange = () => ($('tVotesRow').hidden = val('tType') !== 'person');
async function searchTmdb() {
  const type = val('tType');
  $('tVotesRow').hidden = type !== 'person';
  const q = val('tQuery').trim();
  if (!q) return;
  $('tResults').innerHTML = '<div class="note">Searching…</div>';
  try {
    const rows = await get<{ id: number; label: string; detail: string; inCatalog: boolean; error?: string }[] | { error: string }>(`/api/admin/tmdb/search?type=${type}&q=${encodeURIComponent(q)}`);
    if (!Array.isArray(rows)) throw new Error(rows.error);
    $('tResults').innerHTML = rows.length ? rows.map((r) => `<div>
      <span>${esc(r.label)}<small>${esc(r.detail)}</small></span>
      ${type === 'movie' && r.inCatalog ? '<span class="badge">in catalog</span>' : ''}
      <button data-add="${r.id}" data-name="${esc(r.label)}">${type === 'movie' ? (r.inCatalog ? 'Re-fetch' : 'Add') : 'Add films'}</button>
    </div>`).join('') : '<div class="note">Nothing on TMDB by that name.</div>';
    document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach((b) => (b.onclick = () => {
      b.disabled = true;
      if (type === 'movie') startJob('tmdb-add-movies', { ids: [Number(b.dataset.add)] });
      else startJob('tmdb-add-person', { personId: Number(b.dataset.add), name: b.dataset.name, minVotes: Number(val('tVotes')) });
    }));
  } catch (e) {
    $('tResults').innerHTML = `<div class="note">${esc((e as Error).message)}</div>`;
  }
}
$('tGo').onclick = searchTmdb;
$('tQuery').onkeydown = (e) => {
  if (e.key === 'Enter') searchTmdb();
};

loadStats().then(() => {
  for (const id of ['pFrom', 'jFrom']) ($(id) as HTMLInputElement).value = stats.today;
  syncEta();
  showTab();
  return Promise.all([loadPuzzle(), loadUnknown()]);
});
