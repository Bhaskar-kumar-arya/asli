import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { CheckRequestSchema } from '@asli/contracts';
import { createLookup } from '@asli/lookup';
import { checkIdentity } from '../check-item';
import { ApiError, jsonResponse, parseJsonBody, requireUserId, withErrorHandling } from '../http';
import { logEvent } from '../logging';
import { metrics } from '../metrics';
import { checkAndIncrement, RateLimitedError } from '../rate-limit/limiter';
import { createAliasMapLoader } from '../reference/alias-map';
import type { AliasMap } from '@asli/matching';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const flaggedBatchesTable = process.env.FLAGGED_BATCHES_TABLE;
const ingestionStateTable = process.env.INGESTION_STATE_TABLE;
const referenceTable = process.env.REFERENCE_TABLE;

/** docs/API.md rate limit: 120 checks/hour per user. */
const CHECKS_PER_HOUR = 120;

let loadAliases: (() => Promise<AliasMap>) | undefined;

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  return withErrorHandling(event, async () => {
    if (!flaggedBatchesTable || !ingestionStateTable || !referenceTable) {
      throw new Error('FLAGGED_BATCHES_TABLE, INGESTION_STATE_TABLE and REFERENCE_TABLE env vars are required');
    }
    const userId = requireUserId(event);
    const body = CheckRequestSchema.parse(parseJsonBody(event));

    try {
      await checkAndIncrement({ ddb, referenceTable }, userId, 'checks', CHECKS_PER_HOUR);
    } catch (err) {
      if (err instanceof RateLimitedError) throw new ApiError('RATE_LIMITED', 'too many checks this hour');
      throw err;
    }

    const lookup = createLookup({ ddb, flaggedBatchesTable, ingestionStateTable });
    loadAliases ??= createAliasMapLoader({ ddb, referenceTable });
    const aliases = await loadAliases();

    const results = await Promise.all(body.items.map((identity) => checkIdentity(identity, { lookup, aliases })));
    metrics.publishStoredMetrics();

    logEvent('checks completed', { requestId: event.requestContext.requestId, route: 'checks', itemCount: results.length });
    return jsonResponse(200, { results });
  });
}
