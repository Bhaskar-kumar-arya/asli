import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

/** docs/OBSERVABILITY_AND_COST.md metrics this lane emits. */
export const metrics = new Metrics({ namespace: 'Asli', serviceName: 'account-api' });

export function recordAccountDeleted(): void {
  metrics.addMetric('AccountDeleted', MetricUnit.Count, 1);
}

export function recordAccountDeletionBlocked(): void {
  metrics.addMetric('AccountDeletionBlocked', MetricUnit.Count, 1);
}
