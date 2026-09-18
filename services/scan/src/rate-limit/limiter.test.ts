import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it, vi } from 'vitest';
import { checkAndIncrement, RateLimitedError } from './limiter';

function fakeDdb(counts: number[]): DynamoDBDocumentClient {
  let call = 0;
  const send = vi.fn(async (cmd: UpdateCommand) => {
    void cmd;
    const count = counts[call] ?? counts.at(-1) ?? 0;
    call += 1;
    return { Attributes: { count } };
  });
  return { send } as unknown as DynamoDBDocumentClient;
}

describe('checkAndIncrement', () => {
  it('allows requests at or under the limit', async () => {
    const ddb = fakeDdb([1, 2, 3]);
    const deps = { ddb, referenceTable: 'reference' };
    await expect(checkAndIncrement(deps, 'user-1', 'scans', 3)).resolves.toBeUndefined();
    await expect(checkAndIncrement(deps, 'user-1', 'scans', 3)).resolves.toBeUndefined();
    await expect(checkAndIncrement(deps, 'user-1', 'scans', 3)).resolves.toBeUndefined();
  });

  it('throws RateLimitedError once the count exceeds the limit', async () => {
    const ddb = fakeDdb([31]);
    const deps = { ddb, referenceTable: 'reference' };
    await expect(checkAndIncrement(deps, 'user-1', 'scans', 30)).rejects.toBeInstanceOf(RateLimitedError);
  });

  it('keys the counter by user, route and hour bucket', async () => {
    let key: unknown;
    const send = vi.fn(async (cmd: UpdateCommand) => {
      key = cmd.input.Key;
      return { Attributes: { count: 1 } };
    });
    const ddb = { send } as unknown as DynamoDBDocumentClient;
    const now = () => Date.UTC(2026, 0, 1, 10, 30, 0);

    await checkAndIncrement({ ddb, referenceTable: 'reference', now }, 'user-1', 'scans', 30);

    expect(key).toMatchObject({ PK: 'RATE#user-1#scans' });
    expect((key as { SK: string }).SK).toMatch(/^BUCKET#\d+$/);
  });
});
