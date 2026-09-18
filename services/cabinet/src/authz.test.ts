import { describe, expect, it } from 'vitest';
import type { CabinetAction, Role } from '@asli/contracts';
import { createAuthz } from './authz';

// docs/PERMISSIONS.md role table.
const TABLE: Array<[Role, CabinetAction, boolean]> = [
  ['OWNER', 'ViewCabinet', true],
  ['OWNER', 'AddMedicine', true],
  ['OWNER', 'RemoveMedicine', true],
  ['OWNER', 'ManageMembers', true],
  ['OWNER', 'ReceiveAlerts', true],
  ['EDITOR', 'ViewCabinet', true],
  ['EDITOR', 'AddMedicine', true],
  ['EDITOR', 'RemoveMedicine', true],
  ['EDITOR', 'ManageMembers', false],
  ['EDITOR', 'ReceiveAlerts', true],
  ['VIEWER', 'ViewCabinet', true],
  ['VIEWER', 'AddMedicine', false],
  ['VIEWER', 'RemoveMedicine', false],
  ['VIEWER', 'ManageMembers', false],
  ['VIEWER', 'ReceiveAlerts', true],
];

describe('createAuthz stub', () => {
  it.each(TABLE)('role %s action %s -> %s', async (role, action, expected) => {
    const authz = createAuthz({ mode: 'stub', lookupRole: async () => role });
    expect(await authz.isAllowed('u1', action, 'c1')).toBe(expected);
  });

  it('denies when the user has no membership', async () => {
    const authz = createAuthz({ mode: 'stub', lookupRole: async () => undefined });
    expect(await authz.isAllowed('u1', 'ViewCabinet', 'c1')).toBe(false);
  });

  it('denies by default when the lookup throws', async () => {
    const authz = createAuthz({
      mode: 'stub',
      lookupRole: async () => {
        throw new Error('ddb down');
      },
    });
    expect(await authz.isAllowed('u1', 'ViewCabinet', 'c1')).toBe(false);
  });
});
