import { MISS_LABEL, tierById, TIERS, type EntityType, type FinishResponse, type StartQuestionResponse, type TodayResponse } from '@blockbust/shared';
import { api } from './api.ts';
import { Autocomplete, type Suggestion } from './autocomplete.ts';
import { CORE_KM, layerAt, minerPortrait, Scene, SKINS } from './scene.ts';
import { isUnlocked, loadStats, localDate, nextSkin, recordDay, setSkinChoice, summarize } from './stats.ts';

/** Every point of score digs this many kilometres. A perfect game (8 x 200) reaches the core. */
const KM_PER_POINT = 4;

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const panel = $('#panel');
const stamp = $('#stamp');
const scene = new Scene($('#scene') as unknown as HTMLCanvasElement);
scene.onDepth = (km, layer) => {
  $('#depthKm').textContent = Math.round(km).toLocaleString();
  $('#layerName').textContent = km < 1 ? 'Surface' : layer;
};

const params = new URLSearchParams(location.search);
/** Only today's live puzzle counts toward streaks; ?date= replays don't. */
const live = !params.has('date');
scene.setSkin(loadStats().skin ?? 'rookie');
// Dev helper: open the console and try blockbustPeek(2000) to look around at 2,000 km.
if ((import.meta as unknown as { env: { DEV: boolean } }).env.DEV) {
  Object.assign(window, {
    blockbustPeek: (km: number) => {
      scene.setDepth(km);
      scene.onDepth?.(km, layerAt(km).name);
    },
  });
}
const catalogs: Partial<Record<EntityType, Autocomplete>> = {};

interface Saved {
  sessionId: string;
  next: number;
  points: number;
  hits: { km: number; color: string }[];
  finished: boolean;
}

let today: TodayResponse;
let saved: Saved;
const storageKey = () => `blockbust:${today.date}`;
const save = () => {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(saved));
  } catch {}
};

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function showStamp(text: string, color: string, sub = '') {
  stamp.innerHTML = `<div class="stamp-main" style="--c:${color}">${esc(text)}</div>${sub ? `<div class="stamp-sub">${esc(sub)}</div>` : ''}`;
  stamp.classList.remove('show');
  void stamp.offsetWidth;
  stamp.classList.add('show');
}

async function boot() {
  today = await api.today(params.get('date') ?? undefined);
  $('#digNo').textContent = `DIG #${today.number}`;
  let existing: Saved | null = null;
  try {
    existing = JSON.parse(localStorage.getItem(storageKey()) ?? 'null');
  } catch {}
  saved = existing ?? { sessionId: (await api.session()).sessionId, next: 0, points: 0, hits: [], finished: false };
  save();
  scene.reset();
  for (const h of saved.hits) scene.addMarker(h.km, h.color);
  scene.setDepth(saved.points * KM_PER_POINT);
  scene.onDepth?.(saved.points * KM_PER_POINT, layerAt(saved.points * KM_PER_POINT).name);
  // Load both catalogs in the background; questions need one or the other.
  for (const t of ['movie', 'person'] as EntityType[]) {
    api.catalog(t).then(({ rows, complete }) => (catalogs[t] = new Autocomplete(rows, complete, (q) => api.suggest(t, q))));
  }
  if (saved.finished) return showResults();
  if (saved.next > 0) return startQuestion(saved.next);
  showIntro();
}

