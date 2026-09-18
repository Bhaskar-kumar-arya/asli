import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

/**
 * Powertools Logger/Metrics for this lane. Logger uses an explicit allowlist of fields only
 * (docs/PRIVACY.md) - never log medicine labels, identities or cabinet member details.
 */
export const logger = new Logger({ serviceName: 'g2-fanout' });
export const metrics = new Metrics({ namespace: 'Asli', serviceName: 'g2-fanout' });

export { MetricUnit };
