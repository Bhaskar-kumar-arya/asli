import { marshall } from '@aws-sdk/util-dynamodb';
import type { AttributeValue, DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.CABINETS_TABLE_NAME = 'asli-dev-f-cabinets';
process.env.FLAGGED_BATCHES_TABLE_NAME = 'asli-dev-f-flagged-batches';
process.env.INGESTION_STATE_TABLE_NAME = 'asli-dev-f-ingestion-state';
process.env.ALERTS_TOPIC_ARN = 'arn:aws:sns:ap-south-1:123:asli-dev-f-alerts';

const runRetroactiveCheck = vi.fn().mockResolvedValue({ latestTier: 'FLAGGED', newMatchCount: 1 });
vi.mock('../check', () => ({ runRetroactiveCheck }));

const ddbSend = vi.fn().mockResolvedValue({ Items: [] });
const snsSend = vi.fn().mockResolvedValue({});
vi.mock('../db', () => ({
  getDdb: () => ({ send: ddbSend }),
  getSns: () => ({ send: snsSend }),
  cabinetsTableName: () => 'asli-dev-f-cabinets',
  flaggedBatchesTableName: () => 'asli-dev-f-flagged-batches',
  ingestionStateTableName: () => 'asli-dev-f-ingestion-state',
  alertsTopicArn: () => 'arn:aws:sns:ap-south-1:123:asli-dev-f-alerts',
}));

function medicineInsertRecord(cabinetId: string, medId: string): DynamoDBRecord {
  return {
    eventID: '1',
    eventName: 'INSERT',
    eventVersion: '1.1',
    eventSource: 'aws:dynamodb',
    awsRegion: 'ap-south-1',
    dynamodb: {
      NewImage: marshall({
        PK: `CAB#${cabinetId}`,
        SK: `MED#${medId}`,
        identity: { batchNumber: 'GTL1258', manufacturer: 'Gidsha', source: 'manual' },
        addedBy: 'u1',
        addedAt: '2026-01-01T00:00:00.000Z',
        latestTier: 'PENDING',
        GSI3PK: 'SKEL#6T11258',
        GSI3SK: `CAB#${cabinetId}#MED#${medId}`,
      }) as unknown as Record<string, AttributeValue>,
    },
    eventSourceARN: 'arn:aws:dynamodb:ap-south-1:123:table/asli-dev-f-cabinets/stream/2026-01-01T00:00:00.000',
  };
}

describe('retroactive-check stream consumer', () => {
  beforeEach(() => {
    runRetroactiveCheck.mockClear();
  });

  it('runs the retroactive check for each MED# INSERT record', async () => {
    const { handler } = await import('./retroactive-check');
    const event: DynamoDBStreamEvent = { Records: [medicineInsertRecord('cab1', 'med1')] };

    await handler(event);

    expect(runRetroactiveCheck).toHaveBeenCalledTimes(1);
    const call = runRetroactiveCheck.mock.calls[0]![0];
    expect(call.cabinetId).toBe('cab1');
    expect(call.medId).toBe('med1');
    expect(call.trigger).toBe('RETROACTIVE');
    expect(call.identity.batchNumber).toBe('GTL1258');
  });

  it('ignores non-INSERT records', async () => {
    const { handler } = await import('./retroactive-check');
    const record = medicineInsertRecord('cab1', 'med1');
    const event: DynamoDBStreamEvent = { Records: [{ ...record, eventName: 'MODIFY' as const }] };

    await handler(event);

    expect(runRetroactiveCheck).not.toHaveBeenCalled();
  });
});
