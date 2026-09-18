import type { ApiError } from '@asli/contracts';
import { getIdToken } from './auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiRequestError extends Error {
  readonly code: ApiError['error']['code'];
  readonly status: number;

  constructor(status: number, error: ApiError['error']) {
    super(error.message);
    this.code = error.code;
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getIdToken();
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = (await res.json().catch(() => null)) as unknown;

  if (!res.ok) {
    const apiError = (body as ApiError | null)?.error;
    throw new ApiRequestError(
      res.status,
      apiError ?? { code: 'INTERNAL', message: 'Something went wrong. Please try again.', requestId: '' },
    );
  }

  return body as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data === undefined ? undefined : JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
