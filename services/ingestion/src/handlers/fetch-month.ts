import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Category } from '@asli/contracts';
import { createCdscoClient, parseSnapshot } from '../cdsco';
import { requireEnv } from '../lib/env';
import type { FetchedWork, WorkItem } from './types';

const s3 = new S3Client({});

/** ENDPOINT branch: A1's client fetches + parses one month/tab, this stashes the parsed rows in S3 for NormalizeAndWrite. */
export async function handler(event: WorkItem): Promise<FetchedWork> {
  const bucketName = requireEnv('RAW_BUCKET_NAME');

  const client = createCdscoClient({ s3Client: s3, bucketName });
  const snapshot = await client.fetchMonth(event.month, event.tab);
  const rows = parseSnapshot(
    { text: snapshot.body },
    { month: event.month, tab: event.tab, sourceUrl: snapshot.url, snapshotKey: snapshot.key },
  );

  const parsedRowsKey = `raw/cdsco/parsed/${event.month}/${event.tab}/rows.json`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: parsedRowsKey,
      Body: JSON.stringify(rows),
      ContentType: 'application/json',
    }),
  );

  const category: Category = event.tab === 'nsq' ? 'NSQ' : 'SPURIOUS';

  return {
    ...event,
    category,
    alertMonth: event.month,
    sourceUrl: snapshot.url,
    snapshotKey: snapshot.key,
    parsedRowsKey,
    rowCount: rows.length,
    demo: false,
  };
}
