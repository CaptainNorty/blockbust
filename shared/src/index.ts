export type EntityType = 'movie' | 'person';

export type TierId = 'blockbuster' | 'crowd_pleaser' | 'hidden_gem' | 'cult_classic' | 'lost_reel';

export interface Tier {
  id: TierId;
  name: string;
  /** Answers whose share of players is at or above this value land in this tier. */
  minShare: number;
  points: number;
  color: string;
  emoji: string;
}

/** Ordered most common to most rare. */
export const TIERS: Tier[] = [
  { id: 'blockbuster', name: 'Blockbuster', minShare: 0.25, points: 10, color: '#c9b79c', emoji: '🟫' },
  { id: 'crowd_pleaser', name: 'Crowd Pleaser', minShare: 0.1, points: 25, color: '#7fc8a9', emoji: '🟩' },
  { id: 'hidden_gem', name: 'Hidden Gem', minShare: 0.03, points: 50, color: '#5aa9e6', emoji: '🟦' },
  { id: 'cult_classic', name: 'Cult Classic', minShare: 0.005, points: 100, color: '#b388eb', emoji: '🟪' },
  { id: 'lost_reel', name: 'Lost Reel', minShare: 0, points: 200, color: '#ff6b35', emoji: '🟧' },
];

export const MISS_LABEL = 'Cutting Room Floor';

export function tierForShare(share: number): Tier {
  return TIERS.find((t) => share >= t.minShare) ?? TIERS[TIERS.length - 1];
}

export function tierById(id: TierId): Tier {
  return TIERS.find((t) => t.id === id)!;
}

export interface TodayResponse {
  date: string;
  number: number;
  questionCount: number;
  secondsPerQuestion: number;
}

export interface SessionResponse {
  sessionId: string;
}

export interface StartQuestionRequest {
  sessionId: string;
  date: string;
  index: number;
}

export interface StartQuestionResponse {
  index: number;
  text: string;
  category: string;
  answerType: EntityType;
  seconds: number;
  /** Server time remaining, in ms, in case the question was already started. */
  remainingMs: number;
}

export interface GuessRequest {
  sessionId: string;
  date: string;
  index: number;
  /** Set when the player picked from autocomplete. */
  entityId?: number;
  text: string;
}

export interface Candidate {
  id: number;
  label: string;
  detail: string;
}

export type GuessResponse =
  | { result: 'hit'; label: string; tier: TierId; share: number; points: number }
  | { result: 'miss'; label: string | null }
  | { result: 'repeat'; label: string }
  | { result: 'ambiguous'; candidates: Candidate[] }
  | { result: 'unknown' }
  | { result: 'expired' };

export interface FinishRequest {
  sessionId: string;
  date: string;
}

export interface QuestionSummary {
  index: number;
  text: string;
  hit: { label: string; tier: TierId; points: number; share: number } | null;
  guesses: number;
  topAnswers: { label: string; share: number; tier: TierId }[];
  answerCount: number;
}

export interface FinishResponse {
  date: string;
  number: number;
  score: number;
  /** Fraction of today's finished players with a lower score. Null if nobody else has played. */
  percentile: number | null;
  players: number;
  histogram: { bucket: number; count: number }[];
  questions: QuestionSummary[];
}

/** Compact autocomplete rows: [id, label, detail, popularity]. */
export type CatalogRow = [number, string, string, number];

export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/^(the|a|an) /, '')
    .replace(/\b(viii|vii|vi|iv|v|iii|ii)\b/g, (m) => String(ROMAN[m]))
    .replace(/\bpart\b|\bpt\b|\bchapter\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ROMAN: Record<string, number> = { ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };
