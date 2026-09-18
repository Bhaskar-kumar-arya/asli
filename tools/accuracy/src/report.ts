import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tier } from '@asli/contracts';
import type { AccuracySummary, ScoredBillItem, ScoredStripItem } from './score';

export interface TierMismatch {
  id: string;
  expectedTier: Tier;
  actualTier: Tier;
}

export interface TierCorrectness {
  total: number;
  correct: number;
  rate: number;
  mismatches: TierMismatch[];
}

export interface CostSummary {
  inputTokens?: number;
  outputTokens?: number;
  avgLatencyMs?: number;
  costPer1000ScansUsd?: number;
}

export interface AccuracyReport {
  runId: string;
  stage: string;
  method?: string;
  generatedAt: string;
  summary: AccuracySummary;
  tierCorrectness: TierCorrectness;
  cost: CostSummary;
  items: { strips: ScoredStripItem[]; bills: ScoredBillItem[] };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function toMarkdown(report: AccuracyReport): string {
  const lines: string[] = [];
  lines.push(`# Accuracy report - ${report.runId}`);
  lines.push('');
  lines.push(`Stage: \`${report.stage}\`${report.method ? ` · Method: \`${report.method}\`` : ''} · Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push(`Sample size: ${report.summary.sampleSize} (${report.summary.strips.count} strips, ${report.summary.bills.count} bills)`);
  lines.push('');
  lines.push('## Strip extraction');
  lines.push('| Metric | Rate |');
  lines.push('|---|---|');
  lines.push(`| Batch exact | ${pct(report.summary.strips.batchExactRate)} |`);
  lines.push(`| Batch skeleton (near) | ${pct(report.summary.strips.batchSkeletonRate)} |`);
  lines.push(`| Manufacturer STRONG | ${pct(report.summary.strips.manufacturerStrongRate)} |`);
  lines.push(`| Expiry month exact | ${pct(report.summary.strips.expiryExactRate)} |`);
  lines.push('');
  lines.push('## Bill extraction');
  lines.push(`Line recall: ${pct(report.summary.bills.lineRecall)} (${report.summary.bills.count} bills)`);
  lines.push('');
  lines.push('## Tier correctness (seeded run)');
  lines.push(`${report.tierCorrectness.correct}/${report.tierCorrectness.total} correct (${pct(report.tierCorrectness.rate)})`);
  if (report.tierCorrectness.mismatches.length > 0) {
    lines.push('');
    lines.push('| Case | Expected | Actual |');
    lines.push('|---|---|---|');
    for (const m of report.tierCorrectness.mismatches) {
      lines.push(`| ${m.id} | ${m.expectedTier} | ${m.actualTier} |`);
    }
  }
  lines.push('');
  lines.push('## Breakdown by method');
  lines.push('| Method | Count | Batch exact |');
  lines.push('|---|---|---|');
  for (const m of report.summary.byMethod) {
    lines.push(`| ${m.method} | ${m.count} | ${pct(m.batchExactRate)} |`);
  }
  lines.push('');
  lines.push('## Breakdown by condition');
  lines.push('| Condition | Count | Batch exact |');
  lines.push('|---|---|---|');
  for (const c of report.summary.byCondition) {
    lines.push(`| ${c.condition}=${c.value} | ${c.count} | ${pct(c.batchExactRate)} |`);
  }
  lines.push('');
  lines.push('## Cost (measured, not estimated)');
  lines.push(`- Bedrock input tokens: ${report.cost.inputTokens ?? 'unknown'}`);
  lines.push(`- Bedrock output tokens: ${report.cost.outputTokens ?? 'unknown'}`);
  lines.push(`- Average scan latency: ${report.cost.avgLatencyMs !== undefined ? `${report.cost.avgLatencyMs.toFixed(0)}ms` : 'unknown'}`);
  lines.push(`- Cost per 1,000 scans (USD): ${report.cost.costPer1000ScansUsd !== undefined ? report.cost.costPer1000ScansUsd.toFixed(4) : 'unknown (pricing not yet measured, see packages/contracts/src/pricing.ts)'}`);
  lines.push('');
  return lines.join('\n');
}

/** Writes `<outDir>/<timestamp>.json` and the matching `.md` - docs/TESTING.md "Output". */
export function writeReport(outDir: string, report: AccuracyReport): { jsonPath: string; mdPath: string } {
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, `${report.runId}.json`);
  const mdPath = join(outDir, `${report.runId}.md`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(mdPath, toMarkdown(report));
  return { jsonPath, mdPath };
}

export interface ComparisonRow {
  metric: string;
  before: number;
  after: number;
  deltaPct: number;
}

/** Compares two runs metric-by-metric, for the learning log (task deliverable 5). */
export function compareReports(before: AccuracyReport, after: AccuracyReport): ComparisonRow[] {
  const metric = (name: string, b: number, a: number): ComparisonRow => ({
    metric: name,
    before: b,
    after: a,
    deltaPct: (a - b) * 100,
  });

  return [
    metric('strip batch exact', before.summary.strips.batchExactRate, after.summary.strips.batchExactRate),
    metric('strip batch skeleton', before.summary.strips.batchSkeletonRate, after.summary.strips.batchSkeletonRate),
    metric('manufacturer STRONG', before.summary.strips.manufacturerStrongRate, after.summary.strips.manufacturerStrongRate),
    metric('expiry exact', before.summary.strips.expiryExactRate, after.summary.strips.expiryExactRate),
    metric('bill line recall', before.summary.bills.lineRecall, after.summary.bills.lineRecall),
    metric('tier correctness', before.tierCorrectness.rate, after.tierCorrectness.rate),
  ];
}

export function comparisonToMarkdown(label: string, before: AccuracyReport, after: AccuracyReport): string {
  const rows = compareReports(before, after);
  const lines = [`## Comparison: ${label}`, '', `\`${before.runId}\` -> \`${after.runId}\``, '', '| Metric | Before | After | Delta (pp) |', '|---|---|---|---|'];
  for (const r of rows) {
    lines.push(`| ${r.metric} | ${pct(r.before)} | ${pct(r.after)} | ${r.deltaPct >= 0 ? '+' : ''}${r.deltaPct.toFixed(1)} |`);
  }
  return lines.join('\n');
}
