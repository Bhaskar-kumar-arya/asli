import type { ApiError } from '@asli/contracts';
import { getIdToken } from '../auth/session';

const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/v1';

export class ApiRequestError extends Error {
  code: ApiError['error']['code'];
  requestId: string;

  constructor(body: ApiError) {
    super(body.error.message);
    this.code = body.error.code;
    this.requestId = body.error.requestId;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Some routes answer with a bare status and no body (docs/API.md: POST
 * /v1/push/test is a 202, DELETE /v1/push/subscriptions a 204), and a failing
 * gateway can answer with something that is not JSON at all. res.json() throws
 * in both cases, so treat an unparseable body as no body and let the status
 * decide the outcome.
 */
async function readBody(res: Response): Promise<unknown> {
  try {
    return (await res.json()) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Thin typed fetch wrapper: attaches the Cognito JWT, maps the ApiError
 * envelope (docs/API.md) to ApiRequestError. Callers parse the JSON body
 * with the relevant Zod schema from @asli/contracts.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getIdToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const json = await readBody(res);

  if (!res.ok) {
    if (json && typeof json === 'object' && 'error' in json) {
      throw new ApiRequestError(json as ApiError);
    }
    throw new ApiRequestError({
      error: { code: 'INTERNAL', message: `Request failed with ${res.status}`, requestId: 'unknown' },
    });
  }

  return json as T;
}
