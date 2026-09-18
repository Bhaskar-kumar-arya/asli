import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeEvent } from '../test-utils';

vi.mock('../db', () => ({
  getDdb: () => ddbMock,
  reportsTableName: () => 'asli-dev-l-reports',
}));

const ddbMock = { send: vi.fn() };

describe('POST /v1/reports', () => {
  beforeEach(() => {
    ddbMock.send.mockReset();
    ddbMock.send.mockResolvedValue({});
  });

  it('401s with no JWT sub', async () => {
    const { handler } = await import('./create-report');
    const res = await handler(
      fakeEvent({ body: { identity: { batchNumber: 'GTL1258', source: 'manual' }, problemType: 'side_effect' } }),
    );
    expect(res.statusCode).toBe(401);
  });

  it('400s on an unknown problemType', async () => {
    const { handler } = await import('./create-report');
    const res = await handler(
      fakeEvent({
        userId: 'u1',
        body: { identity: { batchNumber: 'GTL1258', source: 'manual' }, problemType: 'not_a_real_type' },
      }),
    );
    expect(res.statusCode).toBe(400);
    expect(ddbMock.send).not.toHaveBeenCalled();
  });

  it('stores the report and returns PvPI routes without echoing personal data', async () => {
    const { handler } = await import('./create-report');
    const res = await handler(
      fakeEvent({
        userId: 'u1',
        body: {
          identity: { batchNumber: 'GTL 1258', source: 'manual' },
          problemType: 'packaging_problem',
          note: 'blister pack was torn',
        },
      }),
    );

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body!) as { pvpi: { howToReport: string; links: string[] } };
    expect(body.pvpi.links.length).toBeGreaterThan(0);
    expect(body.pvpi.howToReport).toMatch(/1800-180-3024/);
    expect(JSON.stringify(body)).not.toMatch(/u1/);

    expect(ddbMock.send).toHaveBeenCalledWith(expect.any(PutCommand));
    const putCall = ddbMock.send.mock.calls[0]![0] as PutCommand;
    const item = putCall.input.Item as Record<string, unknown>;
    expect(item.batchNorm).toBe('GTL1258');
    expect(item.problemType).toBe('packaging_problem');
    expect(item.note).toBe('blister pack was torn');
    expect(item).not.toHaveProperty('userId');
    expect(item).not.toHaveProperty('identity');
  });

  it('accepts an optional alertRef', async () => {
    const { handler } = await import('./create-report');
    const res = await handler(
      fakeEvent({
        userId: 'u1',
        body: {
          identity: { batchNumber: 'GTL1258', source: 'manual' },
          problemType: 'other',
          alertRef: 'QkFUQ0gjR1RMMTI1OHxBTEVSVCMyMDI2LTA5I05TUSNhYmMx',
        },
      }),
    );
    expect(res.statusCode).toBe(201);
    const putCall = ddbMock.send.mock.calls[0]![0] as PutCommand;
    const item = putCall.input.Item as Record<string, unknown>;
    expect(item.alertRef).toBe('QkFUQ0gjR1RMMTI1OHxBTEVSVCMyMDI2LTA5I05TUSNhYmMx');
  });
});
