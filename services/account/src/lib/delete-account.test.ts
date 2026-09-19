import { DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it, vi } from 'vitest';
import { deleteAccountData } from './delete-account';

function fakeDdb(responses: {
  memberships: unknown[];
  cabinetMembersByCabinet: Record<string, unknown[]>;
  wholeCabinetItemsByCabinet?: Record<string, unknown[]>;
  pushSubscriptions?: unknown[];
}) {
  const deletedKeys: Array<{ table: string; pk: string; sk: string }> = [];
  const send = vi.fn(async (cmd: unknown) => {
    if (cmd instanceof QueryCommand) {
      const values = cmd.input.ExpressionAttributeValues as Record<string, string>;
      if (cmd.input.IndexName === 'GSI1') {
        return { Items: responses.memberships };
      }
      if (cmd.input.TableName === 'push-subs') {
        return { Items: responses.pushSubscriptions ?? [] };
      }
      const cabinetId = (values[':pk'] as string).slice('CAB#'.length);
      if (values[':prefix'] === 'MEMBER#') {
        return { Items: responses.cabinetMembersByCabinet[cabinetId] ?? [] };
      }
      // full-cabinet query (no :prefix) for the whole-cabinet delete path
      return { Items: responses.wholeCabinetItemsByCabinet?.[cabinetId] ?? [] };
    }
    if (cmd instanceof DeleteCommand) {
      deletedKeys.push({ table: cmd.input.TableName as string, pk: cmd.input.Key!.PK as string, sk: cmd.input.Key!.SK as string });
      return {};
    }
    throw new Error('unexpected command');
  });
  return { ddb: { send } as unknown as DynamoDBDocumentClient, deletedKeys };
}

const deps = { cabinetsTable: 'cabinets', pushSubscriptionsTable: 'push-subs' };

describe('deleteAccountData', () => {
  it('just removes the membership when the caller is not the sole owner', async () => {
    const membership = { PK: 'CAB#cab-1', SK: 'MEMBER#user-1', role: 'VIEWER' };
    const { ddb, deletedKeys } = fakeDdb({
      memberships: [membership],
      cabinetMembersByCabinet: { 'cab-1': [membership, { PK: 'CAB#cab-1', SK: 'MEMBER#user-2', role: 'OWNER' }] },
    });

    const result = await deleteAccountData({ ddb, ...deps }, 'user-1');

    expect(result).toEqual({ cabinetsLeft: 1, cabinetsDeleted: 0, subscriptionsRemoved: 0 });
    expect(deletedKeys).toEqual([{ table: 'cabinets', pk: 'CAB#cab-1', sk: 'MEMBER#user-1' }]);
  });

  it('refuses when the caller is the sole owner of a cabinet that has other members', async () => {
    const membership = { PK: 'CAB#cab-1', SK: 'MEMBER#user-1', role: 'OWNER' };
    const { ddb, deletedKeys } = fakeDdb({
      memberships: [membership],
      cabinetMembersByCabinet: { 'cab-1': [membership, { PK: 'CAB#cab-1', SK: 'MEMBER#user-2', role: 'VIEWER' }] },
    });

    await expect(deleteAccountData({ ddb, ...deps }, 'user-1')).rejects.toMatchObject({ code: 'CONFLICT' });
    expect(deletedKeys).toEqual([]);
  });

  it('deletes the whole cabinet when the caller is the sole owner and sole member', async () => {
    const membership = { PK: 'CAB#cab-1', SK: 'MEMBER#user-1', role: 'OWNER' };
    const cabinetItems = [
      { PK: 'CAB#cab-1', SK: 'META' },
      membership,
      { PK: 'CAB#cab-1', SK: 'MED#med-1' },
      { PK: 'CAB#cab-1', SK: 'MATCH#med-1#alert-1' },
    ];
    const { ddb, deletedKeys } = fakeDdb({
      memberships: [membership],
      cabinetMembersByCabinet: { 'cab-1': [membership] },
      wholeCabinetItemsByCabinet: { 'cab-1': cabinetItems },
    });

    const result = await deleteAccountData({ ddb, ...deps }, 'user-1');

    expect(result).toEqual({ cabinetsLeft: 0, cabinetsDeleted: 1, subscriptionsRemoved: 0 });
    expect(deletedKeys).toHaveLength(4);
  });

  it('deletes push subscriptions for the caller', async () => {
    const { ddb, deletedKeys } = fakeDdb({
      memberships: [],
      cabinetMembersByCabinet: {},
      pushSubscriptions: [{ PK: 'USER#user-1', SK: 'SUB#abc' }, { PK: 'USER#user-1', SK: 'SUB#def' }],
    });

    const result = await deleteAccountData({ ddb, ...deps }, 'user-1');

    expect(result.subscriptionsRemoved).toBe(2);
    expect(deletedKeys).toHaveLength(2);
  });
});
