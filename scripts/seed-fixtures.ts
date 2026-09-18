#!/usr/bin/env tsx
/**
 * Loads packages/contracts/fixtures/*.json into a stage's DynamoDB tables.
 * Idempotent: conditional put on attribute_not_exists(PK), matching docs/DATA_MODEL.md
 * ("Writes: conditional put ... so reruns never duplicate").
 *
 * Usage: pnpm seed-fixtures --stage dev-shared
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  flaggedBatchGsi1Pk,
  flaggedBatchGsi1Sk,
  flaggedBatchGsi2Pk,
  flaggedBatchGsi2Sk,
  flaggedBatchPk,
  flaggedBatchSk,
  type FlaggedBatch,
} from '@asli/contracts';
import cabinetsFixture from '../packages/contracts/fixtures/cabinets.json' with { type: 'json' };
import flaggedBatchesFixture from '../packages/contracts/fixtures/flagged-batches.json' with { type: 'json' };
import statsFixture from '../packages/contracts/fixtures/stats.json' with { type: 'json' };

function parseStage(): string {
  const idx = process.argv.indexOf('--stage');
  const stage = idx !== -1 ? process.argv[idx + 1] : undefined;
  if (!stage) {
    throw new Error('Usage: pnpm seed-fixtures --stage <stage>');
  }
  return stage;
}

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-south-1' }));

async function putIdempotent(tableName: string, item: Record<string, unknown>): Promise<void> {
  try {
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
      }),
    );
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return; // already seeded
    }
    throw err;
  }
}

async function seedFlaggedBatches(stage: string): Promise<number> {
  const tableName = `asli-${stage}-flagged-batches`;
  const rows = flaggedBatchesFixture as FlaggedBatch[];
  for (const row of rows) {
    const item = {
      ...row,
      PK: flaggedBatchPk(row.batchNorm),
      SK: flaggedBatchSk(row.alertMonth, row.category, row.rowHash),
      GSI1PK: flaggedBatchGsi1Pk(row.batchSkeleton),
      GSI1SK: flaggedBatchGsi1Sk(row.alertMonth, row.rowHash),
      GSI2PK: flaggedBatchGsi2Pk(row.alertMonth),
      GSI2SK: flaggedBatchGsi2Sk(row.category, row.rowHash),
    };
    await putIdempotent(tableName, item);
  }
  return rows.length;
}

async function seedCabinets(stage: string): Promise<number> {
  const tableName = `asli-${stage}-cabinets`;
  const groups = [
    cabinetsFixture.cabinets,
    cabinetsFixture.members,
    cabinetsFixture.invites,
    cabinetsFixture.medicines,
    cabinetsFixture.matches,
  ];
  let count = 0;
  for (const group of groups) {
    for (const item of group) {
      await putIdempotent(tableName, item);
      count += 1;
    }
  }
  return count;
}

async function seedStats(stage: string): Promise<number> {
  const tableName = `asli-${stage}-stats`;
  for (const item of statsFixture) {
    await putIdempotent(tableName, item);
  }
  return statsFixture.length;
}

async function main(): Promise<void> {
  const stage = parseStage();
  const flaggedCount = await seedFlaggedBatches(stage);
  console.log(`Seeded ${flaggedCount} rows into asli-${stage}-flagged-batches`);
  const cabinetsCount = await seedCabinets(stage);
  console.log(`Seeded ${cabinetsCount} items into asli-${stage}-cabinets`);
  const statsCount = await seedStats(stage);
  console.log(`Seeded ${statsCount} items into asli-${stage}-stats`);
  console.log(
    'Note: alert-events.json and scan-responses.json are message/API fixtures, not table rows - not seeded here.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
