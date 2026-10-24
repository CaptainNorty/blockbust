const BASE = process.env.TMDB_API_BASE ?? 'https://api.themoviedb.org/3';

function authFor(key: string): { headers: Record<string, string>; query: string } {
  // The long "API Read Access Token" is a JWT and goes in a header; the short "API Key" goes in the query string.
  if (key.startsWith('eyJ')) return { headers: { Authorization: `Bearer ${key}` }, query: '' };
  return { headers: {}, query: `api_key=${encodeURIComponent(key)}` };
}

export function tmdbClient(key: string) {
  const auth = authFor(key);
  return async function get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const url = `${BASE}${path}?${[auth.query, qs.toString()].filter(Boolean).join('&')}`;
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, { headers: { accept: 'application/json', ...auth.headers } });
      if (res.ok) return (await res.json()) as T;
      if ((res.status === 429 || res.status >= 500) && attempt < 5) {
        const wait = Number(res.headers.get('retry-after') ?? 0) * 1000 || 500 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (res.status === 401) throw new Error('TMDB rejected the key (401). Check TMDB_API_KEY in .env.');
      throw new Error(`TMDB ${res.status} for ${path}`);
    }
  };
}

export interface DiscoverPage {
  page: number;
  total_pages: number;
  total_results: number;
  results: { id: number; title: string; release_date?: string; vote_count: number; popularity: number }[];
}

export interface PersonSearchPage {
  results: { id: number; name: string; known_for_department: string; popularity: number; known_for?: { title?: string; name?: string }[] }[];
}

export interface PersonCredits {
  cast: { id: number; title: string; release_date?: string; vote_count: number; order?: number }[];
  crew: { id: number; title: string; release_date?: string; vote_count: number; job: string }[];
}

export interface MovieDetail {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  popularity: number;
  vote_count: number;
  vote_average: number;
  imdb_id: string | null;
  genres: { name: string }[];
  production_companies: { name: string }[];
  belongs_to_collection: { id: number; name: string } | null;
  credits: {
    cast: { id: number; name: string; popularity: number; known_for_department: string; order: number; character: string }[];
    crew: { id: number; name: string; popularity: number; known_for_department: string; job: string }[];
  };
  alternative_titles?: { titles: { title: string; iso_3166_1: string }[] };
}
