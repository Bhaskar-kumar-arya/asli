import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { ingestionStatePk, ingestionStateSk } from '@asli/contracts';
import { createDocClient } from '../lib/ddb';
import { requireEnv } from '../lib/env';
import type { NormalizedWork } from './types';

const doc = createDocClient();

export interface MarkDoneOutput {
  month: string;
  tab: string;
  status: 'DONE';
}

export async function handler(event: NormalizedWork): Promise<MarkDoneOutput> {
  const tableName = requireEnv('INGESTION_STATE_TABLE');

  await doc.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: ingestionStatePk(event.month),
        SK: ingestionStateSk(event.tab),
        status: 'DONE',
        sourceType: event.sourceType,
        rowCount: event.writtenCount,
        snapshotKeys: event.snapshotKey ? [event.snapshotKey] : [],
        updatedAt: new Date().toISOString(),
      },
    }),
  );

  return { month: event.month, tab: event.tab, status: 'DONE' };
}
