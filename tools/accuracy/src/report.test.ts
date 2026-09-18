import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareReports, toMarkdown, writeReport, type AccuracyReport } from './report';

const baseReport: AccuracyReport = {
  runId: 'run-1',
  stage: 'dev-e',
  generatedAt: '2026-09-18T00:00:00.000Z',
  summary: {
    sampleSize: 2,
    strips: { count: 1, batchExactRate: 1, batchSkeletonRate: 0, manufacturerStrongRate: 1, expiryExactRate: 1 },
    bills: { count: 1, lineRecall: 0.5 },
    byMethod: [{ method: 'strip_vision', count: 1, batchExactRate: 1 }],
    byCondition: [{ condition: 'foil', value: 'true', count: 1, batchExactRate: 1 }],
  },
  tierCorrectness: { total: 10, correct: 9, rate: 0.9, mismatches: [{ id: 'seeded-0', expectedTier: 'FLAGGED', actualTier: 'VERIFY' }] },
  cost: { inputTokens: 100, outputTokens: 50, avgLatencyMs: 1200 },
  items: { strips: [], bills: [] },
};

describe('toMarkdown', () => {
  it('renders the key sections', () => {
    const md = toMarkdown(baseReport);
    expect(md).toContain('# Accuracy report - run-1');
    expect(md).toContain('Batch exact | 100.0%');
    expect(md).toContain('9/10 correct');
    expect(md).toContain('seeded-0 | FLAGGED | VERIFY');
  });

  it('reports unknown cost fields honestly instead of fabricating zero', () => {
    const md = toMarkdown({ ...baseReport, cost: {} });
    expect(md).toContain('Bedrock input tokens: unknown');
    expect(md).toContain('pricing not yet measured');
  });
});

describe('writeReport', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'accuracy-report-'));
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes both a JSON and markdown file', () => {
    const { jsonPath, mdPath } = writeReport(dir, baseReport);
    const parsed = JSON.parse(readFileSync(jsonPath, 'utf8')) as AccuracyReport;
    expect(parsed.runId).toBe('run-1');
    expect(readFileSync(mdPath, 'utf8')).toContain('# Accuracy report');
  });
});

describe('compareReports', () => {
  it('computes a delta per metric', () => {
    const after: AccuracyReport = {
      ...baseReport,
      runId: 'run-2',
      summary: { ...baseReport.summary, strips: { ...baseReport.summary.strips, batchExactRate: 0.8 } },
    };
    const rows = compareReports(baseReport, after);
    const batchExact = rows.find((r) => r.metric === 'strip batch exact');
    expect(batchExact?.before).toBe(1);
    expect(batchExact?.after).toBe(0.8);
    expect(batchExact?.deltaPct).toBeCloseTo(-20);
  });
});
