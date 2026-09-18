import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ingestionStatePk, ingestionStateSk } from '@asli/contracts';
import { createDocClient } from '../lib/ddb';
import { requireEnv } from '../lib/env';
import type { WorkItem } from './types';

const doc = createDocClient();

export async function handler(event: WorkItem): Promise<WorkItem> {
  const tableName = requireEnv('INGESTION_STATE_TABLE');

  await doc.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: ingestionStatePk(event.month),
        SK: ingestionStateSk(event.tab),
        status: 'RUNNING',
        sourceType: event.sourceType,
        rowCount: 0,
        snapshotKeys: [],
        updatedAt: new Date().toISOString(),
      },
    }),
  );

  return event;
}
