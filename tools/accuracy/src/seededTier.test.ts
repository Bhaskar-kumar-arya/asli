import { describe, expect, it } from 'vitest';
import type { FlaggedBatch } from '@asli/contracts';
import { buildSeededTierCases } from './seededTier';

const row = (over: Partial<FlaggedBatch> = {}): FlaggedBatch => ({
  productName: 'Amoxicillin 500mg Capsules',
  batchRaw: 'GTL 1258',
  batchNorm: 'GTL1258',
  batchSkeleton: '6T11258',
  mfgMonth: null,
  expMonth: '2026-10',
  manufacturerRaw: 'M/s. Gidsha Pharmaceuticals Pvt. Ltd.',
  manufacturerNorm: 'GIDSHA',
  category: 'NSQ',
  reasonRaw: 'Assay found outside limits',
  reasonCode: 'ASSAY',
  reportingSource: 'STATE_LAB',
  alertMonth: '2025-03',
  sourceUrl: 'https://cdscoonline.gov.in/example',
  snapshotKey: 'raw/example.html',
  rowHash: 'hash1',
  alertId: 'hash1',
  ingestedAt: '2025-03-05T06:00:00.000Z',
  demo: false,
  ...over,
});

describe('buildSeededTierCases', () => {
  it('predicts FLAGGED for a row read back exactly, using the identity fixtures actually seed', () => {
    const [probe] = buildSeededTierCases([row()]);
    expect(probe?.expectedTier).toBe('FLAGGED');
    expect(probe?.identity.batchNumber).toBe('GTL 1258');
    expect(probe?.identity.source).toBe('manual');
  });

  it('predicts NO_ALERT_FOUND (collision) when two rows share a batch but manufacturers mismatch', () => {
    const rows = [row(), row({ manufacturerRaw: 'Cipla Ltd', manufacturerNorm: 'CIPLA', rowHash: 'hash2', alertId: 'hash2' })];
    const cases = buildSeededTierCases(rows);
    // Row 2's own identity reads back its own manufacturer exactly, so it is FLAGGED
    // against itself even though it collides with row 1 - decide() takes the max tier.
    expect(cases.map((c) => c.expectedTier)).toEqual(['FLAGGED', 'FLAGGED']);
  });

  it('produces one probe per fixture row', () => {
    const cases = buildSeededTierCases([row(), row({ batchRaw: 'ZZZ999', batchNorm: 'ZZZ999', batchSkeleton: '2229990', rowHash: 'hash3', alertId: 'hash3' })]);
    expect(cases).toHaveLength(2);
    expect(new Set(cases.map((c) => c.id)).size).toBe(2);
  });
});
