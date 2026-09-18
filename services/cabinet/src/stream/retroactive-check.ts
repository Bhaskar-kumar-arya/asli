import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { MedicineItemSchema, parseDynamoImage } from '@asli/contracts';
import { runRetroactiveCheck } from '../check';
import {
  alertsTopicArn,
  cabinetsTableName,
  flaggedBatchesTableName,
  getDdb,
  getSns,
  ingestionStateTableName,
} from '../db';
import { createCabinetRepo, createMatchLookupRepo } from '../repo';

const repo = createCabinetRepo({ ddb: getDdb(), tableName: cabinetsTableName() });
const lookup = createMatchLookupRepo({
  ddb: getDdb(),
  flaggedBatchesTableName: flaggedBatchesTableName(),
  ingestionStateTableName: ingestionStateTableName(),
});

/**
 * docs/ALERTS.md "Retroactive check (F)". The event source mapping's filter
 * criteria (infra/lib/lanes/f-cabinet.ts) restricts this to INSERTs on `MED#`
 * items, so every record here is a newly saved medicine.
 */
export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  const sns = getSns();
  const topicArn = alertsTopicArn();

  for (const record of event.Records) {
    if (record.eventName !== 'INSERT') continue;
    const image = record.dynamodb?.NewImage;
    if (!image) continue;

    const item = parseDynamoImage(MedicineItemSchema, image as unknown as Record<string, AttributeValue>);
    const cabinetId = item.PK.slice('CAB#'.length);
    const medId = item.SK.slice('MED#'.length);

    await runRetroactiveCheck({
      repo,
      lookup,
      sns,
      alertsTopicArn: topicArn,
      trigger: 'RETROACTIVE',
      cabinetId,
      medId,
      medicineLabel: item.label,
      identity: item.identity,
      now: new Date().toISOString(),
    });
  }
}
