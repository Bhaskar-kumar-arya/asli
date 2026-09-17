import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { FlaggedBatchSchema, decodeAlertRef } from '@asli/contracts';
import type { AlertDetail } from '@asli/contracts';
import { ApiError, jsonResponse, requireUserId, withErrorHandling } from '../http';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const flaggedBatchesTable = process.env.FLAGGED_BATCHES_TABLE;

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  return withErrorHandling(event, async () => {
    if (!flaggedBatchesTable) throw new Error('FLAGGED_BATCHES_TABLE env var is required');
    requireUserId(event);

    const alertRef = event.pathParameters?.alertRef;
    if (!alertRef) throw new ApiError('BAD_REQUEST', 'alertRef path parameter is required');

    let key: { pk: string; sk: string };
    try {
      key = decodeAlertRef(alertRef);
    } catch {
      throw new ApiError('BAD_REQUEST', 'malformed alertRef');
    }

    const result = await ddb.send(new GetCommand({ TableName: flaggedBatchesTable, Key: { PK: key.pk, SK: key.sk } }));
    if (!result.Item) throw new ApiError('NOT_FOUND', 'alert not found');

    const candidate = FlaggedBatchSchema.parse(result.Item);
    const detail: AlertDetail = {
      alertRef,
      alertMonth: candidate.alertMonth,
      category: candidate.category,
      productName: candidate.productName,
      batchRaw: candidate.batchRaw,
      manufacturerRaw: candidate.manufacturerRaw,
      mfgMonth: candidate.mfgMonth ?? undefined,
      expMonth: candidate.expMonth ?? undefined,
      reasonCode: candidate.reasonCode,
      reasonRaw: candidate.reasonRaw,
      reportingSource: candidate.reportingSource,
      reportingLab: candidate.reportingLab,
      sourceUrl: candidate.sourceUrl,
      demo: candidate.demo,
      snapshotKey: candidate.snapshotKey,
      ingestedAt: candidate.ingestedAt,
    };
    return jsonResponse(200, detail);
  });
}