function showIntro() {
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="intro">
      <h1>Dig to the center of the Earth</h1>
      <p>${today.questionCount} prompts · ${today.secondsPerQuestion} seconds each · guess as many times as you like.</p>
      <p>Any valid answer digs. <b>Rarer answers dig deeper.</b></p>
      <ul class="legend">${TIERS.map((t) => `<li><span class="chip" style="--c:${t.color}">${t.name}</span> +${t.points}</li>`).join('')}</ul>
      <button class="btn" id="go">START DIGGING</button>
    </div>`;
  $('#go').onclick = () => startQuestion(0);
  window.onkeydown = (e) => {
    if (e.key === 'Enter') {
      window.onkeydown = null;
      startQuestion(0);
    }
  };
}

async function startQuestion(index: number) {
  window.onkeydown = null;
  if (index >= today.questionCount) return finish();
  saved.next = index;
  save();
  const q = await api.start(saved.sessionId, today.date, index);
  renderQuestion(q);
}

function renderQuestion(q: StartQuestionResponse) {
  const noun = q.answerType === 'movie' ? 'film' : 'person';
  panel.className = 'panel';
  panel.innerHTML = `
    <div class="qhead"><span>${q.index + 1} / ${today.questionCount}</span><span class="cat">${esc(q.category)}</span></div>
    <h2 class="prompt">${esc(q.text)}</h2>
    <div class="fuse"><div class="fuse-fill" id="fuse"></div><span class="secs" id="secs"></span></div>
    <div class="inputwrap">
      <input id="guess" autocomplete="off" spellcheck="false" placeholder="Type a ${noun}…" />
      <ul class="suggest" id="suggest"></ul>
    </div>
    <div class="choices" id="choices"></div>
    <ul class="misses" id="misses"></ul>`;
  const input = $<HTMLInputElement>('#guess');
  const list = $('#suggest');
  const misses = $('#misses');
  const choices = $('#choices');
  input.focus();

  let suggestions: Suggestion[] = [];
  let active = 0;
  let busy = false;
  let done = false;
  const deadline = performance.now() + q.remainingMs;

  const renderSuggest = () => {
    list.innerHTML = suggestions
      .map((s, i) => `<li class="${i === active ? 'active' : ''}" data-i="${i}">${esc(s.label)} <small>${esc(s.detail)}</small></li>`)
      .join('');
  };
  let moreTimer = 0;
  input.oninput = () => {
    const ac = catalogs[q.answerType];
    const typed = input.value;
    suggestions = ac ? ac.search(typed) : [];
    active = suggestions.length ? 0 : -1;
    renderSuggest();
    // Not enough popular matches: ask the server, which knows the whole catalog.
    clearTimeout(moreTimer);
    moreTimer = window.setTimeout(async () => {
      const more = await ac?.more(typed, suggestions);
      if (!more || input.value !== typed) return;
      suggestions = more;
      if (active < 0) active = 0;
      renderSuggest();
    }, 120);
  };
  list.onmousedown = (e) => {
    const li = (e.target as HTMLElement).closest('li');
    if (!li) return;
    e.preventDefault();
    const s = suggestions[Number(li.dataset.i)];
    submit(s.label, s.id);
  };
  input.onkeydown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!suggestions.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
      renderSuggest();
    } else if (e.key === 'Escape') {
      active = -1;
      renderSuggest();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = active >= 0 ? suggestions[active] : undefined;
      if (input.value.trim()) submit(s?.label ?? input.value, s?.id);
    }
  };

  const shakeInput = () => {
    input.classList.remove('shake');
    void input.offsetWidth;
    input.classList.add('shake');
  };
  const addMiss = (text: string, why: string) => {
    misses.insertAdjacentHTML('afterbegin', `<li><s>${esc(text)}</s> <span>${esc(why)}</span></li>`);
  };

  async function submit(text: string, entityId?: number) {
    if (busy || done) return;
    busy = true;
    choices.innerHTML = '';
    try {
      const r = await api.guess({ sessionId: saved.sessionId, date: today.date, index: q.index, text, entityId });
      input.value = '';
      suggestions = [];
      renderSuggest();
      if (r.result === 'hit') {
        done = true;
        const tier = tierById(r.tier);
        saved.points += r.points;
        const km = Math.min(CORE_KM, saved.points * KM_PER_POINT);
        saved.hits.push({ km, color: tier.color });
        saved.next = q.index + 1;
        save();
        scene.digTo(km);
        scene.addMarker(km, tier.color);
        showStamp(tier.name, tier.color, `${r.label} · +${r.points} · ${(r.share * 100).toFixed(1)}% said it`);
        input.disabled = true;
        setTimeout(() => startQuestion(q.index + 1), 2000);
      } else if (r.result === 'miss') {
        shakeInput();
        scene.clank();
        addMiss(r.label ?? text, 'not in the credits');
      } else if (r.result === 'unknown') {
        shakeInput();
        addMiss(text, "never heard of it");
      } else if (r.result === 'repeat') {
        shakeInput();
        addMiss(r.label, 'already tried');
      } else if (r.result === 'ambiguous') {
        choices.innerHTML = `<span>Which one?</span>` + r.candidates
          .map((c, i) => `<button class="btn small" data-id="${c.id}">${i + 1}. ${esc(c.label)} <small>${esc(c.detail)}</small></button>`).join('');
        choices.querySelectorAll('button').forEach((b) => (b.onclick = () => submit(b.textContent ?? '', Number(b.dataset.id))));
        input.onkeydown = ((orig) => (e: KeyboardEvent) => {
          const n = Number(e.key);
          if (n >= 1 && n <= r.candidates.length && !input.value) {
            e.preventDefault();
            submit(r.candidates[n - 1].label, r.candidates[n - 1].id);
            input.onkeydown = orig;
            return;
          }
          orig?.call(input, e);
        })(input.onkeydown);
      } else if (r.result === 'expired') {
        timeUp();
      }
    } finally {
      busy = false;
      if (!done) input.focus();
    }
  }

  const fuse = $('#fuse');
  const secs = $('#secs');
  const tick = () => {
    if (done) return;
    const left = Math.max(0, deadline - performance.now());
    fuse.style.width = `${(left / (q.seconds * 1000)) * 100}%`;
    fuse.classList.toggle('low', left < 4000);
    secs.textContent = String(Math.ceil(left / 1000));
    if (left <= 0) return timeUp();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  function timeUp() {
    if (done) return;
    done = true;
    input.disabled = true;
    scene.clank();
    showStamp("CUT! Time's up", '#e5e5e5', MISS_LABEL);
    saved.next = q.index + 1;
    save();
    setTimeout(() => startQuestion(q.index + 1), 1800);
  }
}

async function finish() {
  saved.finished = true;
  save();
  showResults();
}

async function showResults() {
  const r: FinishResponse = await api.finish(saved.sessionId, today.date);
  const km = Math.min(CORE_KM, r.score * KM_PER_POINT);
  const reached = km >= CORE_KM ? 'the Center of the Earth' : `the ${layerAt(km).name}`;
  const emoji = r.questions.map((q) => (q.hit ? tierById(q.hit.tier).emoji : '⬛')).join('');
  const pct = r.percentile == null ? 'First digger today' : `Deeper than ${Math.round(r.percentile * 100)}% of today's diggers`;
  const maxCount = Math.max(...r.histogram.map((h) => h.count));
  if (live) recordDay(today.date, r.score, km);
  const shareText = `BLOCKBUST #${r.number} ⛏️ ${km.toLocaleString()} km\n${emoji}\nReached ${reached}\n${location.origin}`;

  panel.className = 'panel results';
  panel.innerHTML = `<div class="inner">
    <div class="card">
      <div class="card-top">
        <div>
          <div class="label">DEPTH</div>
          <div class="big">${km.toLocaleString()}<small> km</small></div>
          <div class="reached">Reached ${esc(reached)}</div>
          <div class="pct">${esc(pct)}</div>
        </div>
        ${r.players > 1 ? `<div class="hist">${r.histogram.map((h) => `<div class="bar ${h.bucket === Math.floor(r.score / 100) * 100 ? 'you' : ''}" style="height:${(h.count / maxCount) * 100}%" title="${h.bucket}–${h.bucket + 99} pts: ${h.count}"></div>`).join('')}</div>` : ''}
      </div>
      <div class="emoji">${emoji}</div>
      <div class="actions">
        <button class="btn" id="share">COPY RESULT</button>
        <button class="btn ghost" id="again">DIG AGAIN</button>
      </div>
    </div>
    <h3 class="section">THE DIG LOG</h3>
    <ol class="log">${r.questions.map((q) => {
      const t = q.hit ? tierById(q.hit.tier) : null;
      return `<li>
        <div class="log-head">
          <span class="chip" style="--c:${t?.color ?? '#555'}">${t?.name ?? 'Miss'}</span>
          <span class="log-q">${esc(q.text)}</span>
        </div>
        <div class="log-a">${q.hit ? `“${esc(q.hit.label)}” <b>+${q.hit.points}</b> · ${(q.hit.share * 100).toFixed(1)}% said it` : 'No answer'}${q.guesses > 1 ? ` · ${q.guesses} guesses` : ''}</div>
        <details><summary>Show answers (${q.answerCount})</summary>
          <ul class="answers">${q.topAnswers.map((a) => `<li><span class="dot" style="--c:${tierById(a.tier).color}"></span>${esc(a.label)} <small>${(a.share * 100).toFixed(1)}%</small></li>`).join('')}</ul>
        </details>
      </li>`;
    }).join('')}</ol>
    <div id="stats"></div></div>`;
  renderStats();

  $('#share').onclick = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      $('#share').textContent = 'COPIED!';
    } catch {
      prompt('Copy your result', shareText);
    }
  };
  // Local testing: start over with a fresh player.
  $('#again').onclick = () => {
    try {
      localStorage.removeItem(storageKey());
    } catch {}
    location.reload();
  };
}

