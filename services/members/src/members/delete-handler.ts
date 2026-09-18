import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { cabinetMemberSk, cabinetPk } from '@asli/contracts';
import type { MemberItem } from '@asli/contracts';
import { createAuthzFactory } from '../lib/authz';
import { ensureNotLastOwner, isLastOwnerError } from '../lib/owner-guard';
import { ApiError, requirePathParam, requireUserId, withErrorHandling } from '../http';
import { logEvent } from '../logging';
import { metrics, recordAuthzDecision, recordMemberRemoved } from '../metrics';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cabinetsTable = process.env.CABINETS_TABLE;
const authzModeParam = process.env.AUTHZ_MODE_PARAM;
const avpPolicyStoreIdParam = process.env.AVP_POLICY_STORE_ID_PARAM;

let authzFactory: ReturnType<typeof createAuthzFactory> | undefined;

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  return withErrorHandling(event, async () => {
    if (!cabinetsTable || !authzModeParam || !avpPolicyStoreIdParam) {
      throw new Error('CABINETS_TABLE, AUTHZ_MODE_PARAM and AVP_POLICY_STORE_ID_PARAM env vars are required');
    }
    const callerId = requireUserId(event);
    const cabinetId = requirePathParam(event, 'cabinetId');
    const targetUserId = requirePathParam(event, 'userId');

    // docs/API.md: "JWT (ManageMembers or self)" - any member can leave (docs/PERMISSIONS.md).
    const isSelf = callerId === targetUserId;
    if (!isSelf) {
      authzFactory ??= createAuthzFactory({ ddb, cabinetsTable, authzModeParam, avpPolicyStoreIdParam });
      const { authz, mode } = await authzFactory();
      const allowed = await authz.isAllowed(callerId, 'ManageMembers', cabinetId);
      recordAuthzDecision(mode, allowed);
      if (!allowed) throw new ApiError('FORBIDDEN', 'only owners can manage members');
    }

    const existing = await ddb.send(
      new GetCommand({ TableName: cabinetsTable, Key: { PK: cabinetPk(cabinetId), SK: cabinetMemberSk(targetUserId) } }),
    );
    if (!existing.Item) throw new ApiError('NOT_FOUND', 'member not found');
    const member = existing.Item as MemberItem;

    if (member.role === 'OWNER') {
      try {
        await ensureNotLastOwner({ ddb, cabinetsTable }, cabinetId, targetUserId);
      } catch (err) {
        if (isLastOwnerError(err)) throw new ApiError('CONFLICT', 'cabinet must keep at least one owner');
        throw err;
      }
    }

    await ddb.send(new DeleteCommand({ TableName: cabinetsTable, Key: { PK: cabinetPk(cabinetId), SK: cabinetMemberSk(targetUserId) } }));

    recordMemberRemoved();
    metrics.publishStoredMetrics();
    logEvent('member removed', { requestId: event.requestContext.requestId, route: 'members-delete', cabinetId });

    return { statusCode: 204, body: '' };
  });
}
