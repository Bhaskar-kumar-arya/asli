import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { PublicStats } from '@asli/contracts';
import { getDdb, requireEnv } from '../db';
import { jsonResponse } from '../http';

const EMPTY_STATS = (): PublicStats => ({
  generatedAt: new Date().toISOString(),
  monthsCovered: 0,
  latestMonth: new Date().toISOString().slice(0, 7),
  totalFlaggedBatches: 0,
  cabinetsProtected: 0,
  medicinesTracked: 0,
});

/** GET /v1/public/stats (docs/API.md, public - no JWT authorizer attached). */
export async function handler(): Promise<APIGatewayProxyStructuredResultV2> {
  const statsTable = requireEnv('STATS_TABLE');
  const res = await getDdb().send(new GetCommand({ TableName: statsTable, Key: { PK: 'STATS#PUBLIC', SK: 'ALL' } }));
  const document = res.Item?.document as PublicStats | undefined;
  return jsonResponse(200, document ?? EMPTY_STATS());
}
