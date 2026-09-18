import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import {
  CabinetMetaItemSchema,
  cabinetInviteGsi2Pk,
  cabinetMemberGsi1Pk,
  cabinetMemberGsi1Sk,
  cabinetMemberSk,
  cabinetMetaSk,
} from '@asli/contracts';
import type { Cabinet, InviteItem, MemberItem } from '@asli/contracts';
import { ApiError, jsonResponse, requirePathParam, requireUserId, withErrorHandling } from '../http';
import { logEvent } from '../logging';
import { metrics, recordInviteAccepted } from '../metrics';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cabinetsTable = process.env.CABINETS_TABLE;

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  return withErrorHandling(event, async () => {
    if (!cabinetsTable) throw new Error('CABINETS_TABLE env var is required');
    const userId = requireUserId(event);
    const code = requirePathParam(event, 'code');

    const inviteQuery = await ddb.send(
      new QueryCommand({
        TableName: cabinetsTable,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: { ':pk': cabinetInviteGsi2Pk(code) },
        Limit: 1,
      }),
    );
    const invite = inviteQuery.Items?.[0] as InviteItem | undefined;
    if (!invite) throw new ApiError('NOT_FOUND', 'invite not found');
    if (invite.expiresAt * 1000 < Date.now()) throw new ApiError('CONFLICT', 'invite has expired');

    const cabinetId = invite.PK.slice('CAB#'.length);
    const existingMember = await ddb.send(
      new GetCommand({ TableName: cabinetsTable, Key: { PK: invite.PK, SK: cabinetMemberSk(userId) } }),
    );

    const nowIso = new Date().toISOString();
    const memberItem: MemberItem = existingMember.Item
      ? (existingMember.Item as MemberItem)
      : {
          PK: invite.PK,
          SK: cabinetMemberSk(userId),
          role: invite.role,
          alertsEnabled: true,
          joinedAt: nowIso,
          GSI1PK: cabinetMemberGsi1Pk(userId),
          GSI1SK: cabinetMemberGsi1Sk(cabinetId),
        };

    try {
      await ddb.send(
        new TransactWriteCommand({
          TransactItems: [
            { Delete: { TableName: cabinetsTable, Key: { PK: invite.PK, SK: invite.SK }, ConditionExpression: 'attribute_exists(PK)' } },
            {
              Put: {
                TableName: cabinetsTable,
                Item: memberItem,
                ConditionExpression: existingMember.Item ? undefined : 'attribute_not_exists(PK)',
              },
            },
          ],
        }),
      );
    } catch (err) {
      if ((err as { name?: string }).name === 'TransactionCanceledException') {
        throw new ApiError('CONFLICT', 'invite already used or expired');
      }
      throw err;
    }

    const cabinetResult = await ddb.send(new GetCommand({ TableName: cabinetsTable, Key: { PK: invite.PK, SK: cabinetMetaSk() } }));
    if (!cabinetResult.Item) throw new ApiError('NOT_FOUND', 'cabinet not found');
    const cabinetMeta = CabinetMetaItemSchema.parse(cabinetResult.Item);

    recordInviteAccepted();
    metrics.publishStoredMetrics();
    logEvent('invite accepted', { requestId: event.requestContext.requestId, route: 'invites-accept', cabinetId, role: memberItem.role });

    const response: Cabinet = {
      cabinetId,
      name: cabinetMeta.name,
      createdBy: cabinetMeta.createdBy,
      createdAt: cabinetMeta.createdAt,
    };
    return jsonResponse(200, response);
  });
}
