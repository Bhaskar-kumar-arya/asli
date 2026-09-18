import { createHash } from 'node:crypto';
import { DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { type PushSubscriptionItem, pushSubscriptionPk, pushSubscriptionSk } from '@asli/contracts';
import { ddbClient, requiredEnv } from './ddb';

function endpointSha256(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex');
}

export async function listSubscriptions(userId: string): Promise<PushSubscriptionItem[]> {
  const tableName = requiredEnv('PUSH_SUBSCRIPTIONS_TABLE_NAME');
  const result = await ddbClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': pushSubscriptionPk(userId), ':prefix': 'SUB#' },
    }),
  );
  return (result.Items ?? []) as PushSubscriptionItem[];
}

export async function putSubscription(
  userId: string,
  input: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent: string },
): Promise<void> {
  const tableName = requiredEnv('PUSH_SUBSCRIPTIONS_TABLE_NAME');
  const item: PushSubscriptionItem = {
    PK: pushSubscriptionPk(userId),
    SK: pushSubscriptionSk(endpointSha256(input.endpoint)),
    endpoint: input.endpoint,
    keys: input.keys,
    userAgent: input.userAgent,
    createdAt: new Date().toISOString(),
    failures: 0,
  };
  await ddbClient.send(new PutCommand({ TableName: tableName, Item: item }));
}

export async function deleteSubscription(userId: string, endpoint: string): Promise<void> {
  const tableName = requiredEnv('PUSH_SUBSCRIPTIONS_TABLE_NAME');
  await ddbClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { PK: pushSubscriptionPk(userId), SK: pushSubscriptionSk(endpointSha256(endpoint)) },
    }),
  );
}
