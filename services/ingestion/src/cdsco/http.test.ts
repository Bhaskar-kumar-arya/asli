import { describe, expect, it, vi } from 'vitest';
import { politeGet } from './http';

function jsonResponse(status: number, body = '{}'): Response {
  return new Response(body, { status });
}

describe('politeGet', () => {
  it('calls throttle before every attempt, including the first', async () => {
    const throttle = vi.fn().mockResolvedValue(undefined);
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200));
    await politeGet('https://example.test', { fetchImpl, throttle, sleepImpl: async () => {} });
    expect(throttle).toHaveBeenCalledTimes(1);
  });

  it('sends an identifying User-Agent header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200));
    await politeGet('https://example.test', { fetchImpl, sleepImpl: async () => {} });
    const [, init] = fetchImpl.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ 'User-Agent': expect.stringContaining('AsliHackathonBot') });
  });

  it('retries up to 3 times on non-2xx responses, then throws', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(400));
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    await expect(politeGet('https://example.test', { fetchImpl, sleepImpl, retries: 3 })).rejects.toThrow(/HTTP 400/);
    expect(fetchImpl).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    expect(sleepImpl).toHaveBeenCalledTimes(3); // backoff only before retries, not the first attempt
  });

  it('retries on a thrown network error, then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(jsonResponse(200));
    const res = await politeGet('https://example.test', { fetchImpl, sleepImpl: async () => {} });
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('uses jittered exponential backoff between retries', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(500));
    const sleeps: number[] = [];
    const sleepImpl = vi.fn().mockImplementation(async (ms: number) => {
      sleeps.push(ms);
    });
    await expect(politeGet('https://example.test', { fetchImpl, sleepImpl, retries: 3 })).rejects.toThrow();
    // backoff grows: attempt1 ~500-750ms, attempt2 ~1000-1250ms, attempt3 ~2000-2250ms
    expect(sleeps[0]).toBeGreaterThanOrEqual(500);
    expect(sleeps[0]).toBeLessThan(750);
    expect(sleeps[1]).toBeGreaterThanOrEqual(1000);
    expect(sleeps[1]).toBeLessThan(1250);
    expect(sleeps[2]).toBeGreaterThanOrEqual(2000);
    expect(sleeps[2]).toBeLessThan(2250);
  });
});
