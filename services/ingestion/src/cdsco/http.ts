const DEFAULT_USER_AGENT = 'AsliHackathonBot/1.0 (+https://github.com/asli-hackathon/asli)';

export interface HttpGetOptions {
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  throttle?: () => Promise<void>;
  userAgent?: string;
  retries?: number;
}

/**
 * GETs a URL politely: throttled (2s min gap, via `throttle`), retried 3x with
 * jittered exponential backoff on failure, identifying User-Agent.
 * T01's spike found the CDSCO endpoint needs no special headers/cookies at all
 * (see plan/tasks/T01-spikes.md Handoff) - the User-Agent is sent purely to be
 * a polite, identifiable client per CLAUDE.md rule 8, not because it's required.
 */
export async function politeGet(url: string, options: HttpGetOptions = {}): Promise<Response> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleepImpl = options.sleepImpl ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const retries = options.retries ?? 3;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoffMs = 500 * 2 ** (attempt - 1);
      const jitterMs = Math.random() * 250;
      await sleepImpl(backoffMs + jitterMs);
    }
    await options.throttle?.();
    try {
      const res = await fetchImpl(url, { headers: { 'User-Agent': userAgent } });
      if (res.ok) return res;
      lastError = new Error(`CDSCO GET ${url} -> HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
