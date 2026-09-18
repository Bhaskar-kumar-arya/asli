import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda';
import { PushSubscriptionRequestSchema } from '@asli/contracts';
import { putSubscription } from '../subscriptions';
import { getUserId, errorResponse, jsonResponse } from '../http';
import { logger } from '../observability';

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => {
  const requestId = event.requestContext.requestId;
  const userId = getUserId(event);

  const parsed = PushSubscriptionRequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) {
    return errorResponse(400, 'BAD_REQUEST', 'Invalid push subscription request', requestId);
  }

  await putSubscription(userId, parsed.data);
  logger.info('push subscription created', { requestId, route: 'POST /v1/push/subscriptions' });

  return jsonResponse(201, {});
};
