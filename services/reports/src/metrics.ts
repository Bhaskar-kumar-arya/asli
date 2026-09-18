import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

export const metrics = new Metrics({ namespace: 'Asli' });

/** docs/OBSERVABILITY_AND_COST.md - reports stored per problem type, no personal data attached. */
export function recordProblemReportCreated(problemType: string): void {
  const m = metrics.singleMetric();
  m.addDimension('problemType', problemType);
  m.addMetric('ProblemReportsCreated', MetricUnit.Count, 1);
}
