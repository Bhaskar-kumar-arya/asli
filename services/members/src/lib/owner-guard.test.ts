import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';
import { ensureNotLastOwner, isLastOwnerError } from './owner-guard';

function fakeDdb(members: Array<{ SK: string; role: string }>): DynamoDBDocumentClient {
  const send = async (cmd: unknown) => {
    if (cmd instanceof QueryCommand) return { Items: members };
    throw new Error('unexpected command');
  };
  return { send } as unknown as DynamoDBDocumentClient;
}

describe('ensureNotLastOwner', () => {
  it('passes when another owner remains', async () => {
    const ddb = fakeDdb([
      { SK: 'MEMBER#user-1', role: 'OWNER' },
      { SK: 'MEMBER#user-2', role: 'OWNER' },
    ]);
    await expect(ensureNotLastOwner({ ddb, cabinetsTable: 'cabinets' }, 'cab-1', 'user-1')).resolves.toBeUndefined();
  });

  it('throws a LastOwnerError when the excluded member is the only owner', async () => {
    const ddb = fakeDdb([
      { SK: 'MEMBER#user-1', role: 'OWNER' },
      { SK: 'MEMBER#user-2', role: 'EDITOR' },
    ]);
    await expect(ensureNotLastOwner({ ddb, cabinetsTable: 'cabinets' }, 'cab-1', 'user-1')).rejects.toSatisfy(isLastOwnerError);
  });
});
