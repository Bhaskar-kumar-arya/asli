#!/usr/bin/env tsx
/**
 * Uploads fixtures/demo/*.json to the raw bucket's `fixtures/demo/` prefix
 * (docs/DATA_MODEL.md S3 buckets table) so POST /v1/admin/demo/replay-month's
 * `fixtureKey` resolves to a real S3 object.
 *
 * `--stage` is the raw bucket's OWNING stage - the raw bucket is a shared
 * resource (SharedStack, T02), not per-lane, so this is normally
 * `dev-shared` or `int`, matching scripts/seed-fixtures.ts's convention -
 * never a lane stage like `dev-a2` (that lane only imports the shared bucket).
 *
 * Usage: tsx scripts/seed-demo-fixture.ts --stage dev-shared
 */
import { readFileSync } from 'node:fs';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function parseStage(): string {
  const idx = process.argv.indexOf('--stage');
  const stage = idx !== -1 ? process.argv[idx + 1] : undefined;
  if (!stage) {
    throw new Error('Usage: tsx scripts/seed-demo-fixture.ts --stage <stage>');
  }
  return stage;
}

const FIXTURE_FILES = ['replay-1.json'];

async function main(): Promise<void> {
  const stage = parseStage();
  const bucketName = `asli-${stage}-raw`;
  const s3 = new S3Client({ region: 'ap-south-1' });

  for (const file of FIXTURE_FILES) {
    const key = `fixtures/demo/${file}`;
    const body = readFileSync(new URL(`../fixtures/demo/${file}`, import.meta.url));
    await s3.send(new PutObjectCommand({ Bucket: bucketName, Key: key, Body: body, ContentType: 'application/json' }));
    console.log(`Uploaded ${file} to s3://${bucketName}/${key}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
