import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { ingestionStatePk, ingestionStateSk } from '@asli/contracts';
import { createDocClient } from '../lib/ddb';
import { requireEnv } from '../lib/env';
import type { MarkFailedInput } from './types';

const doc = createDocClient();
const sns = new SNSClient({});
const metrics = new Metrics({ namespace: 'Asli' });

export interface MarkFailedOutput {
  month: string;
  tab: string;
  status: 'FAILED';
}

/**
 * Terminal state for a failed month/tab (docs/OBSERVABILITY_AND_COST.md
 * "IngestionFailed" alarm fires off the ops-topic publish this does, not off
 * this Lambda's own error rate - this handler must never throw, or the Map
 * iteration it's meant to cleanly end would itself fail).
 */
export async function handler(event: MarkFailedInput): Promise<MarkFailedOutput> {
  const tableName = requireEnv('INGESTION_STATE_TABLE');
  const opsTopicArn = requireEnv('OPS_TOPIC_ARN');
  const errorMessage = (event.error?.Cause ?? event.reason ?? 'Unknown ingestion failure').slice(0, 1000);

  await doc.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: ingestionStatePk(event.month),
        SK: ingestionStateSk(event.tab),
        status: 'FAILED',
        sourceType: event.sourceType,
        rowCount: 0,
        snapshotKeys: [],
        error: errorMessage,
        updatedAt: new Date().toISOString(),
      },
    }),
  );

  await sns.send(
    new PublishCommand({
      TopicArn: opsTopicArn,
      Subject: `Asli ingestion FAILED: ${event.month} ${event.tab}`.slice(0, 100),
      Message: `Ingestion for month=${event.month} tab=${event.tab} sourceType=${event.sourceType} failed: ${errorMessage}`,
    }),
  );

  metrics.addDimension('sourceType', event.sourceType);
  metrics.addMetric('IngestionFailed', MetricUnit.Count, 1);
  metrics.publishStoredMetrics();

  return { month: event.month, tab: event.tab, status: 'FAILED' };
}