function renderStats() {
  const stats = loadStats();
  const sum = summarize(stats, live ? today.date : localDate());
  const equipped = stats.skin ?? 'rookie';
  const next = nextSkin(sum);
  const need = next ? next.streak - sum.current : 0;
  const tile = (value: string, label: string) => `<div class="stat"><div class="stat-v">${value}</div><div class="stat-l">${label}</div></div>`;
  $('#stats').innerHTML = `
    <h3 class="section">YOUR STATS <small>on this device</small></h3>
    <div class="stats">
      ${tile(`${sum.current}`, 'Current streak')}
      ${tile(`${sum.best}`, 'Best streak')}
      ${tile(`${sum.played}`, 'Daily digs')}
      ${tile(`${sum.bestKm.toLocaleString()}<small> km</small>`, 'Deepest dig')}
      ${tile(`${sum.avgKm.toLocaleString()}<small> km</small>`, 'Average dig')}
    </div>
    ${live ? '' : `<p class="hint">Replays of other days don't count toward your stats.</p>`}
    <h3 class="section">MINERS EARNED <small>${SKINS.filter((k) => isUnlocked(k, sum)).length} / ${SKINS.length}</small></h3>
    <p class="hint">${next ? `Dig every day to earn new miners. <b>${esc(next.name)}</b> unlocks with a ${next.streak}-day streak${need > 0 && sum.current > 0 ? ` (${need} more day${need === 1 ? '' : 's'})` : ''}.` : 'You have every miner. Legendary.'}</p>
    <div class="skins">${SKINS.map((k) => {
      const open = isUnlocked(k, sum);
      return `<button class="skin ${open ? '' : 'locked'} ${k.id === equipped ? 'on' : ''}" data-id="${k.id}" ${open ? '' : 'disabled'}>
        <img src="${minerPortrait(k, !open)}" alt="" />
        <span class="skin-name">${open ? esc(k.name) : '???'}</span>
        <span class="skin-req">${k.id === equipped ? 'Equipped' : open ? 'Tap to equip' : `${k.streak}-day streak`}</span>
      </button>`;
    }).join('')}</div>`;
  $('#stats').querySelectorAll<HTMLButtonElement>('.skin:not(.locked)').forEach((b) => (b.onclick = () => {
    setSkinChoice(b.dataset.id!);
    scene.setSkin(b.dataset.id!);
    renderStats();
  }));
}

boot().catch((e) => {
  panel.innerHTML = `<div class="error">Couldn't reach the game server: ${esc((e as Error).message)}.<br/>Is <code>npm run dev</code> running?</div>`;
});
