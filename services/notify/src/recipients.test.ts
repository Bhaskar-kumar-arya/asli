import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { resolveRecipients } from './recipients';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
  process.env.CABINETS_TABLE_NAME = 'asli-test-cabinets';
});

describe('resolveRecipients', () => {
  const member = (userId: string, role: string, alertsEnabled: boolean) => ({
    PK: 'CAB#cab-1',
    SK: `MEMBER#${userId}`,
    role,
    alertsEnabled,
    joinedAt: '2026-09-10T08:15:00.000Z',
    GSI1PK: `USER#${userId}`,
    GSI1SK: 'CAB#cab-1',
  });

  it('excludes members with alertsEnabled = false', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [member('user-a', 'OWNER', true), member('user-b', 'EDITOR', false)],
    });

    const recipients = await resolveRecipients('cab-1');
    expect(recipients).toEqual([{ userId: 'user-a' }]);
  });

  it('includes VIEWER role since ReceiveAlerts is permitted for all roles', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [member('user-c', 'VIEWER', true)],
    });

    const recipients = await resolveRecipients('cab-1');
    expect(recipients).toEqual([{ userId: 'user-c' }]);
  });

  it('paginates through LastEvaluatedKey', async () => {
    ddbMock
      .on(QueryCommand)
      .resolvesOnce({
        Items: [member('user-a', 'OWNER', true)],
        LastEvaluatedKey: { PK: 'CAB#cab-1', SK: 'MEMBER#user-a' },
      })
      .resolvesOnce({
        Items: [member('user-b', 'EDITOR', true)],
      });

    const recipients = await resolveRecipients('cab-1');
    expect(recipients).toEqual([{ userId: 'user-a' }, { userId: 'user-b' }]);
  });
});
