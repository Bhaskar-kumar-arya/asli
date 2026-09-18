import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

/** Logger uses an explicit allowlist of fields only (docs/PRIVACY.md) - never log batch/medicine details. */
export const logger = new Logger({ serviceName: 'm-insights' });
export const metrics = new Metrics({ namespace: 'Asli', serviceName: 'm-insights' });

export { MetricUnit };
