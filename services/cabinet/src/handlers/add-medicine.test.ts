import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeEvent } from '../test-utils';

vi.mock('../db', () => ({
  getDdb: () => ddbMock,
  cabinetsTableName: () => 'asli-dev-f-cabinets',
}));

vi.mock('@aws-lambda-powertools/idempotency/dynamodb', () => ({
  DynamoDBPersistenceLayer: vi.fn().mockImplementation(() => ({
    configure: vi.fn(),
    saveInProgress: vi.fn(),
    saveSuccess: vi.fn(),
    saveError: vi.fn(),
    getRecord: vi.fn(),
    deleteRecord: vi.fn(),
  })),
}));

process.env.IDEMPOTENCY_TABLE_NAME = 'asli-dev-f-idempotency';

const ddbMock = { send: vi.fn() };

function mockMember(role: 'OWNER' | 'EDITOR' | 'VIEWER') {
  ddbMock.send.mockImplementation(async (cmd) => {
    if (cmd instanceof GetCommand) {
      return { Item: { PK: 'CAB#cab1', SK: 'MEMBER#u1', role, alertsEnabled: true, joinedAt: '2026-01-01T00:00:00.000Z' } };
    }
    if (cmd instanceof PutCommand) {
      return {};
    }
    throw new Error(`unexpected command ${cmd.constructor.name}`);
  });
}

const identity = { batchNumber: 'GTL1258', manufacturer: 'Gidsha', source: 'manual' as const };

describe('POST /v1/cabinets/{cabinetId}/medicines', () => {
  beforeEach(() => {
    ddbMock.send.mockReset();
  });

  it('403s a VIEWER', async () => {
    mockMember('VIEWER');
    const { handler } = await import('./add-medicine');
    const res = await handler(
      fakeEvent({ userId: 'u1', pathParameters: { cabinetId: 'cab1' }, body: { identity } }),
    );
    expect(res.statusCode).toBe(403);
  });

  it('lets an EDITOR add a medicine, saved as PENDING', async () => {
    mockMember('EDITOR');
    const { handler } = await import('./add-medicine');
    const res = await handler(
      fakeEvent({ userId: 'u1', pathParameters: { cabinetId: 'cab1' }, body: { identity, label: 'Mom pills' } }),
    );
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body!);
    expect(body.latestTier).toBe('PENDING');
    expect(body.label).toBe('Mom pills');
    expect(ddbMock.send).toHaveBeenCalledWith(expect.any(PutCommand));
  });
});
