import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import scanResponseFixtures from '../../../../packages/contracts/fixtures/scan-responses.json' with { type: 'json' };
import type { CheckItemResult, ExtractedItem } from '@asli/contracts';

const sendMock = vi.fn();
vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: vi.fn(() => ({ send: sendMock })) } }));
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({ BedrockRuntimeClient: vi.fn() }));
vi.mock('@aws-sdk/client-textract', () => ({ TextractClient: vi.fn() }));
vi.mock('@aws-sdk/client-secrets-manager', () => ({ SecretsManagerClient: vi.fn(), GetSecretValueCommand: vi.fn((input) => ({ input })) }));
vi.mock('@aws-sdk/client-ssm', () => ({ SSMClient: vi.fn(), GetParameterCommand: vi.fn((input) => ({ input })) }));
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  GetObjectCommand: vi.fn((input) => ({ input })),
  DeleteObjectCommand: vi.fn((input) => ({ input })),
}));

vi.mock('../rate-limit/limiter', () => ({
  checkAndIncrement: vi.fn(async () => undefined),
  RateLimitedError: class RateLimitedError extends Error {},
}));
vi.mock('../reference/alias-map', () => ({ createAliasMapLoader: vi.fn(() => async () => ({})) }));
vi.mock('../reference/brand-candidates', () => ({ getBrandCandidates: vi.fn(async () => []) }));
vi.mock('@asli/lookup', () => ({ createLookup: vi.fn(() => ({})) }));
vi.mock('./model-id', () => ({ createModelIdLoader: vi.fn(() => async () => 'model-1') }));
vi.mock('./extraction-provider', () => ({ createExtractionProviderLoader: vi.fn(() => async () => 'bedrock') }));

const extractStripMock = vi.fn();
const extractBillMock = vi.fn();
vi.mock('./bedrock-client', () => ({
  createBedrockExtractor: () => ({
    extractStrip: (...args: unknown[]) => extractStripMock(...args),
    extractBill: (...args: unknown[]) => extractBillMock(...args),
  }),
}));

const checkIdentityMock = vi.fn();
vi.mock('../check-item', () => ({ checkIdentity: (...args: unknown[]) => checkIdentityMock(...args) }));

function baseEvent(kind: 'strip' | 'bill'): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: { requestId: 'req-1', authorizer: { jwt: { claims: { sub: 'user-1' }, scopes: [] } } },
    body: JSON.stringify({ uploadId: 'upload-1', kind }),
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

function stripExtractionFromItem(item: ExtractedItem) {
  return {
    isMedicinePack: true,
    productName: item.productName ?? null,
    brandName: item.brandName ?? null,
    batchNumber: item.batchNumber,
    manufacturer: item.manufacturer ?? null,
    mfgDate: null,
    expDate: null,
    strength: null,
    dosageForm: null,
    mrp: null,
    confidence: {
      batchNumber: item.fieldConfidence?.batchNumber,
      manufacturer: item.fieldConfidence?.manufacturer,
      productName: item.fieldConfidence?.productName,
    },
    notes: null,
  };
}

function billExtractionFromItem(item: ExtractedItem) {
  return {
    isPharmacyBill: true,
    lines: [
      {
        productName: item.productName ?? null,
        batchNumber: item.batchNumber,
        expDate: null,
        manufacturer: item.manufacturer ?? null,
        quantity: null,
        mrp: null,
        confidence: {
          batchNumber: item.fieldConfidence?.batchNumber,
          manufacturer: item.fieldConfidence?.manufacturer,
          productName: item.fieldConfidence?.productName,
        },
      },
    ],
  };
}

function s3ObjectFor(bytes: Uint8Array, contentType: string) {
  return { ContentType: contentType, Body: { transformToByteArray: async () => bytes } };
}

