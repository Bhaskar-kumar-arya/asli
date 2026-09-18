import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn() }));

const viewerMember = { PK: 'CAB#cab-1', SK: 'MEMBER#user-target', role: 'VIEWER', alertsEnabled: true, joinedAt: '2026-09-10T08:15:00.000Z' };
let getResult: unknown;
let queryResult: unknown;
const deleteSpy = vi.fn();

vi.mock('@aws-sdk/lib-dynamodb', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/lib-dynamodb')>('@aws-sdk/lib-dynamodb');
  const send = vi.fn(async (cmd: unknown) => {
    if (cmd instanceof actual.GetCommand) return getResult;
    if (cmd instanceof actual.QueryCommand) return queryResult;
    if (cmd instanceof actual.DeleteCommand) {
      deleteSpy();
      return {};
    }
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
    isBase64Encoded: false,
    ...overrides,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe('members delete handler', () => {
  beforeEach(() => {
    process.env.CABINETS_TABLE = 'cabinets';
    process.env.AUTHZ_MODE_PARAM = '/asli/dev-h/authz/mode';
    process.env.AVP_POLICY_STORE_ID_PARAM = '/asli/dev-h/avp/policyStoreId';
    vi.resetModules();
    getResult = { Item: viewerMember };
    queryResult = { Items: [] };
    isAllowed = vi.fn(async () => true);
    deleteSpy.mockReset();
  });

  it('lets a member leave without a ManageMembers check', async () => {
    const { handler } = await import('./delete-handler');
    const result = await handler(baseEvent({ requestContext: { requestId: 'req-1', authorizer: { jwt: { claims: { sub: 'user-target' }, scopes: [] } } } } as never));

    expect(result.statusCode).toBe(204);
    expect(isAllowed).not.toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledOnce();
  });

  it('an OWNER can remove another member', async () => {
    const { handler } = await import('./delete-handler');
    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(204);
  });

  it('denies a VIEWER trying to remove someone else', async () => {
    isAllowed = vi.fn(async () => false);
    const { handler } = await import('./delete-handler');

    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(403);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('blocks removing the last owner', async () => {
    getResult = { Item: { ...viewerMember, role: 'OWNER' } };
    queryResult = { Items: [{ ...viewerMember, role: 'OWNER' }] };
    const { handler } = await import('./delete-handler');

    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(409);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND for a non-member', async () => {
    getResult = {};
    const { handler } = await import('./delete-handler');

    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(404);
  });
});
