#!/usr/bin/env tsx
/**
 * Pulls the latest impact-stats summary written by compute-stats's Lambda
 * (services/stats/src/handlers/compute-stats.ts, S3 key `stats/latest.json`)
 * and formats it as tools/stats-report/latest.md for the pitch/writeup
 * (this task's Deliverable 4, docs/PRODUCT.md "Evidence").
 *
 * Usage: tsx scripts/stats-report/export.ts --stage int
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ImpactStats, ImpactStatsDocument } from '../../services/stats/src/types';

interface StatsSummary extends ImpactStatsDocument {
  public: {
    generatedAt: string;
    monthsCovered: number;
    latestMonth: string;
    totalFlaggedBatches: number;
    cabinetsProtected: number;
    medicinesTracked: number;
  };
}

function parseStage(): string {
  const idx = process.argv.indexOf('--stage');
  const stage = idx !== -1 ? process.argv[idx + 1] : undefined;
  if (!stage) {
    throw new Error('Usage: tsx scripts/stats-report/export.ts --stage <stage>');
  }
  return stage;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function lagRow(label: string, stats: ImpactStats['mfgToAlertLagMonths']): string {
  return `| ${label} | ${stats.n} | ${fmt(stats.mean)} | ${fmt(stats.median)} | ${fmt(stats.p10)} | ${fmt(stats.p90)} | ${fmt(stats.max)} |`;
}

function countsTable(counts: Record<string, number>): string {
  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => `| ${key} | ${count} |`)
    .join('\n');
  return `| Key | Count |\n|---|---|\n${rows || '| _(none)_ | |'}`;
}

function monthRow(month: string, stats: ImpactStats): string {
  const share = stats.rows - stats.missingExpiry > 0 ? `${(stats.withinExpiryShare * 100).toFixed(1)}%` : 'n/a';
  return `| ${month} | ${stats.rows} | ${stats.withinExpiry} | ${share} |`;
}

function toMarkdown(summary: StatsSummary): string {
  const months = Object.keys(summary.byMonth).sort();
  const overallShare =
    summary.overall.rows - summary.overall.missingExpiry > 0
      ? `${(summary.overall.withinExpiryShare * 100).toFixed(1)}%`
      : 'n/a';

  return `# Statistics report

Generated ${summary.generatedAt} by compute-stats (docs/PRODUCT.md "Evidence"). Replaces the
hand-checked numbers there once a human confirms these against the real CDSCO backfill on \`int\`.

## Headline

- Flagged batches ingested: **${summary.overall.rows}**
- Within expiry at announcement: **${summary.overall.withinExpiry}** (${overallShare} of rows with a known expiry; ${summary.overall.missingExpiry} rows missing an expiry date, excluded)
- Manufacture-to-alert lag: mean **${fmt(summary.overall.mfgToAlertLagMonths.mean)} months**, median ${fmt(summary.overall.mfgToAlertLagMonths.median)} (${summary.overall.missingMfgMonth} rows missing a manufacture date, excluded)
- Months covered: ${summary.public.monthsCovered}, latest alert month: ${summary.public.latestMonth}
- Cabinets protected: ${summary.public.cabinetsProtected}, medicines tracked: ${summary.public.medicinesTracked}

## Manufacture-to-alert lag (months)

| Scope | n | Mean | Median | P10 | P90 | Max |
|---|---|---|---|---|---|---|
${lagRow('Overall', summary.overall.mfgToAlertLagMonths)}

## Months remaining to expiry at announcement (months)

| Scope | n | Mean | Median | P10 | P90 | Max |
|---|---|---|---|---|---|---|
${lagRow('Overall', summary.overall.alertToExpiryRemainingMonths)}

## By alert month

| Month | Rows | Within expiry | Share |
|---|---|---|---|
${months.map((m) => monthRow(m, summary.byMonth[m]!)).join('\n')}

## By reason code

${countsTable(summary.overall.byReasonCode)}

## By reporting source

${countsTable(summary.overall.byReportingSource)}

## By category

${countsTable(summary.overall.byCategory)}
`;
}

async function main(): Promise<void> {
  const stage = parseStage();
  const s3 = new S3Client({ region: 'ap-south-1' });
  const res = await s3.send(new GetObjectCommand({ Bucket: `asli-${stage}-raw`, Key: 'stats/latest.json' }));
  const text = await res.Body?.transformToString();
  if (!text) throw new Error('stats/latest.json was empty');
  const summary = JSON.parse(text) as StatsSummary;

  const outPath = fileURLToPath(new URL('../../tools/stats-report/latest.md', import.meta.url));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, toMarkdown(summary));
  console.log(`Wrote ${summary.overall.rows} rows across ${Object.keys(summary.byMonth).length} months to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
