#!/usr/bin/env tsx
/**
 * Pulls the latest uncertain manufacturer-alias pairs written by
 * build-reference's Lambda (services/ingestion/src/handlers/build-reference.ts,
 * S3 key `reference/review/latest.json`) and formats them as
 * tools/reference/review.md for a human to review (this task's Deliverable 7a).
 *
 * Usage: tsx scripts/reference/export-review.ts --stage dev-a2
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

interface UncertainPair {
  a: string;
  b: string;
  score: number;
}
interface ReviewFile {
  generatedAt: string;
  uncertainPairs: UncertainPair[];
}

function parseStage(): string {
  const idx = process.argv.indexOf('--stage');
  const stage = idx !== -1 ? process.argv[idx + 1] : undefined;
  if (!stage) {
    throw new Error('Usage: tsx scripts/reference/export-review.ts --stage <stage>');
  }
  return stage;
}

function toMarkdown(review: ReviewFile): string {
  const rows = review.uncertainPairs
    .sort((a, b) => b.score - a.score)
    .map((p) => `| ${p.a} | ${p.b} | ${p.score.toFixed(2)} |`)
    .join('\n');
  return `# Manufacturer alias review

Generated ${review.generatedAt} by build-reference (docs/DATA_MODEL.md Reference table).
These manufacturer-name pairs scored WEAK similarity (docs/MATCHING.md
MFR_SIMILARITY_THRESHOLDS) - not confident enough to auto-alias, but similar
enough that a human should decide whether they're the same manufacturer.

| Manufacturer A | Manufacturer B | Score |
|---|---|---|
${rows || '| _(none)_ | | |'}
`;
}

async function main(): Promise<void> {
  const stage = parseStage();
  const s3 = new S3Client({ region: 'ap-south-1' });
  const res = await s3.send(
    new GetObjectCommand({ Bucket: `asli-${stage}-raw`, Key: 'reference/review/latest.json' }),
  );
  const text = await res.Body?.transformToString();
  if (!text) throw new Error('reference/review/latest.json was empty');
  const review = JSON.parse(text) as ReviewFile;

  const outPath = fileURLToPath(new URL('../../tools/reference/review.md', import.meta.url));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, toMarkdown(review));
  console.log(`Wrote ${review.uncertainPairs.length} uncertain pairs to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
