import type {
  CatalogRow, EntityType, FinishResponse, GuessRequest, GuessResponse, StartQuestionResponse, TodayResponse,
} from '@blockbust/shared';

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body === undefined ? undefined : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

export const api = {
  today: (date?: string) => call<TodayResponse>(`/api/today${date ? `?date=${date}` : ''}`),
  session: () => call<{ sessionId: string }>('/api/session', {}),
  catalog: (type: EntityType) => call<{ rows: CatalogRow[]; complete: boolean }>(`/api/catalog/${type}`),
  suggest: (type: EntityType, q: string) => call<CatalogRow[]>(`/api/suggest?type=${type}&q=${encodeURIComponent(q)}`),
  start: (sessionId: string, date: string, index: number) => call<StartQuestionResponse>('/api/question/start', { sessionId, date, index }),
  guess: (req: GuessRequest) => call<GuessResponse>('/api/guess', req),
  finish: (sessionId: string, date: string) => call<FinishResponse>('/api/finish', { sessionId, date }),
};
