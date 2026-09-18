import { beforeEach, describe, expect, it, vi } from 'vitest';

const docSend = vi.fn();
const s3Send = vi.fn();

vi.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: vi.fn() }));
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: docSend }) },
  PutCommand: vi.fn((input: unknown) => ({ input, kind: 'put' })),
  ScanCommand: vi.fn((input: unknown) => ({ input, kind: 'scan' })),
}));
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: s3Send })),
  PutObjectCommand: vi.fn((input: unknown) => ({ input })),
}));

const FLAGGED_ROWS = [
  { manufacturerNorm: 'SUNRISE PHARMA', productName: 'Amoxicillin 500mg Capsules', rowHash: 'h1' },
  { manufacturerNorm: 'SUNRISE', productName: 'Amoxicillin 250mg Capsules', rowHash: 'h2' },
  { manufacturerNorm: 'GIDSHA', productName: 'Paracetamol 500mg Tablets', rowHash: 'h3' },
  { manufacturerNorm: 'ALPHA BETA LABS', productName: 'Paracetamol 650mg Tablets', rowHash: 'h4' },
  { manufacturerNorm: 'BETA GAMMA LABS', productName: 'Ibuprofen 400mg Tablets', rowHash: 'h5' },
];

describe('build-reference handler', () => {
  beforeEach(() => {
    docSend.mockReset().mockImplementation(async (command: { kind: string; input: unknown }) => {
      if (command.kind === 'scan') return { Items: FLAGGED_ROWS };
      return {};
    });
    s3Send.mockReset().mockResolvedValue({});
    process.env.FLAGGED_BATCHES_TABLE = 'asli-dev-a2-flagged-batches';
    process.env.REFERENCE_TABLE = 'asli-dev-a2-reference';
    process.env.RAW_BUCKET_NAME = 'asli-dev-a2-raw';
  });

  it('merges STRONG-similarity manufacturers into one alias group under the most-frequent canonical name', async () => {
    const { handler } = await import('./build-reference');
    const out = await handler();

    const aliasPuts = docSend.mock.calls
      .map(([command]) => command as { kind: string; input: { Item?: Record<string, unknown> } })
      .filter((c) => c.kind === 'put' && typeof c.input.Item?.PK === 'string' && (c.input.Item.PK as string).startsWith('MFR#'));

    // "SUNRISE PHARMA" and "SUNRISE" are STRONG-similar (one contained in the other) - one becomes an alias of the other.
    expect(aliasPuts).toHaveLength(1);
    const [alias] = aliasPuts;
    expect(['SUNRISE', 'SUNRISE PHARMA']).toContain((alias!.input.Item!.PK as string).replace('MFR#', ''));
    expect(out.aliasesWritten).toBe(1);
  });

  it('records WEAK-similarity pairs as uncertain rather than auto-merging them', async () => {
    const { handler } = await import('./build-reference');
    const out = await handler();
    expect(out.uncertainPairs).toBeGreaterThan(0);

    const reviewPut = s3Send.mock.calls[0]![0] as { input: { Key: string; Body: string } };
    expect(reviewPut.input.Key).toBe('reference/review/latest.json');
    const body = JSON.parse(reviewPut.input.Body);
    expect(
      body.uncertainPairs.some(
        (p: { a: string; b: string }) =>
          (p.a === 'ALPHA BETA LABS' && p.b === 'BETA GAMMA LABS') ||
          (p.b === 'ALPHA BETA LABS' && p.a === 'BETA GAMMA LABS'),
      ),
    ).toBe(true);
  });

  it('groups products by their leading brand token and writes a confidence-weighted BRAND#/MFR# candidate per manufacturer', async () => {
    const { handler } = await import('./build-reference');
    const out = await handler();

    const brandPuts = docSend.mock.calls
      .map(([command]) => command as { kind: string; input: { Item?: Record<string, unknown> } })
      .filter((c) => c.kind === 'put' && typeof c.input.Item?.PK === 'string' && (c.input.Item.PK as string).startsWith('BRAND#'));

    // Both Amoxicillin rows share brand "AMOXICILLIN" but have different (non-merged-by-alias) source manufacturers
    // once "SUNRISE"/"SUNRISE PHARMA" collapse to one - so exactly one BRAND#AMOXICILLIN candidate remains.
    const amoxicillinCandidates = brandPuts.filter((p) => p.input.Item!.PK === 'BRAND#AMOXICILLIN');
    expect(amoxicillinCandidates).toHaveLength(1);
    expect(amoxicillinCandidates[0]!.input.Item!.confidence).toBe(1);
    expect(out.brandCandidatesWritten).toBe(brandPuts.length);
  });
});
