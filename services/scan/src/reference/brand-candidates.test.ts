import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it, vi } from 'vitest';
import { getBrandCandidates, normalizeBrand } from './brand-candidates';

describe('normalizeBrand', () => {
  it('uppercases and strips non-alphanumeric characters', () => {
    expect(normalizeBrand('Dolo-650')).toBe('DOLO650');
  });
});

describe('getBrandCandidates', () => {
  it('queries by BRAND# and maps items to manufacturerNorm/confidence', async () => {
    let pk: unknown;
    const send = vi.fn(async (cmd: { input: { ExpressionAttributeValues?: Record<string, unknown> } }) => {
      pk = cmd.input.ExpressionAttributeValues?.[':pk'];
      return { Items: [{ PK: 'BRAND#DOLO650', SK: 'MFR#MICROLABS', confidence: 0.8 }] };
    });
    const ddb = { send } as unknown as DynamoDBDocumentClient;

    const candidates = await getBrandCandidates(ddb, 'reference', 'Dolo 650');

    expect(pk).toBe('BRAND#DOLO650');
    expect(candidates).toEqual([{ manufacturerNorm: 'MICROLABS', confidence: 0.8 }]);
  });

  it('returns [] without querying when the brand normalizes to empty', async () => {
    const send = vi.fn();
    const ddb = { send } as unknown as DynamoDBDocumentClient;

    const candidates = await getBrandCandidates(ddb, 'reference', '   ');

    expect(candidates).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });
});
