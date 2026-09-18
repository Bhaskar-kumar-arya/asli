import { makeIdempotent, IdempotencyConfig } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

/**
 * CLAUDE.md: "every write that can be retried uses a deterministic key or
 * conditional write." Cabinet/medicine creation generate their own IDs
 * server-side, so a bare retry would duplicate them - wrap with Powertools
 * Idempotency, keyed on a client-supplied `Idempotency-Key` header (standard
 * REST idempotency-key pattern). Requests without the header just run normally
 * (`throwOnNoIdempotencyKey: false`) rather than failing closed.
 */
export function withIdempotency(
  fn: (event: APIGatewayProxyEventV2WithJWTAuthorizer) => Promise<APIGatewayProxyStructuredResultV2>,
) {
  const persistenceStore = new DynamoDBPersistenceLayer({ tableName: idempotencyTableName() });
  const config = new IdempotencyConfig({
    eventKeyJmesPath: 'headers."idempotency-key"',
    throwOnNoIdempotencyKey: false,
  });
  return makeIdempotent(fn, { persistenceStore, config });
}

function idempotencyTableName(): string {
  const name = process.env.IDEMPOTENCY_TABLE_NAME;
  if (!name) throw new Error('IDEMPOTENCY_TABLE_NAME env var is required');
  return name;
}
