import { decide } from '@asli/matching';
import type { FlaggedBatch, MedicineIdentity, Tier } from '@asli/contracts';
import flaggedBatchesFixture from '../../../packages/contracts/fixtures/flagged-batches.json' with { type: 'json' };

/**
 * A tier probe: an identity built straight from a seeded FlaggedBatches fixture
 * row (packages/contracts/fixtures/flagged-batches.json, seeded into every stage
 * by `pnpm seed-fixtures`), plus the tier `packages/matching` itself predicts for
 * it. Running this identity through the *deployed* `/v1/checks` and comparing to
 * `expectedTier` checks the production wiring (candidate lookup, GSIs, Lambda) -
 * not the matching logic itself, which is B's fully unit-tested lane.
 */
export interface SeededTierCase {
  id: string;
  identity: MedicineIdentity;
  expectedTier: Tier;
}

/**
 * Builds one probe per fixture row that reads its own batch/manufacturer back
 * exactly (source: "manual" so fieldConfidence doesn't cap the tier), against
 * every candidate that shares its batchNorm - mirroring what a real check would
 * see once all fixtures are seeded.
 */
export function buildSeededTierCases(rows: FlaggedBatch[] = flaggedBatchesFixture as FlaggedBatch[]): SeededTierCase[] {
  const monthCount = new Set(rows.map((r) => r.alertMonth)).size;
  const latestMonth = [...rows.map((r) => r.alertMonth)].sort().at(-1) ?? '2000-01';

  return rows.map((row, i) => {
    const identity: MedicineIdentity = {
      productName: row.productName,
      batchNumber: row.batchRaw,
      manufacturer: row.manufacturerRaw,
      expMonth: row.expMonth ?? undefined,
      source: 'manual',
    };
    const candidates = rows.filter((r) => r.batchNorm === row.batchNorm);
    const result = decide(identity, candidates, { monthCount, latestMonth });
    return { id: `seeded-${i}-${row.batchNorm}`, identity, expectedTier: result.tier };
  });
}
