import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeEvent } from '../test-utils';

vi.mock('../db', () => ({
  getDdb: () => ddbMock,
  cabinetsTableName: () => 'asli-dev-f-cabinets',
}));

const ddbMock = { send: vi.fn() };

describe('POST /v1/cabinets', () => {
  beforeEach(() => {
    ddbMock.send.mockReset();
    ddbMock.send.mockResolvedValue({});
  });

  it('400s on an empty name', async () => {
    const { handler } = await import('./create-cabinet');
    const res = await handler(fakeEvent({ userId: 'u1', body: { name: '' } }));
    expect(res.statusCode).toBe(400);
  });

  it('creates a cabinet with the caller as OWNER', async () => {
    const { handler } = await import('./create-cabinet');
    const res = await handler(fakeEvent({ userId: 'u1', body: { name: "Dad's cabinet" } }));

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body!);
    expect(body.name).toBe("Dad's cabinet");
    expect(body.createdBy).toBe('u1');
    expect(ddbMock.send).toHaveBeenCalledWith(expect.any(TransactWriteCommand));
  });
});
