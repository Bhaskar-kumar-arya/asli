import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

/** docs/OBSERVABILITY_AND_COST.md metrics this lane emits. */
export const metrics = new Metrics({ namespace: 'Asli', serviceName: 'pharmacy-api' });

export function recordPharmacyCheckLatency(ms: number): void {
  metrics.addMetric('PharmacyCheckLatencyMs', MetricUnit.Milliseconds, ms);
}

export function recordPharmacyRowCount(count: number): void {
  metrics.addMetric('PharmacyRowsChecked', MetricUnit.Count, count);
}

export function recordPharmacyFlaggedUnits(units: number): void {
  metrics.addMetric('PharmacyFlaggedUnits', MetricUnit.Count, units);
}
