import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiRequestError } from './client';

vi.mock('../auth/session', () => ({ getIdToken: async () => 'token' }));

function stubFetch(body: string | null, status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body, { status })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('resolves for a success status that carries no body', async () => {
    // POST /v1/push/test answers 202 with nothing in it (docs/API.md).
    stubFetch(null, 202);
    await expect(apiFetch<void>('/push/test', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('resolves for a 204', async () => {
    stubFetch(null, 204);
    await expect(apiFetch<void>('/push/subscriptions', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('parses a JSON body', async () => {
    stubFetch(JSON.stringify({ publicKey: 'abc' }), 200);
    await expect(apiFetch<{ publicKey: string }>('/push/vapid-public-key')).resolves.toEqual({ publicKey: 'abc' });
  });

  it('maps the ApiError envelope', async () => {
    stubFetch(JSON.stringify({ error: { code: 'BAD_REQUEST', message: 'nope', requestId: 'req-1' } }), 400);
    await expect(apiFetch('/checks', { method: 'POST' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      requestId: 'req-1',
    });
  });

  it('falls back to a generic error when the failure body is not JSON', async () => {
    stubFetch('<html>gateway timeout</html>', 504);
    await expect(apiFetch('/checks', { method: 'POST' })).rejects.toBeInstanceOf(ApiRequestError);
  });
});
