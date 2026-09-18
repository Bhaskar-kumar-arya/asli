import { IdempotencyConfig, makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { requiredEnv } from './ddb';

let persistenceStore: DynamoDBPersistenceLayer | undefined;

function getPersistenceStore(): DynamoDBPersistenceLayer {
  persistenceStore ??= new DynamoDBPersistenceLayer({ tableName: requiredEnv('IDEMPOTENCY_TABLE_NAME') });
  return persistenceStore;
}

/**
 * Wraps `fn` so it runs at most once per (eventId, userId, channel) - docs/ALERTS.md
 * "Idempotency". Only those three fields feed the idempotency key (eventKeyJmesPath), so
 * extra payload fields (e.g. the full AlertEvent, passed for the actual send) don't affect it.
 */
export function withIdempotency<T extends { eventId: string; userId: string; channel: string }, R>(
  fn: (payload: T) => Promise<R>,
): (payload: T) => Promise<R> {
  return makeIdempotent(fn, {
    persistenceStore: getPersistenceStore(),
    config: new IdempotencyConfig({ eventKeyJmesPath: '[eventId, userId, channel]' }),
  });
}
