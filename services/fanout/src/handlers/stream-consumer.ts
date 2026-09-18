import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient, type AttributeValue } from '@aws-sdk/client-dynamodb';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { FlaggedBatchSchema, parseDynamoImage } from '@asli/contracts';
import { createLookup } from '@asli/lookup';
import { processFlaggedBatch } from '../fan-out';
import { createAliasMapLoader } from '../reference/alias-map';
import { requiredEnv } from '../ddb';
import { logger, metrics } from '../observability';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } });
const sns = new SNSClient({});

let loadAliases: (() => Promise<Record<string, string>>) | undefined;

export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  const flaggedBatchesTable = requiredEnv('FLAGGED_BATCHES_TABLE');
  const ingestionStateTable = requiredEnv('INGESTION_STATE_TABLE');
  const cabinetsTable = requiredEnv('CABINETS_TABLE');
  const referenceTable = requiredEnv('REFERENCE_TABLE');
  const alertsTopicArn = requiredEnv('ALERTS_TOPIC_ARN');

  const lookup = createLookup({ ddb, flaggedBatchesTable, ingestionStateTable });
  loadAliases ??= createAliasMapLoader({ ddb, referenceTable });

  const [aliases, checkedAgainst] = await Promise.all([loadAliases(), lookup.getCheckedAgainst()]);

  for (const record of event.Records) {
    if (record.eventName !== 'INSERT') continue;
    const row = parseDynamoImage(
      FlaggedBatchSchema,
      record.dynamodb?.NewImage as Record<string, AttributeValue> | undefined,
    );

    const alertEvents = await processFlaggedBatch(row, { ddb, cabinetsTable, aliases, checkedAgainst });

    for (const alertEvent of alertEvents) {
      await sns.send(
        new PublishCommand({
          TopicArn: alertsTopicArn,
          Message: JSON.stringify(alertEvent),
          MessageAttributes: {
            trigger: { DataType: 'String', StringValue: alertEvent.trigger },
            tier: { DataType: 'String', StringValue: alertEvent.tier },
          },
        }),
      );
    }

    logger.info('processed FlaggedBatches insert', {
      alertMonth: row.alertMonth,
      category: row.category,
      demo: row.demo,
      matchesNotified: alertEvents.length,
    });
  }

  metrics.publishStoredMetrics();
}
