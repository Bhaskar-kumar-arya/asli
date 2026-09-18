import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: vi.fn(() => ({ send: vi.fn() })) } }));

vi.mock('../rate-limit/limiter', () => ({
  checkAndIncrement: vi.fn(async () => undefined),
  RateLimitedError: class RateLimitedError extends Error {},
}));
vi.mock('../reference/alias-map', () => ({ createAliasMapLoader: vi.fn(() => async () => ({})) }));
vi.mock('@asli/lookup', () => ({ createLookup: vi.fn(() => ({})) }));
vi.mock('../check-item', () => ({
  checkIdentity: vi.fn(async (identity: { batchNumber: string }) => ({
    identity,
    tier: 'NO_ALERT_FOUND',
    reasonCodes: [],
    matches: [],
    checkedAgainst: { monthCount: 1, latestMonth: '2026-01' },
    guidanceKey: 'result.no_alert_found',
  })),
}));

function baseEvent(overrides: Partial<APIGatewayProxyEventV2WithJWTAuthorizer> = {}): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { requestId: 'req-1', authorizer: { jwt: { claims: { sub: 'user-1' }, scopes: [] } } },
    body: JSON.stringify({ items: [{ batchNumber: 'GTL1258', source: 'manual' }] }),
    isBase64Encoded: false,
    ...overrides,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe('checks handler', () => {
  beforeEach(() => {
    process.env.FLAGGED_BATCHES_TABLE = 'flagged-batches';
    process.env.INGESTION_STATE_TABLE = 'ingestion-state';
    process.env.REFERENCE_TABLE = 'reference';
    vi.resetModules();
  });

  it('returns 200 with one CheckItemResult per item', async () => {
    const { handler } = await import('./handler');
    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body ?? '{}');
    expect(body.results).toHaveLength(1);
    expect(body.results[0].tier).toBe('NO_ALERT_FOUND');
  });

  it('returns RATE_LIMITED when the limiter throws', async () => {
    const { RateLimitedError } = await import('../rate-limit/limiter');
    const { checkAndIncrement } = await import('../rate-limit/limiter');
    vi.mocked(checkAndIncrement).mockRejectedValueOnce(new RateLimitedError('over limit'));

    const { handler } = await import('./handler');
    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(429);
    expect(JSON.parse(result.body ?? '{}').error.code).toBe('RATE_LIMITED');
  });

  it('returns BAD_REQUEST for an empty items array', async () => {
    const { handler } = await import('./handler');
    const result = await handler(baseEvent({ body: JSON.stringify({ items: [] }) }));

    expect(result.statusCode).toBe(400);
  });
});
