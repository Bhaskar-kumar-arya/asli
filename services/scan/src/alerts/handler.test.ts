import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeAlertRef, flaggedBatchPk, flaggedBatchSk } from '@asli/contracts';

const sendMock = vi.fn();
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/lib-dynamodb')>('@aws-sdk/lib-dynamodb');
  return {
    ...actual,
    DynamoDBDocumentClient: { from: vi.fn(() => ({ send: sendMock })) },
  };
});

const alertRef = encodeAlertRef(flaggedBatchPk('GTL1258'), flaggedBatchSk('2025-03', 'NSQ', 'hash-1'));

const flaggedBatchItem = {
  PK: 'BATCH#GTL1258',
  SK: 'ALERT#2025-03#NSQ#hash-1',
  productName: 'Amoxicillin 500mg Capsules',
  batchRaw: 'GTL 1258',
  batchNorm: 'GTL1258',
  batchSkeleton: '6T11258',
  mfgMonth: null,
  expMonth: '2026-10',
  manufacturerRaw: 'M/s. Gidsha Pharmaceuticals Pvt. Ltd.',
  manufacturerNorm: 'GIDSHA',
  category: 'NSQ',
  reasonRaw: 'Assay (content of the drug) found outside limits',
  reasonCode: 'ASSAY',
  reportingSource: 'STATE_LAB',
  reportingLab: 'State Drug Testing Laboratory, Chandigarh',
  alertMonth: '2025-03',
  sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Mar-2025&source=All&tab=nsq',
  snapshotKey: 'raw/cdsco/endpoint/2025-03/nsq/hash-1.html',
  rowHash: 'hash-1',
  alertId: 'hash-1',
  ingestedAt: '2025-03-05T06:00:00.000Z',
  demo: false,
};

function baseEvent(overrides: Partial<APIGatewayProxyEventV2WithJWTAuthorizer> = {}): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { requestId: 'req-1', authorizer: { jwt: { claims: { sub: 'user-1' }, scopes: [] } } },
    pathParameters: { alertRef },
    ...overrides,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe('alerts handler', () => {
  beforeEach(() => {
    process.env.FLAGGED_BATCHES_TABLE = 'flagged-batches';
    sendMock.mockReset();
  });

  it('returns AlertDetail for a known alertRef, always with sourceUrl and reportingSource', async () => {
    sendMock.mockResolvedValueOnce({ Item: flaggedBatchItem });
    const { handler } = await import('./handler');

    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body ?? '{}');
    expect(body.sourceUrl).toBe(flaggedBatchItem.sourceUrl);
    expect(body.reportingSource).toBe('STATE_LAB');
    expect(body.snapshotKey).toBe(flaggedBatchItem.snapshotKey);
  });

  it('returns NOT_FOUND when the item does not exist', async () => {
    sendMock.mockResolvedValueOnce({ Item: undefined });
    const { handler } = await import('./handler');

    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(404);
  });

  it('returns BAD_REQUEST for a malformed alertRef', async () => {
    const { handler } = await import('./handler');

    const result = await handler(baseEvent({ pathParameters: { alertRef: 'not-base64url!!' } }));

    expect(result.statusCode).toBe(400);
  });
});
