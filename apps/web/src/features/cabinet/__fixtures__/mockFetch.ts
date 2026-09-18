import { vi } from 'vitest';

export type RouteHandler = (url: string, init?: RequestInit) => { status: number; body?: unknown };

/** Installs a minimal fetch mock routed by exact pathname match against `routes`. */
export function installMockFetch(routes: Record<string, RouteHandler>) {
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const path = new URL(url, 'http://localhost').pathname;
    const handler = routes[path];
    if (!handler) {
      throw new Error(`No mock route for ${path}`);
    }
    const { status, body } = handler(url, init);
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
