import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn() }));

const existingMember = {
  PK: 'CAB#cab-1',
  SK: 'MEMBER#user-target',
  role: 'OWNER',
  alertsEnabled: true,
  joinedAt: '2026-09-10T08:15:00.000Z',
  GSI1PK: 'USER#user-target',
  GSI1SK: 'CAB#cab-1',
};
let getResult: unknown;
let queryResult: unknown;
let updateAttributes: Record<string, unknown>;

vi.mock('@aws-sdk/lib-dynamodb', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/lib-dynamodb')>('@aws-sdk/lib-dynamodb');
  const send = vi.fn(async (cmd: unknown) => {
    if (cmd instanceof actual.GetCommand) return getResult;
    if (cmd instanceof actual.QueryCommand) return queryResult;
    if (cmd instanceof actual.UpdateCommand) return { Attributes: updateAttributes };
    throw new Error('unexpected command');
  });
  return { ...actual, DynamoDBDocumentClient: { from: vi.fn(() => ({ send })) } };
});

let isAllowed = vi.fn(async () => true);
vi.mock('../lib/authz', () => ({
  createAuthzFactory: vi.fn(() => async () => ({ mode: 'stub', authz: { isAllowed } })),
}));

function baseEvent(overrides: Partial<APIGatewayProxyEventV2WithJWTAuthorizer> = {}): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { requestId: 'req-1', authorizer: { jwt: { claims: { sub: 'user-owner' }, scopes: [] } } },
    pathParameters: { cabinetId: 'cab-1', userId: 'user-target' },
    body: JSON.stringify({ alertsEnabled: false }),
    isBase64Encoded: false,
    ...overrides,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe('members update handler', () => {
  beforeEach(() => {
    process.env.CABINETS_TABLE = 'cabinets';
    process.env.AUTHZ_MODE_PARAM = '/asli/dev-h/authz/mode';
    process.env.AVP_POLICY_STORE_ID_PARAM = '/asli/dev-h/avp/policyStoreId';
    vi.resetModules();
    getResult = { Item: existingMember };
    queryResult = { Items: [existingMember] };
    updateAttributes = { ...existingMember, alertsEnabled: false };
    isAllowed = vi.fn(async () => true);
  });

  it('lets a member toggle their own alertsEnabled without a ManageMembers check', async () => {
    const { handler } = await import('./update-handler');
    const result = await handler(baseEvent({ requestContext: { requestId: 'req-1', authorizer: { jwt: { claims: { sub: 'user-target' }, scopes: [] } } } } as never));

    expect(result.statusCode).toBe(200);
    expect(isAllowed).not.toHaveBeenCalled();
  });

  it('requires ManageMembers to change another member and denies a VIEWER', async () => {
    isAllowed = vi.fn(async () => false);
    const { handler } = await import('./update-handler');

    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(403);
  });

  it('blocks demoting the last owner', async () => {
    queryResult = { Items: [existingMember] }; // only owner
    const { handler } = await import('./update-handler');

    const result = await handler(baseEvent({ body: JSON.stringify({ role: 'EDITOR' }) }));

    expect(result.statusCode).toBe(409);
  });

  it('allows demoting an owner when another owner remains', async () => {
    queryResult = { Items: [existingMember, { ...existingMember, SK: 'MEMBER#user-other' }] };
    updateAttributes = { ...existingMember, role: 'EDITOR' };
    const { handler } = await import('./update-handler');

    const result = await handler(baseEvent({ body: JSON.stringify({ role: 'EDITOR' }) }));

    expect(result.statusCode).toBe(200);
  });

  it('returns NOT_FOUND for a non-member', async () => {
    getResult = {};
    const { handler } = await import('./update-handler');

    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(404);
  });
});
