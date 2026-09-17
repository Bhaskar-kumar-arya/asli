import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Per-user rate limiting (docs/API.md: scans 30/hour, checks 120/hour, pharmacy 10/hour).
 * One DynamoDB item per user+route+hour-bucket, incremented atomically with a
 * TTL so old buckets expire on their own - no separate cleanup job needed.
 * Stored in the Reference table under a lane-C-owned key prefix (RATE#) so it
 * doesn't collide with T02's MFR#/BRAND#/REASON# prefixes.
 */
export interface RateLimitDeps {
  ddb: DynamoDBDocumentClient;
  referenceTable: string;
  now?: () => number;
}

export class RateLimitedError extends Error {}

const WINDOW_SECONDS = 3600;
const TTL_GRACE_SECONDS = 60;

export async function checkAndIncrement(deps: RateLimitDeps, userId: string, route: string, limit: number): Promise<void> {
  const now = deps.now?.() ?? Date.now();
  const bucket = Math.floor(now / 1000 / WINDOW_SECONDS);
  const pk = `RATE#${userId}#${route}`;
  const sk = `BUCKET#${bucket}`;
  const expiration = bucket * WINDOW_SECONDS + WINDOW_SECONDS + TTL_GRACE_SECONDS;

  const result = await deps.ddb.send(
    new UpdateCommand({
      TableName: deps.referenceTable,
      Key: { PK: pk, SK: sk },
      UpdateExpression: 'ADD #count :one SET expiration = if_not_exists(expiration, :expiration)',
      ExpressionAttributeNames: { '#count': 'count' },
      ExpressionAttributeValues: { ':one': 1, ':expiration': expiration },
      ReturnValues: 'UPDATED_NEW',
    }),
  );

  const count = (result.Attributes?.count as number | undefined) ?? 0;
  if (count > limit) {
    throw new RateLimitedError(`rate limit exceeded for ${route}`);
  }
}
