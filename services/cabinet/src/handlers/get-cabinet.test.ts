import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeEvent } from '../test-utils';

vi.mock('../db', () => ({
  getDdb: () => ddbMock,
  cabinetsTableName: () => 'asli-dev-f-cabinets',
}));

const ddbMock = { send: vi.fn() };

function mockCabinet(role: 'OWNER' | 'EDITOR' | 'VIEWER' | undefined) {
  ddbMock.send.mockImplementation(async (cmd) => {
    if (cmd instanceof GetCommand) {
      if (cmd.input.Key?.SK === 'META') {
        return { Item: { PK: 'CAB#cab1', SK: 'META', name: 'My family', createdBy: 'u1', createdAt: '2026-01-01T00:00:00.000Z' } };
      }
      // MEMBER# lookup
      return role ? { Item: { PK: 'CAB#cab1', SK: `MEMBER#u2`, role, alertsEnabled: true, joinedAt: '2026-01-01T00:00:00.000Z' } } : {};
    }
    if (cmd instanceof QueryCommand) {
      return { Items: [] };
    }
    throw new Error(`unexpected command ${cmd.constructor.name}`);
  });
}

describe('GET /v1/cabinets/{cabinetId}', () => {
  beforeEach(() => {
    ddbMock.send.mockReset();
  });

  it('404s without a cabinetId path param', async () => {
    const { handler } = await import('./get-cabinet');
    const res = await handler(fakeEvent({ userId: 'u2' }));
    expect(res.statusCode).toBe(404);
  });

  it('403s a non-member', async () => {
    mockCabinet(undefined);
    const { handler } = await import('./get-cabinet');
    const res = await handler(fakeEvent({ userId: 'u2', pathParameters: { cabinetId: 'cab1' } }));
    expect(res.statusCode).toBe(403);
  });

  it('200s a VIEWER with the cabinet detail', async () => {
    mockCabinet('VIEWER');
    const { handler } = await import('./get-cabinet');
    const res = await handler(fakeEvent({ userId: 'u2', pathParameters: { cabinetId: 'cab1' } }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body!);
    expect(body.cabinet.cabinetId).toBe('cab1');
  });
});
