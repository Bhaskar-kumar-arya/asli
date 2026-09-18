import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn() }));

const invite = {
  PK: 'CAB#cab-1',
  SK: 'INVITE#ABCD2345',
  role: 'VIEWER',
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  createdBy: 'user-owner',
  GSI2PK: 'INVITE#ABCD2345',
};
const cabinetMeta = { PK: 'CAB#cab-1', SK: 'META', name: "Mom's medicines", createdBy: 'user-owner', createdAt: '2026-09-10T08:15:00.000Z' };

let queryResult: unknown;
let getResults: unknown[];
let transactError: Error | undefined;

vi.mock('@aws-sdk/lib-dynamodb', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/lib-dynamodb')>('@aws-sdk/lib-dynamodb');
  const send = vi.fn(async (cmd: unknown) => {
    if (cmd instanceof actual.QueryCommand) return queryResult;
    if (cmd instanceof actual.GetCommand) return getResults.shift();
    if (cmd instanceof actual.TransactWriteCommand) {
      if (transactError) throw transactError;
      return {};
    }
    throw new Error('unexpected command');
  });
  return { ...actual, DynamoDBDocumentClient: { from: vi.fn(() => ({ send })) } };
});

function baseEvent(overrides: Partial<APIGatewayProxyEventV2WithJWTAuthorizer> = {}): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { requestId: 'req-1', authorizer: { jwt: { claims: { sub: 'user-new' }, scopes: [] } } },
    pathParameters: { code: 'ABCD2345' },
    isBase64Encoded: false,
    ...overrides,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe('invites accept handler', () => {
  beforeEach(() => {
    process.env.CABINETS_TABLE = 'cabinets';
    vi.resetModules();
    queryResult = { Items: [invite] };
    getResults = [{ Item: undefined }, { Item: cabinetMeta }];
    transactError = undefined;
  });

  it('adds the caller as a member with the invite role and returns the cabinet', async () => {
    const { handler } = await import('./accept-handler');
    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body ?? '{}');
    expect(body).toEqual({ cabinetId: 'cab-1', name: cabinetMeta.name, createdBy: cabinetMeta.createdBy, createdAt: cabinetMeta.createdAt });
  });

  it('returns NOT_FOUND for an unknown code', async () => {
    queryResult = { Items: [] };
    const { handler } = await import('./accept-handler');
    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(404);
  });

  it('returns CONFLICT for an expired invite', async () => {
    queryResult = { Items: [{ ...invite, expiresAt: Math.floor(Date.now() / 1000) - 10 }] };
    const { handler } = await import('./accept-handler');
    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(409);
  });

  it('returns CONFLICT when the invite was already used (transaction race)', async () => {
    transactError = Object.assign(new Error('used'), { name: 'TransactionCanceledException' });
    const { handler } = await import('./accept-handler');
    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(409);
  });
});
