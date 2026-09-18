import { Logger } from '@aws-lambda-powertools/logger';

/**
 * docs/PRIVACY.md: never log request bodies, emails, or invite codes (they're
 * bearer-equivalent to a cabinet invite). Only requestId, route, role, counts.
 */
export interface AllowedLogFields {
  requestId?: string;
  route?: string;
  role?: string;
  cabinetId?: string;
  memberCount?: number;
  durationMs?: number;
  errorCode?: string;
}

export const logger = new Logger({ serviceName: 'members-api' });

export function logEvent(message: string, fields: AllowedLogFields = {}): void {
  logger.info(message, { lane: 'H', ...fields });
}
