import { Logger } from '@aws-lambda-powertools/logger';

/**
 * docs/PRIVACY.md: never log request bodies, CSV/image contents, user IDs
 * alongside upload keys, emails, labels, notes, or model outputs. Only
 * requestId, lane, route, counts, durationMs. Callers must only pass fields
 * from this allowlist.
 */
export interface AllowedLogFields {
  requestId?: string;
  route?: string;
  rowCount?: number;
  flaggedUnits?: number;
  durationMs?: number;
  errorCode?: string;
}

export const logger = new Logger({ serviceName: 'pharmacy-api' });

export function logEvent(message: string, fields: AllowedLogFields = {}): void {
  logger.info(message, { lane: 'N', ...fields });
}
