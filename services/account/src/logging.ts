import { Logger } from '@aws-lambda-powertools/logger';

/**
 * docs/PRIVACY.md: never log emails, identities or free text. Only requestId,
 * route, counts (cabinets left / deleted, subscriptions removed) and errorCode.
 */
export interface AllowedLogFields {
  requestId?: string;
  route?: string;
  cabinetsLeft?: number;
  cabinetsDeleted?: number;
  subscriptionsRemoved?: number;
  errorCode?: string;
}

export const logger = new Logger({ serviceName: 'account-api' });

export function logEvent(message: string, fields: AllowedLogFields = {}): void {
  logger.info(message, { lane: 'Z1', ...fields });
}
