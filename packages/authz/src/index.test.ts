import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IsAuthorizedCommand } from '@aws-sdk/client-verifiedpermissions';
import type { VerifiedPermissionsClient } from '@aws-sdk/client-verifiedpermissions';
import type { CabinetAction, Role } from '@asli/contracts';
import { describe, expect, it, vi } from 'vitest';
import { createAuthz } from './index';

/**
 * docs/PERMISSIONS.md role x action table (15 combinations). Both `stub` and
 * `avp` mode must agree with this table and with each other for every combo
 * (deliverable 4's stub/AVP parity test).
 */
const ROLE_ACTION_TABLE: Array<{ role: Role; action: CabinetAction; expected: boolean }> = [
  { role: 'OWNER', action: 'ViewCabinet', expected: true },
  { role: 'OWNER', action: 'AddMedicine', expected: true },
  { role: 'OWNER', action: 'RemoveMedicine', expected: true },
  { role: 'OWNER', action: 'ManageMembers', expected: true },
  { role: 'OWNER', action: 'ReceiveAlerts', expected: true },
  { role: 'EDITOR', action: 'ViewCabinet', expected: true },
  { role: 'EDITOR', action: 'AddMedicine', expected: true },
  { role: 'EDITOR', action: 'RemoveMedicine', expected: true },
  { role: 'EDITOR', action: 'ManageMembers', expected: false },
  { role: 'EDITOR', action: 'ReceiveAlerts', expected: true },
  { role: 'VIEWER', action: 'ViewCabinet', expected: true },
  { role: 'VIEWER', action: 'AddMedicine', expected: false },
  { role: 'VIEWER', action: 'RemoveMedicine', expected: false },
  { role: 'VIEWER', action: 'ManageMembers', expected: false },
  { role: 'VIEWER', action: 'ReceiveAlerts', expected: true },
];

function fakeDdb(role: Role | undefined): DynamoDBDocumentClient {
  const send = vi.fn(async (cmd: unknown) => {
    if (cmd instanceof GetCommand) {
      return role ? { Item: { role } } : {};
    }
    throw new Error('unexpected command');
  });
  return { send } as unknown as DynamoDBDocumentClient;
}

/** Mirrors AVP's real Cedar decision for policies/*.cedar, for parity testing without a live policy store. */
function fakeAvpClient(role: Role | undefined): VerifiedPermissionsClient {
  const send = vi.fn(async (cmd: unknown) => {
    if (!(cmd instanceof IsAuthorizedCommand)) throw new Error('unexpected command');
    const action = cmd.input.action?.actionId;
    const allow =
      role !== undefined &&
      ((action === 'ViewCabinet' || action === 'ReceiveAlerts') && (role === 'OWNER' || role === 'EDITOR' || role === 'VIEWER')) ||
      ((action === 'AddMedicine' || action === 'RemoveMedicine') && (role === 'OWNER' || role === 'EDITOR')) ||
      (action === 'ManageMembers' && role === 'OWNER');
    return { decision: allow ? 'ALLOW' : 'DENY', determiningPolicies: [], errors: [] };
  });
  return { send } as unknown as VerifiedPermissionsClient;
}

describe('createAuthz stub mode', () => {
  it.each(ROLE_ACTION_TABLE)('$role x $action -> $expected', async ({ role, action, expected }) => {
    const authz = createAuthz({ mode: 'stub', ddb: fakeDdb(role), cabinetsTable: 'cabinets' });
    await expect(authz.isAllowed('user-1', action, 'cab-1')).resolves.toBe(expected);
  });

  it('denies when the caller is not a member', async () => {
    const authz = createAuthz({ mode: 'stub', ddb: fakeDdb(undefined), cabinetsTable: 'cabinets' });
    await expect(authz.isAllowed('user-1', 'ViewCabinet', 'cab-1')).resolves.toBe(false);
  });

  it('denies by default on a DynamoDB error', async () => {
    const ddb = { send: vi.fn().mockRejectedValue(new Error('boom')) } as unknown as DynamoDBDocumentClient;
    const authz = createAuthz({ mode: 'stub', ddb, cabinetsTable: 'cabinets' });
    await expect(authz.isAllowed('user-1', 'ViewCabinet', 'cab-1')).resolves.toBe(false);
  });
});

describe('createAuthz avp mode', () => {
  it.each(ROLE_ACTION_TABLE)('$role x $action -> $expected (parity with stub)', async ({ role, action, expected }) => {
    const authz = createAuthz({
      mode: 'avp',
      ddb: fakeDdb(role),
      cabinetsTable: 'cabinets',
      policyStoreId: 'store-1',
      avpClient: fakeAvpClient(role),
    });
    await expect(authz.isAllowed('user-1', action, 'cab-1')).resolves.toBe(expected);
  });

  it('denies by default on an AVP error', async () => {
    const avpClient = { send: vi.fn().mockRejectedValue(new Error('boom')) } as unknown as VerifiedPermissionsClient;
    const authz = createAuthz({ mode: 'avp', ddb: fakeDdb('OWNER'), cabinetsTable: 'cabinets', policyStoreId: 'store-1', avpClient });
    await expect(authz.isAllowed('user-1', 'ViewCabinet', 'cab-1')).resolves.toBe(false);
  });

  it('caches a decision for 30s per (user, action, cabinet)', async () => {
    let calls = 0;
    const avpClient = {
      send: vi.fn(async () => {
        calls += 1;
        return { decision: 'ALLOW', determiningPolicies: [], errors: [] };
      }),
    } as unknown as VerifiedPermissionsClient;
    let time = 0;
    const authz = createAuthz({
      mode: 'avp',
      ddb: fakeDdb('OWNER'),
      cabinetsTable: 'cabinets',
      policyStoreId: 'store-1',
      avpClient,
      now: () => time,
    });

    await authz.isAllowed('user-1', 'ViewCabinet', 'cab-1');
    time += 20_000;
    await authz.isAllowed('user-1', 'ViewCabinet', 'cab-1');
    expect(calls).toBe(1);

    time += 15_000;
    await authz.isAllowed('user-1', 'ViewCabinet', 'cab-1');
    expect(calls).toBe(2);
  });

  it('throws synchronously if avp mode is requested without policyStoreId/avpClient', () => {
    expect(() => createAuthz({ mode: 'avp', ddb: fakeDdb('OWNER'), cabinetsTable: 'cabinets' })).toThrow();
  });
});
