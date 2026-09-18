import { describe, expect, it, vi } from 'vitest';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { loadAliasMap } from './aliases';

function fakeDoc(pages: Array<{ Items: unknown[]; LastEvaluatedKey?: Record<string, unknown> }>): DynamoDBDocumentClient {
  let call = 0;
  return { send: vi.fn(async () => pages[call++]) } as unknown as DynamoDBDocumentClient;
}

describe('loadAliasMap', () => {
  it('turns MFR#<canonical>/ALIAS#<alias> Reference rows into an AliasMap', async () => {
    const doc = fakeDoc([
      {
        Items: [
          { PK: 'MFR#SUNRISE', SK: 'ALIAS#SUNRISE PHARMA' },
          { PK: 'MFR#GIDSHA', SK: 'ALIAS#GIDSHA PHARMACEUTICALS' },
        ],
      },
    ]);

    const map = await loadAliasMap(doc, 'asli-dev-a2-reference');

    expect(map).toEqual({
      'SUNRISE PHARMA': 'SUNRISE',
      'GIDSHA PHARMACEUTICALS': 'GIDSHA',
    });
  });

  it('pages through the full table via ExclusiveStartKey/LastEvaluatedKey', async () => {
    const doc = fakeDoc([
      { Items: [{ PK: 'MFR#A', SK: 'ALIAS#A1' }], LastEvaluatedKey: { PK: 'x' } },
      { Items: [{ PK: 'MFR#B', SK: 'ALIAS#B1' }] },
    ]);

    const map = await loadAliasMap(doc, 'table');
    expect(map).toEqual({ A1: 'A', B1: 'B' });
    expect(doc.send).toHaveBeenCalledTimes(2);
  });

  it('returns an empty map when Reference has no alias rows yet', async () => {
    const doc = fakeDoc([{ Items: [] }]);
    const map = await loadAliasMap(doc, 'table');
    expect(map).toEqual({});
  });
});
