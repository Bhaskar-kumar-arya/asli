import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: vi.fn(() => ({ send: vi.fn() })) } }));
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({ BedrockRuntimeClient: vi.fn() }));
vi.mock('@aws-sdk/client-ssm', () => ({ SSMClient: vi.fn() }));

const s3Send = vi.fn();
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: s3Send })),
  GetObjectCommand: vi.fn((input) => ({ input })),
  DeleteObjectCommand: vi.fn((input) => ({ input })),
}));

vi.mock('../rate-limit/limiter', () => ({
  checkAndIncrement: vi.fn(async () => undefined),
  RateLimitedError: class RateLimitedError extends Error {},
}));
vi.mock('@asli/lookup', () => ({ createLookup: vi.fn(() => ({})) }));
vi.mock('@asli/scan/src/reference/alias-map', () => ({ createAliasMapLoader: vi.fn(() => async () => ({})) }));
vi.mock('@asli/scan/src/reference/brand-candidates', () => ({ getBrandCandidates: vi.fn(async () => []) }));
vi.mock('@asli/scan/src/scans/model-id', () => ({ createModelIdLoader: vi.fn(() => async () => 'model-1') }));
vi.mock('@asli/scan/src/scans/bedrock-client', () => ({
  extractBill: vi.fn(async () => ({
    isPharmacyBill: true,
    lines: [
      {
        productName: 'Paracetamol',
        batchNumber: 'GTL1258',
        expDate: null,
        manufacturer: 'Cipla',
        quantity: 5,
        mrp: null,
        confidence: {},
      },
    ],
  })),
}));
vi.mock('@asli/scan/src/uploads/presign', () => ({ buildUploadKey: vi.fn((kind, userId, uploadId) => `${kind}/${userId}/${uploadId}`) }));
vi.mock('@asli/scan/src/check-item', () => ({
  checkIdentity: vi.fn(async (identity: { batchNumber: string }) => ({
    identity,
    tier: identity.batchNumber === 'FLAGME' ? 'FLAGGED' : 'NO_ALERT_FOUND',
    reasonCodes: [],
    matches: [],
    checkedAgainst: { monthCount: 1, latestMonth: '2026-01' },
    guidanceKey: 'result.no_alert_found',
  })),
}));

function baseEvent(overrides: Partial<APIGatewayProxyEventV2WithJWTAuthorizer> = {}): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { requestId: 'req-1', authorizer: { jwt: { claims: { sub: 'user-1' }, scopes: [] } } },
    body: JSON.stringify({ csv: 'batch,quantity\nGTL1258,2' }),
    isBase64Encoded: false,
    ...overrides,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe('pharmacy checks handler', () => {
  beforeEach(() => {
    process.env.FLAGGED_BATCHES_TABLE = 'flagged-batches';
    process.env.INGESTION_STATE_TABLE = 'ingestion-state';
    process.env.REFERENCE_TABLE = 'reference';
    process.env.UPLOADS_BUCKET = 'uploads';
    process.env.BEDROCK_VISION_MODEL_ID_PARAM = '/asli/dev/bedrock/visionModelId';
    s3Send.mockReset();
    vi.resetModules();
  });

  it('returns 200 with one row per CSV batch and computes flaggedUnits', async () => {
    const { handler } = await import('./handler');
    const result = await handler(baseEvent({ body: JSON.stringify({ csv: 'batch,quantity\nFLAGME,3' }) }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body ?? '{}');
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].tier).toBe('FLAGGED');
    expect(body.rows[0].quantity).toBe(3);
    expect(body.flaggedUnits).toBe(3);
  });

  it('returns RATE_LIMITED when the limiter throws', async () => {
    const { RateLimitedError } = await import('../rate-limit/limiter');
    const { checkAndIncrement } = await import('../rate-limit/limiter');
    vi.mocked(checkAndIncrement).mockRejectedValueOnce(new RateLimitedError('over limit'));

    const { handler } = await import('./handler');
    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(429);
    expect(JSON.parse(result.body ?? '{}').error.code).toBe('RATE_LIMITED');
  });

  it('returns BAD_REQUEST when the CSV has no batch rows', async () => {
    const { handler } = await import('./handler');
    const result = await handler(baseEvent({ body: JSON.stringify({ csv: 'batch\n' }) }));

    expect(result.statusCode).toBe(400);
  });

  it('extracts from an invoice photo when given an uploadId, then deletes the object', async () => {
    s3Send.mockResolvedValueOnce({ ContentType: 'image/jpeg', Body: { transformToByteArray: async () => new Uint8Array([1]) } });
    s3Send.mockResolvedValueOnce({});

    const { handler } = await import('./handler');
    const result = await handler(baseEvent({ body: JSON.stringify({ uploadId: 'upload-1' }) }));

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body ?? '{}');
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].identity.batchNumber).toBe('GTL1258');
    expect(s3Send).toHaveBeenCalledTimes(2);
  });
});
