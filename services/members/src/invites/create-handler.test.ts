import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/lib-dynamodb')>('@aws-sdk/lib-dynamodb');
  return { ...actual, DynamoDBDocumentClient: { from: vi.fn(() => ({ send })) } };
});

let isAllowed = vi.fn(async () => true);
vi.mock('../lib/authz', () => ({
  createAuthzFactory: vi.fn(() => async () => ({ mode: 'stub', authz: { isAllowed } })),
}));

function baseEvent(overrides: Partial<APIGatewayProxyEventV2WithJWTAuthorizer> = {}): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { requestId: 'req-1', authorizer: { jwt: { claims: { sub: 'user-owner' }, scopes: [] } } },
    pathParameters: { cabinetId: 'cab-1' },
    body: JSON.stringify({ role: 'VIEWER' }),
    isBase64Encoded: false,
    ...overrides,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe('invites create handler', () => {
  beforeEach(() => {
    process.env.CABINETS_TABLE = 'cabinets';
    process.env.AUTHZ_MODE_PARAM = '/asli/dev-h/authz/mode';
    process.env.AVP_POLICY_STORE_ID_PARAM = '/asli/dev-h/avp/policyStoreId';
    vi.resetModules();
    send.mockReset();
    isAllowed = vi.fn(async () => true);
  });

  it('creates an 8-char invite code with a 72h TTL', async () => {
    send.mockResolvedValue({});
    const { handler } = await import('./create-handler');

    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body ?? '{}');
    expect(body.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    expect(body.role).toBe('VIEWER');
    const expiresInHours = (new Date(body.expiresAt).getTime() - Date.now()) / 3600_000;
    expect(expiresInHours).toBeGreaterThan(71.9);
    expect(expiresInHours).toBeLessThan(72.1);
  });

  it('returns FORBIDDEN when the caller is not allowed to manage members', async () => {
    isAllowed = vi.fn(async () => false);
    const { handler } = await import('./create-handler');

    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(403);
  });

  it('retries on a code collision and eventually succeeds', async () => {
    send.mockRejectedValueOnce(Object.assign(new Error('collision'), { name: 'ConditionalCheckFailedException' })).mockResolvedValue({});
    const { handler } = await import('./create-handler');

    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(201);
    expect(send).toHaveBeenCalledTimes(2);
  });
});
