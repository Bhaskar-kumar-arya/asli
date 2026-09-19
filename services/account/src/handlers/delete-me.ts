import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { requireUserId, withErrorHandling, ApiError } from '../http';
import { logEvent } from '../logging';
import { metrics, recordAccountDeleted, recordAccountDeletionBlocked } from '../metrics';
import { deleteAccountData } from '../lib/delete-account';
import { deleteCognitoUserBySub } from '../lib/delete-cognito-user';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cognito = new CognitoIdentityProviderClient({});

const cabinetsTable = process.env.CABINETS_TABLE_NAME;
const pushSubscriptionsTable = process.env.PUSH_SUBSCRIPTIONS_TABLE_NAME;
const userPoolId = process.env.USER_POOL_ID;

/**
 * DELETE /v1/me - docs/PRIVACY.md. Optional Z1 deliverable. Removes the caller's cabinet
 * memberships (or whole cabinets they solely own), push subscriptions, and Cognito user.
 * Refuses (409) rather than orphaning a cabinet the caller solely owns but shares with others -
 * see services/account/src/lib/delete-account.ts.
 */
export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  return withErrorHandling(event, async () => {
    if (!cabinetsTable || !pushSubscriptionsTable || !userPoolId) {
      throw new Error('CABINETS_TABLE_NAME, PUSH_SUBSCRIPTIONS_TABLE_NAME and USER_POOL_ID env vars are required');
    }
    const userId = requireUserId(event);

    let result;
    try {
      result = await deleteAccountData({ ddb, cabinetsTable, pushSubscriptionsTable }, userId);
    } catch (err) {
      if (err instanceof ApiError) {
        recordAccountDeletionBlocked();
        metrics.publishStoredMetrics();
        logEvent('account deletion blocked', { requestId: event.requestContext.requestId, route: 'delete-me' });
      }
      throw err;
    }

    await deleteCognitoUserBySub(cognito, userPoolId, userId);

    recordAccountDeleted();
    metrics.publishStoredMetrics();
    logEvent('account deleted', {
      requestId: event.requestContext.requestId,
      route: 'delete-me',
      cabinetsLeft: result.cabinetsLeft,
      cabinetsDeleted: result.cabinetsDeleted,
      subscriptionsRemoved: result.subscriptionsRemoved,
    });

    return { statusCode: 204, body: '' };
  });
}
