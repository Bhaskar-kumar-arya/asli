import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

/**
 * Powertools Logger/Metrics shared across handlers. Logger uses an explicit allowlist of
 * fields only (docs/PRIVACY.md) - never log emails, labels, notes or subscription endpoints.
 */
export const logger = new Logger({ serviceName: 'g1-notify' });
export const metrics = new Metrics({ namespace: 'Asli', serviceName: 'g1-notify' });

export { MetricUnit };
