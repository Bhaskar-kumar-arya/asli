import { S3Client } from '@aws-sdk/client-s3';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ingestionStatePk, ingestionStateSk } from '@asli/contracts';
import { createCdscoClient, type CdscoTab } from '../cdsco';
import { createDocClient } from '../lib/ddb';
import { requireEnv } from '../lib/env';
import type { IngestExecutionInput } from './types';

const s3 = new S3Client({});
const doc = createDocClient();
const sfn = new SFNClient({});

const TABS: CdscoTab[] = ['nsq', 'spurious'];

async function isDone(tableName: string, month: string, tab: CdscoTab): Promise<boolean> {
  const res = await doc.send(
    new GetCommand({ TableName: tableName, Key: { PK: ingestionStatePk(month), SK: ingestionStateSk(tab) } }),
  );
  return res.Item?.status === 'DONE';
}

export interface CheckMonthsOutput {
  startedExecutionArn?: string;
  missingMonths: string[];
}

/** EventBridge Scheduler daily 06:30 IST (this task's Deliverable 1). */
export async function handler(): Promise<CheckMonthsOutput> {
  const bucketName = requireEnv('RAW_BUCKET_NAME');
  const stateMachineArn = requireEnv('STATE_MACHINE_ARN');
  const ingestionStateTable = requireEnv('INGESTION_STATE_TABLE');

  const client = createCdscoClient({ s3Client: s3, bucketName });
  const now = new Date();
  const years = [now.getUTCFullYear() - 1, now.getUTCFullYear()];

  const availableMonths = new Set<string>();
  for (const year of years) {
    for (const month of await client.listAvailableMonths(year)) {
      availableMonths.add(month);
    }
  }

  const missingMonths: string[] = [];
  for (const month of availableMonths) {
    let complete = true;
    for (const tab of TABS) {
      if (!(await isDone(ingestionStateTable, month, tab))) {
        complete = false;
        break;
      }
    }
    if (!complete) missingMonths.push(month);
  }
  missingMonths.sort();

  if (missingMonths.length === 0) {
    return { missingMonths: [] };
  }

  const input: IngestExecutionInput = { months: missingMonths, tabs: TABS, sourceType: 'ENDPOINT' };
  const res = await sfn.send(new StartExecutionCommand({ stateMachineArn, input: JSON.stringify(input) }));

  return { startedExecutionArn: res.executionArn, missingMonths };
}
