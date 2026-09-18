import { DeleteCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeEvent } from '../test-utils';

vi.mock('../db', () => ({
  getDdb: () => ddbMock,
  cabinetsTableName: () => 'asli-dev-f-cabinets',
}));

const ddbMock = { send: vi.fn() };

function mockMember(role: 'OWNER' | 'EDITOR' | 'VIEWER') {
  ddbMock.send.mockImplementation(async (cmd) => {
    if (cmd instanceof GetCommand) {
      return { Item: { PK: 'CAB#cab1', SK: 'MEMBER#u1', role, alertsEnabled: true, joinedAt: '2026-01-01T00:00:00.000Z' } };
    }
    if (cmd instanceof QueryCommand) {
      return { Items: [] };
    }
    if (cmd instanceof DeleteCommand) {
      return {};
    }
    throw new Error(`unexpected command ${cmd.constructor.name}`);
  });
}

describe('DELETE /v1/cabinets/{cabinetId}/medicines/{medId}', () => {
  beforeEach(() => {
    ddbMock.send.mockReset();
  });

  it('403s a VIEWER trying to remove a medicine', async () => {
    mockMember('VIEWER');
    const { handler } = await import('./delete-medicine');
    const res = await handler(fakeEvent({ userId: 'u1', pathParameters: { cabinetId: 'cab1', medId: 'med1' } }));
    expect(res.statusCode).toBe(403);
  });

  it('204s an OWNER removing a medicine, and deletes its matches', async () => {
    mockMember('OWNER');
    const { handler } = await import('./delete-medicine');
    const res = await handler(fakeEvent({ userId: 'u1', pathParameters: { cabinetId: 'cab1', medId: 'med1' } }));
    expect(res.statusCode).toBe(204);
    expect(ddbMock.send).toHaveBeenCalledWith(expect.any(QueryCommand));
    expect(ddbMock.send).toHaveBeenCalledWith(expect.any(DeleteCommand));
  });
});
