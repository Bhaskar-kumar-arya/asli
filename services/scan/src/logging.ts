import { Logger } from '@aws-lambda-powertools/logger';

/**
 * docs/PRIVACY.md: never log request bodies, image keys with user IDs, emails,
 * labels, notes, or model outputs. Only requestId, lane, route, tier, counts,
 * durationMs. Callers must only pass fields from that allowlist.
 */
export interface AllowedLogFields {
  requestId?: string;
  route?: string;
  tier?: string;
  scanId?: string;
  uploadId?: string;
  kind?: string;
  itemCount?: number;
  durationMs?: number;
  errorCode?: string;
  retried?: boolean;
}

export const logger = new Logger({ serviceName: 'scan-api' });

export function logEvent(message: string, fields: AllowedLogFields = {}): void {
  logger.info(message, { lane: 'C', ...fields });
}
