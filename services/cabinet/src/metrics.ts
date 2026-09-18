import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import type { AlertTrigger, Tier } from '@asli/contracts';

export const metrics = new Metrics({ namespace: 'Asli' });

// Each recorder uses singleMetric() (its own dimension set, published immediately)
// rather than the shared `metrics` instance, so concurrent calls in the same
// invocation never leak dimensions from one metric into another.

/** docs/OBSERVABILITY_AND_COST.md CheckTier (dim: tier), emitted by C, F, G2. */
export function recordCheckTier(tier: Tier): void {
  const m = metrics.singleMetric();
  m.addDimension('tier', tier);
  m.addMetric('CheckTier', MetricUnit.Count, 1);
}

/** docs/OBSERVABILITY_AND_COST.md MatchesCreated (dim: trigger, tier), emitted by F, G2. */
export function recordMatchCreated(trigger: AlertTrigger, tier: 'FLAGGED' | 'VERIFY'): void {
  const m = metrics.singleMetric();
  m.addDimension('trigger', trigger);
  m.addDimension('tier', tier);
  m.addMetric('MatchesCreated', MetricUnit.Count, 1);
}

/** docs/MATCHING.md batchNorm-equal + manufacturer-MISMATCH collisions, emitted by matching callers. */
export function recordBatchCollisionIgnored(): void {
  const m = metrics.singleMetric();
  m.addMetric('BatchCollisionIgnored', MetricUnit.Count, 1);
}
