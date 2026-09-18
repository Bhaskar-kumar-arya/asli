import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda';
import { z } from 'zod';
import { deleteSubscription } from '../subscriptions';
import { getUserId, errorResponse } from '../http';
import { logger } from '../observability';

const DeletePushSubscriptionRequestSchema = z.object({ endpoint: z.string().url() });

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => {
  const requestId = event.requestContext.requestId;
  const userId = getUserId(event);

  const parsed = DeletePushSubscriptionRequestSchema.safeParse(JSON.parse(event.body ?? '{}'));
  if (!parsed.success) {
    return errorResponse(400, 'BAD_REQUEST', 'Invalid push subscription delete request', requestId);
  }

  await deleteSubscription(userId, parsed.data.endpoint);
  logger.info('push subscription deleted', { requestId, route: 'DELETE /v1/push/subscriptions' });

  return { statusCode: 204 };
};
