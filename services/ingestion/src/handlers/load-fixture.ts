import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Category } from '@asli/contracts';
import { parseSnapshot, type CdscoTab } from '../cdsco';
import { requireEnv } from '../lib/env';
import type { FetchedWork, WorkItem } from './types';

const s3 = new S3Client({});

/**
 * Fixture format: the same DataTables `{aaData: [...]}` shape A1's parser
 * already understands (docs/ALERTS.md demo path), plus `meta` carrying the
 * real alertMonth/tab/sourceUrl of the original CDSCO alert this fixture
 * replays - see fixtures/demo/replay-1.json.
 */
interface DemoFixtureFile {
  meta: { alertMonth: string; tab: CdscoTab; sourceUrl: string };
  aaData: Record<string, string>[];
}

async function readObjectText(bucket: string, key: string): Promise<string> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = await res.Body?.transformToString();
  if (!body) throw new Error(`Fixture object ${key} is empty`);
  return body;
}

/** FIXTURE branch: docs/ALERTS.md demo path. Rows get `demo: true` downstream in NormalizeAndWrite. */
export async function handler(event: WorkItem): Promise<FetchedWork> {
  if (!event.fixtureKey) {
    throw new Error('load-fixture: fixtureKey is required for sourceType FIXTURE');
  }
  const bucketName = requireEnv('RAW_BUCKET_NAME');

  const text = await readObjectText(bucketName, event.fixtureKey);
  const fixture = JSON.parse(text) as DemoFixtureFile;

  const rows = parseSnapshot(
    { text: JSON.stringify({ aaData: fixture.aaData }) },
    {
      month: fixture.meta.alertMonth,
      tab: fixture.meta.tab,
      sourceUrl: fixture.meta.sourceUrl,
      snapshotKey: event.fixtureKey,
    },
  );

  const parsedRowsKey = `raw/cdsco/parsed/demo/${event.fixtureKey.replace(/[^a-zA-Z0-9]/g, '_')}/rows.json`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: parsedRowsKey,
      Body: JSON.stringify(rows),
      ContentType: 'application/json',
    }),
  );

  const category: Category = fixture.meta.tab === 'nsq' ? 'NSQ' : 'SPURIOUS';

  return {
    ...event,
    category,
    alertMonth: fixture.meta.alertMonth,
    sourceUrl: fixture.meta.sourceUrl,
    snapshotKey: event.fixtureKey,
    parsedRowsKey,
    rowCount: rows.length,
    demo: true,
  };
}
