/**
 * Generic type-ahead engine shared by the "Medicine name" and "Manufacturer" fields
 * (manual entry and confirm-details screens). UI convenience only - it never decides a
 * tier (CLAUDE.md rule 1, packages/matching owns that alone), and nothing here is sent to
 * the server or logged; "recent searches" live only in this browser's localStorage.
 */

const DEFAULT_MAX_RECENT = 20;
const DEFAULT_SUGGESTION_LIMIT = 6;

export interface RecentSearch {
  name: string;
  count: number;
  lastUsedAt: number;
}

export function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Standard edit-distance, used only to tolerate a few typed/typo characters. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const curr: number[] = [i];
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[n]!;
}

/** How many typo'd characters we forgive, scaled to how much the user has typed. */
function typoBudget(queryLength: number): number {
  if (queryLength <= 3) return 1;
  if (queryLength <= 6) return 2;
  return 3;
}

interface Candidate {
  name: string;
  isRecent: boolean;
  count: number;
  lastUsedAt: number;
}

interface ScoredCandidate extends Candidate {
  bucket: number;
  score: number;
}

/**
 * Lower bucket = better match. Within a bucket, lower score = better.
 * Buckets: 0 = starts with the query (or its first word does), 1 = contains the query,
 * 2 = within typo distance of the query.
 */
function scoreCandidate(normQuery: string, candidateName: string): { bucket: number; score: number } | null {
  const normCandidate = normalize(candidateName);
  if (!normQuery || normCandidate === normQuery) return null;

  if (normCandidate.startsWith(normQuery)) {
    return { bucket: 0, score: normCandidate.length - normQuery.length };
  }
  const firstWord = normCandidate.split(' ')[0] ?? normCandidate;
  if (firstWord.startsWith(normQuery)) {
    return { bucket: 0, score: firstWord.length - normQuery.length + 1 };
  }
  if (normCandidate.includes(normQuery)) {
    return { bucket: 1, score: normCandidate.indexOf(normQuery) };
  }

  const budget = typoBudget(normQuery.length);
  const distance = Math.min(
    levenshtein(normQuery, firstWord.slice(0, normQuery.length + budget)),
    levenshtein(normQuery, normCandidate.slice(0, normQuery.length + budget)),
  );
  if (distance <= budget) {
    return { bucket: 2, score: distance };
  }
  return null;
}

/**
 * Ranks suggestions the way a search box does: the user's own frequent/recent searches
 * first, then the seed dictionary, matched by prefix, then substring, then typo-tolerant
 * fuzzy match so a few mistyped letters still surface the right name.
 */
export function rankSuggestions(
  query: string,
  recent: RecentSearch[],
  dictionary: readonly string[],
  limit = DEFAULT_SUGGESTION_LIMIT,
): string[] {
  const trimmed = query.trim();
  const byKey = new Map<string, Candidate>();
  for (const r of recent) {
    byKey.set(normalize(r.name), { name: r.name, isRecent: true, count: r.count, lastUsedAt: r.lastUsedAt });
  }
  for (const name of dictionary) {
    const key = normalize(name);
    if (!byKey.has(key)) byKey.set(key, { name, isRecent: false, count: 0, lastUsedAt: 0 });
  }

  if (!trimmed) {
    return [...byKey.values()]
      .filter((c) => c.isRecent)
      .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
      .slice(0, limit)
      .map((c) => c.name);
  }

  const normQuery = normalize(trimmed);
  const scored: ScoredCandidate[] = [];
  for (const candidate of byKey.values()) {
    const result = scoreCandidate(normQuery, candidate.name);
    if (!result) continue;
    scored.push({ ...candidate, ...result });
  }

  scored.sort((a, b) => {
    if (a.bucket !== b.bucket) return a.bucket - b.bucket;
    if (a.isRecent !== b.isRecent) return a.isRecent ? -1 : 1;
    if (a.score !== b.score) return a.score - b.score;
    return b.count - a.count || b.lastUsedAt - a.lastUsedAt;
  });

  return scored.slice(0, limit).map((c) => c.name);
}

export function readRecentSearches(storageKey: string): RecentSearch[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentSearch =>
        Boolean(item) &&
        typeof (item as RecentSearch).name === 'string' &&
        typeof (item as RecentSearch).count === 'number' &&
        typeof (item as RecentSearch).lastUsedAt === 'number',
    );
  } catch {
    return [];
  }
}

/** Called on submit so next time this device's own frequent/recent names rank first. */
export function recordSearch(storageKey: string, name: string, maxRecent = DEFAULT_MAX_RECENT): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    const existing = readRecentSearches(storageKey);
    const key = normalize(trimmed);
    const idx = existing.findIndex((item) => normalize(item.name) === key);
    const now = Date.now();
    if (idx >= 0) {
      existing[idx] = { name: trimmed, count: existing[idx]!.count + 1, lastUsedAt: now };
    } else {
      existing.push({ name: trimmed, count: 1, lastUsedAt: now });
    }
    existing.sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt);
    window.localStorage.setItem(storageKey, JSON.stringify(existing.slice(0, maxRecent)));
  } catch {
    // localStorage unavailable (private browsing, disabled storage) - suggestions just
    // fall back to the static dictionary for this session.
  }
}
