import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda';
import webpush from 'web-push';
import { listSubscriptions, deleteSubscription } from '../subscriptions';
import { loadVapidKeys } from '../vapid';
import { getUserId } from '../http';
import { logger } from '../observability';

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => {
  const requestId = event.requestContext.requestId;
  const userId = getUserId(event);

  const subscriptions = await listSubscriptions(userId);
  const vapid = await loadVapidKeys();
  webpush.setVapidDetails('mailto:alerts@asli.app', vapid.publicKey, vapid.privateKey);

  const body = JSON.stringify({
    title: 'Asli test notification',
    body: 'Push notifications are working.',
    url: '/',
    tag: 'test',
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, body);
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscription(userId, subscription.endpoint);
        }
      }
    }),
  );

  logger.info('push test sent', { requestId, route: 'POST /v1/push/test', subscriptionCount: subscriptions.length });

  return { statusCode: 202 };
};
