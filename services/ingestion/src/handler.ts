import { S3Client } from '@aws-sdk/client-s3';
import { createCdscoClient, type CdscoTab } from './cdsco';

/**
 * Test Lambda for this lane's acceptance criterion: "deployed test Lambda in
 * dev-a1 fetches one real month and writes a snapshot to S3". Not the real
 * ingestion pipeline (no Step Functions/DynamoDB - that's A2), just proof this
 * library works from inside Lambda against the real CDSCO endpoint.
 */
const s3Client = new S3Client({});

export interface FetchMonthEvent {
  month?: string; // "YYYY-MM", defaults to the current month
  tab?: CdscoTab; // defaults to "nsq"
}

export async function handler(event: FetchMonthEvent = {}) {
  const bucketName = process.env.BUCKET_NAME;
  if (!bucketName) throw new Error('BUCKET_NAME env var is required');

  const month = event.month ?? new Date().toISOString().slice(0, 7);
  const tab = event.tab ?? 'nsq';

  const client = createCdscoClient({ s3Client, bucketName });
  const snapshot = await client.fetchMonth(month, tab);

  return { key: snapshot.key, sha256: snapshot.sha256, url: snapshot.url, contentType: snapshot.contentType };
}
