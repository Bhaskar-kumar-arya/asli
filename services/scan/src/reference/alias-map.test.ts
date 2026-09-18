import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it, vi } from 'vitest';
import { createAliasMapLoader } from './alias-map';

describe('createAliasMapLoader', () => {
  it('builds aliasNorm -> canonical from MFR#/ALIAS# items, ignoring other reference items', async () => {
    const send = vi.fn(async () => ({
      Items: [
        { PK: 'MFR#CIPLA', SK: 'ALIAS#CIPLALTD' },
        { PK: 'MFR#CIPLA', SK: 'ALIAS#CIPLAPHARMA' },
        { PK: 'BRAND#DOLO', SK: 'MFR#MICROLABS' },
      ],
    }));
    const ddb = { send } as unknown as DynamoDBDocumentClient;
    const load = createAliasMapLoader({ ddb, referenceTable: 'reference' });

    const aliases = await load();

    expect(aliases).toEqual({ CIPLALTD: 'CIPLA', CIPLAPHARMA: 'CIPLA' });
  });

  it('caches for 5 minutes', async () => {
    let calls = 0;
    const send = vi.fn(async () => {
      calls += 1;
      return { Items: [] };
    });
    const ddb = { send } as unknown as DynamoDBDocumentClient;
    let time = 0;
    const load = createAliasMapLoader({ ddb, referenceTable: 'reference', now: () => time });

    await load();
    time += 4 * 60 * 1000;
    await load();
    expect(calls).toBe(1);

    time += 2 * 60 * 1000;
    await load();
    expect(calls).toBe(2);
  });
});