describe('scans handler', () => {
  beforeEach(() => {
    process.env.FLAGGED_BATCHES_TABLE = 'flagged-batches';
    process.env.INGESTION_STATE_TABLE = 'ingestion-state';
    process.env.REFERENCE_TABLE = 'reference';
    process.env.UPLOADS_BUCKET = 'uploads';
    process.env.BEDROCK_VISION_MODEL_ID_PARAM = '/asli/dev-c/bedrock/visionModelId';
    process.env.EXTRACTION_PROVIDER_PARAM = '/asli/dev-c/scan/extractionProvider';
    process.env.GEMINI_MODEL_ID_PARAM = '/asli/dev-c/scan/geminiModelId';
    process.env.GEMINI_API_KEY_SECRET_ARN = 'arn:aws:secretsmanager:ap-south-1:000000000000:secret:asli/dev-c/gemini-api-key';
    vi.resetModules();
    vi.clearAllMocks();
    extractStripMock.mockReset();
    extractBillMock.mockReset();
    checkIdentityMock.mockReset();
  });

  const fixtures = scanResponseFixtures as unknown as {
    state: string;
    response: { method: string; items: ExtractedItem[]; results: CheckItemResult[]; warnings: string[] };
  }[];

  for (const fixture of fixtures) {
    it(`matches the ${fixture.state} fixture`, async () => {
      const { S3Client } = await import('@aws-sdk/client-s3');
      const s3Instance = { send: vi.fn(async () => s3ObjectFor(new Uint8Array([1, 2, 3]), 'image/jpeg')) };
      vi.mocked(S3Client).mockImplementation(() => s3Instance as never);

      const kind = fixture.response.method === 'bill_vision' ? 'bill' : 'strip';
      const item = fixture.response.items[0];

      if (kind === 'strip') {
        extractStripMock.mockResolvedValue(item ? stripExtractionFromItem(item) : null);
      } else {
        extractBillMock.mockResolvedValue(item ? billExtractionFromItem(item) : { isPharmacyBill: true, lines: [] });
      }
      if (fixture.state === 'NOT_A_MEDICINE_PHOTO') {
        extractStripMock.mockResolvedValue({
          isMedicinePack: false,
          productName: null,
          brandName: null,
          batchNumber: null,
          manufacturer: null,
          mfgDate: null,
          expDate: null,
          strength: null,
          dosageForm: null,
          mrp: null,
          confidence: {},
          notes: null,
        });
      }

      checkIdentityMock.mockImplementation(async () => fixture.response.results[0]);

      const { handler } = await import('./handler');
      const result = await handler(baseEvent(kind));

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body ?? '{}');
      expect(body.method).toBe(fixture.response.method);
      expect(body.items).toEqual(fixture.response.items);
      expect(body.results).toEqual(fixture.response.results);
      expect(body.warnings.slice().sort()).toEqual([...fixture.response.warnings].sort());
    });
  }

  it('deletes the S3 object for a bill scan, success or failure', async () => {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Instance = { send: vi.fn(async () => s3ObjectFor(new Uint8Array([1]), 'image/jpeg')) };
    vi.mocked(S3Client).mockImplementation(() => s3Instance as never);
    extractBillMock.mockResolvedValue(null);

    const { handler } = await import('./handler');
    await handler(baseEvent('bill'));

    expect(DeleteObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Bucket: 'uploads' }));
    expect(s3Instance.send).toHaveBeenCalledWith(expect.objectContaining({ input: expect.objectContaining({ Bucket: 'uploads' }) }));
  });

  it('does not delete the strip object (relies on the bucket lifecycle rule)', async () => {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const s3Instance = { send: vi.fn(async () => s3ObjectFor(new Uint8Array([1]), 'image/jpeg')) };
    vi.mocked(S3Client).mockImplementation(() => s3Instance as never);
    extractStripMock.mockResolvedValue(null);

    const { handler } = await import('./handler');
    await handler(baseEvent('strip'));

    expect(DeleteObjectCommand).not.toHaveBeenCalled();
  });

  it('returns RATE_LIMITED when the limiter throws', async () => {
    const { S3Client } = await import('@aws-sdk/client-s3');
    vi.mocked(S3Client).mockImplementation(() => ({ send: vi.fn() }) as never);
    const { RateLimitedError, checkAndIncrement } = await import('../rate-limit/limiter');
    vi.mocked(checkAndIncrement).mockRejectedValueOnce(new RateLimitedError('over limit'));

    const { handler } = await import('./handler');
    const result = await handler(baseEvent('strip'));

    expect(result.statusCode).toBe(429);
  });
});
