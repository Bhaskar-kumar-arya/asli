import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeEvent } from '../test-utils';

vi.mock('../db', () => ({
  getDdb: () => ddbMock,
  cabinetsTableName: () => 'asli-dev-f-cabinets',
}));

const ddbMock = { send: vi.fn() };

describe('GET /v1/cabinets', () => {
  beforeEach(() => {
    ddbMock.send.mockReset();
  });

  it('401s without a JWT sub claim', async () => {
    const { handler } = await import('./list-cabinets');
    const res = await handler(fakeEvent({}));
    expect(res.statusCode).toBe(401);
  });

  it('returns existing cabinets without creating a default one', async () => {
    ddbMock.send.mockImplementation(async (cmd) => {
      if (cmd instanceof QueryCommand) {
        return { Items: [{ PK: 'CAB#cab1', SK: 'MEMBER#u1', role: 'OWNER' }] };
      }
      if (cmd instanceof GetCommand) {
        return { Item: { PK: 'CAB#cab1', SK: 'META', name: 'My family', createdBy: 'u1', createdAt: '2026-01-01T00:00:00.000Z' } };
      }
      throw new Error(`unexpected command ${cmd.constructor.name}`);
    });

    const { handler } = await import('./list-cabinets');
    const res = await handler(fakeEvent({ userId: 'u1' }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body.cabinets).toEqual([
      { cabinetId: 'cab1', name: 'My family', createdBy: 'u1', createdAt: '2026-01-01T00:00:00.000Z', role: 'OWNER' },
    ]);
    expect(ddbMock.send).not.toHaveBeenCalledWith(expect.any(TransactWriteCommand));
  });

  it('lazily creates a default cabinet on first sign-in (empty membership list)', async () => {
    let membershipQueries = 0;
    ddbMock.send.mockImplementation(async (cmd) => {
      if (cmd instanceof QueryCommand) {
        membershipQueries += 1;
        if (membershipQueries === 1) return { Items: [] };
        return { Items: [{ PK: 'CAB#new1', SK: 'MEMBER#u1', role: 'OWNER' }] };
      }
      if (cmd instanceof TransactWriteCommand) {
        return {};
      }
      if (cmd instanceof GetCommand) {
        return { Item: { PK: 'CAB#new1', SK: 'META', name: 'My family', createdBy: 'u1', createdAt: '2026-01-01T00:00:00.000Z' } };
      }
      throw new Error(`unexpected command ${cmd.constructor.name}`);
    });

    const { handler } = await import('./list-cabinets');
    const res = await handler(fakeEvent({ userId: 'u1' }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body.cabinets[0].name).toBe('My family');
    expect(ddbMock.send).toHaveBeenCalledWith(expect.any(TransactWriteCommand));
  });
});
