import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ddbMock = { send: vi.fn() };
const s3Mock = { send: vi.fn() };
vi.mock('../db', () => ({
  getDdb: () => ddbMock,
  getS3: () => s3Mock,
  requireEnv: (name: string) => `env-${name}`,
}));

function flaggedBatchesPage(items: unknown[], lastKey?: Record<string, unknown>) {
  return { Items: items, LastEvaluatedKey: lastKey };
}

describe('compute-stats handler', () => {
  beforeEach(() => {
    ddbMock.send.mockReset();
    s3Mock.send.mockReset().mockResolvedValue({});
  });

  it('paginates FlaggedBatches and Cabinets scans, writes impact + public stats items, and uploads a JSON summary', async () => {
    const flaggedPages = [
      flaggedBatchesPage(
        [
          {
            alertMonth: '2024-09',
            mfgMonth: '2023-10',
            expMonth: '2025-09',
            reasonCode: 'ASSAY',
            reportingSource: 'CENTRAL_LAB',
            category: 'NSQ',
          },
        ],
        { PK: 'BATCH#a' },
      ),
      flaggedBatchesPage([
        {
          alertMonth: '2025-01',
          mfgMonth: null,
          expMonth: '2025-12',
          reasonCode: 'SPURIOUS',
          reportingSource: 'STATE_LAB',
          category: 'SPURIOUS',
        },
      ]),
    ];
    const cabinetPages = [
      { Items: [{ SK: 'META' }, { SK: 'MED#1' }], LastEvaluatedKey: { PK: 'CAB#a' } },
      { Items: [{ SK: 'MED#2' }, { SK: 'MEMBER#u1' }] },
    ];

    let flaggedCallIdx = 0;
    let cabinetCallIdx = 0;
    ddbMock.send.mockImplementation(async (cmd) => {
      if (cmd instanceof ScanCommand) {
        if (cmd.input.TableName === 'env-FLAGGED_BATCHES_TABLE') {
          return flaggedPages[flaggedCallIdx++];
        }
        if (cmd.input.TableName === 'env-CABINETS_TABLE') {
          return cabinetPages[cabinetCallIdx++];
        }
      }
      if (cmd instanceof PutCommand) {
        return {};
      }
      throw new Error(`unexpected command ${cmd.constructor.name}`);
    });

    const { handler } = await import('./compute-stats');
    const out = await handler();

    expect(out).toEqual({ rows: 2, months: 2 });

    const puts = ddbMock.send.mock.calls.map((c) => c[0]).filter((c) => c instanceof PutCommand);
    // STATS#IMPACT/ALL, STATS#IMPACT/2024-09, STATS#IMPACT/2025-01, STATS#PUBLIC/ALL
    expect(puts).toHaveLength(4);

    const impactAll = puts.find((p) => p.input.Item?.PK === 'STATS#IMPACT' && p.input.Item?.SK === 'ALL')!;
    expect(impactAll.input.Item?.document.rows).toBe(2);

    const impactSep = puts.find((p) => p.input.Item?.PK === 'STATS#IMPACT' && p.input.Item?.SK === '2024-09')!;
    expect(impactSep.input.Item?.document.rows).toBe(1);
    expect(impactSep.input.Item?.document.withinExpiry).toBe(1);

    const publicStats = puts.find((p) => p.input.Item?.PK === 'STATS#PUBLIC')!;
    expect(publicStats.input.Item?.document).toMatchObject({
      monthsCovered: 2,
      latestMonth: '2025-01',
      totalFlaggedBatches: 2,
      cabinetsProtected: 1,
      medicinesTracked: 2,
    });

    expect(s3Mock.send).toHaveBeenCalledTimes(1);
    const putObject = s3Mock.send.mock.calls[0]![0];
    expect(putObject).toBeInstanceOf(PutObjectCommand);
    expect(putObject.input.Bucket).toBe('env-RAW_BUCKET_NAME');
    expect(putObject.input.Key).toBe('stats/latest.json');
  });
});
