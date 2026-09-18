import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

/** docs/OBSERVABILITY_AND_COST.md metrics this lane emits. */
export const metrics = new Metrics({ namespace: 'Asli', serviceName: 'members-api' });

export function recordInviteCreated(): void {
  metrics.addMetric('InviteCreated', MetricUnit.Count, 1);
}

export function recordInviteAccepted(): void {
  metrics.addMetric('InviteAccepted', MetricUnit.Count, 1);
}

export function recordMemberRemoved(): void {
  metrics.addMetric('MemberRemoved', MetricUnit.Count, 1);
}

export function recordAuthzDecision(mode: 'stub' | 'avp', allowed: boolean): void {
  metrics.addDimension('mode', mode);
  metrics.addMetric(allowed ? 'AuthzAllowed' : 'AuthzDenied', MetricUnit.Count, 1);
}
