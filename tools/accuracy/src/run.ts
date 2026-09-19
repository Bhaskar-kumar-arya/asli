#!/usr/bin/env tsx
/**
 * Accuracy harness runner - plan/tasks/E-accuracy-harness.md deliverable 3.
 *
 * Usage:
 *   pnpm --filter @asli/accuracy-harness run:accuracy -- --stage int [--method strip|bill] [--upload] [--compare-with out/<prev>.json]
 *
 * Requires ASLI_TEST_USER_EMAIL / ASLI_TEST_USER_PASSWORD for the real Cognito
 * test user (docs/TESTING.md "Integration (deployed)" uses the same pattern).
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import type { ExtractedItem } from '@asli/contracts';
import { getBedrockTokenTotals, resolveStageConfig, signInTestUser, uploadPublicJson } from './aws';
import { runChecks, runScan, uploadImage } from './apiClient';
import { loadTestset } from './testset';
import { scoreBillLines, scoreStrip, summarize, type ScoredBillItem, type ScoredStripItem } from './score';
import { buildSeededTierCases } from './seededTier';
import { comparisonToMarkdown, writeReport, type AccuracyReport, type TierMismatch } from './report';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const TESTSET_ROOT = join(REPO_ROOT, 'testset');
const OUT_DIR = join(__dirname, '..', 'out');

interface Args {
  stage: string;
  method?: 'strip' | 'bill';
  upload: boolean;
  compareWith?: string;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx !== -1 ? argv[idx + 1] : undefined;
  };
  const stage = get('--stage');
  if (!stage) {
    throw new Error('Usage: run.ts --stage <stage> [--method strip|bill] [--upload] [--compare-with <path>]');
  }
  const methodRaw = get('--method');
  if (methodRaw && methodRaw !== 'strip' && methodRaw !== 'bill') {
    throw new Error('--method must be "strip" or "bill"');
  }
  const method = methodRaw as 'strip' | 'bill' | undefined;
  return { stage, method, upload: argv.includes('--upload'), compareWith: get('--compare-with') };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = new Date();

  const testset = loadTestset(TESTSET_ROOT);
  const strips = args.method === 'bill' ? [] : testset.strips;
  const bills = args.method === 'strip' ? [] : testset.bills;

  if (strips.length === 0 && bills.length === 0) {
    console.warn(`No labelled testset items found under ${TESTSET_ROOT}. See testset/README.md to collect and label some first.`);
  }

  const config = await resolveStageConfig();
  const idToken = await signInTestUser(config.userPoolClientId);

  const scoredStrips: ScoredStripItem[] = [];
  const scoredBills: ScoredBillItem[] = [];
  const latenciesMs: number[] = [];

  for (const item of strips) {
    console.log(`[strip] scanning ${item.id}`);
    const uploadId = await uploadImage(config.apiBaseUrl, idToken, 'strip', item.imagePath);
    const { body, latencyMs } = await runScan(config.apiBaseUrl, idToken, uploadId, 'strip');
    latenciesMs.push(latencyMs);
    const extracted: ExtractedItem | undefined = body.items[0];
    scoredStrips.push({
      id: item.id,
      method: body.method,
      conditions: item.label.kind === 'strip' ? item.label.conditions : {},
      scores: scoreStrip(item.label.kind === 'strip' ? item.label.truth : { batchNumber: '' }, extracted),
    });
  }

  for (const item of bills) {
    console.log(`[bill] scanning ${item.id}`);
    const uploadId = await uploadImage(config.apiBaseUrl, idToken, 'bill', item.imagePath);
    const { body, latencyMs } = await runScan(config.apiBaseUrl, idToken, uploadId, 'bill');
    latenciesMs.push(latencyMs);
    const truthLines = item.label.kind === 'bill' ? item.label.truth.lines : [];
    const lineScores = scoreBillLines(truthLines, body.items);
    const recall = truthLines.length === 0 ? 0 : lineScores.filter((s) => s.batchExact).length / truthLines.length;
    scoredBills.push({
      id: item.id,
      method: body.method,
      conditions: item.label.kind === 'bill' ? item.label.conditions : {},
      lineRecall: recall,
    });
  }

  console.log('Running seeded tier-correctness probes against /v1/checks...');
  const tierCases = buildSeededTierCases();
  const mismatches: TierMismatch[] = [];
  if (tierCases.length > 0) {
    const { body } = await runChecks(
      config.apiBaseUrl,
      idToken,
      tierCases.map((c) => c.identity),
    );
    body.results.forEach((result, i) => {
      const expected = tierCases[i];
      if (expected && result.tier !== expected.expectedTier) {
        mismatches.push({ id: expected.id, expectedTier: expected.expectedTier, actualTier: result.tier });
      }
    });
  }

  const endedAt = new Date();
  const tokenTotals = await getBedrockTokenTotals(args.stage, startedAt, endedAt);
  const avgLatencyMs = latenciesMs.length > 0 ? latenciesMs.reduce((a, b) => a + b, 0) / latenciesMs.length : undefined;

  const runId = startedAt.toISOString().replace(/[:.]/g, '-');
  const report: AccuracyReport = {
    runId,
    stage: args.stage,
    method: args.method,
    generatedAt: endedAt.toISOString(),
    summary: summarize(scoredStrips, scoredBills),
    tierCorrectness: {
      total: tierCases.length,
      correct: tierCases.length - mismatches.length,
      rate: tierCases.length === 0 ? 0 : (tierCases.length - mismatches.length) / tierCases.length,
      mismatches,
    },
    cost: {
      inputTokens: tokenTotals?.inputTokens,
      outputTokens: tokenTotals?.outputTokens,
      avgLatencyMs,
    },
    items: { strips: scoredStrips, bills: scoredBills },
  };

  const { jsonPath, mdPath } = writeReport(OUT_DIR, report);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);

  if (args.compareWith) {
    const before = JSON.parse(readFileSync(args.compareWith, 'utf8')) as AccuracyReport;
    const md = comparisonToMarkdown(`${before.runId} vs ${report.runId}`, before, report);
    console.log('\n' + md);
  }

  if (args.upload) {
    await uploadPublicJson(config.publicBucket, 'metrics/accuracy/latest.json', report);
    console.log(`Uploaded report to s3://${config.publicBucket}/metrics/accuracy/latest.json`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
