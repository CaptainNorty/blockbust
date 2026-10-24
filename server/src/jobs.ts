// Long-running admin work (TMDB syncs, Jev labeling, puzzle rebuilds) runs here as jobs, one at a
// time, so the admin page can start them, watch progress and logs, and cancel them.
import { db } from './db.ts';

db.exec(`
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  params TEXT NOT NULL,
  status TEXT NOT NULL,            -- queued | running | done | failed | cancelled | interrupted
  done INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  step TEXT,
  summary TEXT,
  log TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT
);
`);

/** Called once by the server at startup: jobs die with the process, so anything still active never finished. */
export function initJobs() {
  db.exec("UPDATE jobs SET status = 'interrupted', finished_at = datetime('now') WHERE status IN ('queued', 'running')");
}

export class Cancelled extends Error {
  constructor() {
    super('Cancelled');
  }
}

export interface JobCtx {
  log(line: string): void;
  /** Progress through the current step, e.g. progress(120, 6000, 'Fetching movie details'). */
  progress(done: number, total: number, step?: string): void;
  /** Throws Cancelled if the job was cancelled; call it inside loops. */
  check(): void;
  readonly cancelled: boolean;
}

export interface JobDef {
  title: string;
  run(params: Record<string, unknown>, ctx: JobCtx): Promise<string | void>;
}

const defs = new Map<string, JobDef>();
export const defineJob = (kind: string, def: JobDef) => defs.set(kind, def);
export const jobKinds = () => [...defs.entries()].map(([kind, d]) => ({ kind, title: d.title }));

interface Live {
  id: number;
  lines: string[];
  done: number;
  total: number;
  step: string;
  cancelled: boolean;
  dirty: boolean;
}

const MAX_LINES = 2000;
let live: Live | undefined;
const queue: number[] = [];

const save = db.prepare('UPDATE jobs SET done = ?, total = ?, step = ?, log = ? WHERE id = ?');
function flush() {
  if (!live?.dirty) return;
  save.run(live.done, live.total, live.step, live.lines.join('\n'), live.id);
  live.dirty = false;
}
setInterval(flush, 500).unref();

export function enqueue(kind: string, params: Record<string, unknown> = {}): number {
  if (!defs.has(kind)) throw new Error(`Unknown job: ${kind}`);
  const info = db.prepare("INSERT INTO jobs (kind, params, status, created_at) VALUES (?, ?, 'queued', datetime('now'))").run(kind, JSON.stringify(params));
  const id = Number(info.lastInsertRowid);
  queue.push(id);
  void pump();
  return id;
}

export function cancel(id: number) {
  if (live?.id === id) live.cancelled = true;
  const i = queue.indexOf(id);
  if (i >= 0) {
    queue.splice(i, 1);
    db.prepare("UPDATE jobs SET status = 'cancelled', finished_at = datetime('now') WHERE id = ?").run(id);
  }
}

async function pump() {
  if (live || !queue.length) return;
  const id = queue.shift()!;
  const row = db.prepare('SELECT kind, params FROM jobs WHERE id = ?').get(id) as { kind: string; params: string };
  const def = defs.get(row.kind)!;
  const job: Live = { id, lines: [], done: 0, total: 0, step: '', cancelled: false, dirty: true };
  live = job;
  db.prepare("UPDATE jobs SET status = 'running', started_at = datetime('now') WHERE id = ?").run(id);
  const stamp = () => new Date().toTimeString().slice(0, 8);
  const ctx: JobCtx = {
    log(line) {
      job.lines.push(`${stamp()}  ${line}`);
      if (job.lines.length > MAX_LINES) job.lines.splice(0, job.lines.length - MAX_LINES);
      job.dirty = true;
      console.log(`[job ${id}] ${line}`);
    },
    progress(done, total, step) {
      job.done = done;
      job.total = total;
      if (step !== undefined && step !== job.step) {
        job.step = step;
        ctx.log(step);
      }
      job.dirty = true;
    },
    check() {
      if (job.cancelled) throw new Cancelled();
    },
    get cancelled() {
      return job.cancelled;
    },
  };
  let status = 'done';
  let summary = '';
  try {
    summary = (await def.run(JSON.parse(row.params), ctx)) ?? '';
    if (summary) ctx.log(summary);
  } catch (e) {
    status = e instanceof Cancelled ? 'cancelled' : 'failed';
    summary = (e as Error).message;
    ctx.log(status === 'cancelled' ? 'Cancelled.' : `Failed: ${summary}`);
  }
  flush();
  db.prepare("UPDATE jobs SET status = ?, summary = ?, finished_at = datetime('now') WHERE id = ?").run(status, summary, id);
  live = undefined;
  void pump();
}

export function listJobs(limit = 30) {
  flush();
  return db.prepare(`SELECT id, kind, params, status, done, total, step, summary, created_at, started_at, finished_at,
      substr(log, -200) AS tail FROM jobs ORDER BY id DESC LIMIT ?`).all(limit).map((r) => {
    const row = r as Record<string, unknown>;
    return { ...row, params: JSON.parse(row.params as string), tail: String(row.tail ?? '').split('\n').pop() };
  });
}

export function getJob(id: number) {
  flush();
  const r = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return r && { ...r, params: JSON.parse(r.params as string) };
}

/** Console version of a job context, for the npm scripts. */
export function consoleCtx(): JobCtx {
  let last = 0;
  let lastStep = '';
  return {
    log: (l) => console.log(l),
    progress(done, total, step) {
      if (step && step !== lastStep) console.log((lastStep = step));
      if (Date.now() - last > 3000 || done === total) {
        last = Date.now();
        console.log(`  ${done}/${total}`);
      }
    },
    check() {},
    cancelled: false,
  };
}
