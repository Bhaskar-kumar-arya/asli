import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { UpdateMemberRequestSchema, cabinetMemberSk, cabinetPk } from '@asli/contracts';
import type { Member, MemberItem } from '@asli/contracts';
import { createAuthzFactory } from '../lib/authz';
import { ensureNotLastOwner, isLastOwnerError } from '../lib/owner-guard';
import { ApiError, jsonResponse, parseJsonBody, requirePathParam, requireUserId, withErrorHandling } from '../http';
import { logEvent } from '../logging';
import { metrics, recordAuthzDecision } from '../metrics';

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
    const body = UpdateMemberRequestSchema.parse(parseJsonBody(event));

    // docs/API.md: "JWT (ManageMembers, or self for alertsEnabled)" - a member
    // may always toggle their own alertsEnabled (docs/PERMISSIONS.md "any
    // member can ... toggle their own alerts"), but changing role, or changing
    // someone else's settings, always requires ManageMembers.
    const isSelfAlertsOnly = callerId === targetUserId && body.role === undefined;
    if (!isSelfAlertsOnly) {
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
    const currentMember = existing.Item as MemberItem;

    if (body.role !== undefined && body.role !== 'OWNER' && currentMember.role === 'OWNER') {
      try {
        await ensureNotLastOwner({ ddb, cabinetsTable }, cabinetId, targetUserId);
      } catch (err) {
        if (isLastOwnerError(err)) throw new ApiError('CONFLICT', 'cabinet must keep at least one owner');
        throw err;
      }
    }

    const setExpressions: string[] = [];
    const values: Record<string, unknown> = {};
    if (body.role !== undefined) {
      setExpressions.push('#role = :role');
      values[':role'] = body.role;
    }
    if (body.alertsEnabled !== undefined) {
      setExpressions.push('alertsEnabled = :alertsEnabled');
      values[':alertsEnabled'] = body.alertsEnabled;
    }

    const result = await ddb.send(
      new UpdateCommand({
        TableName: cabinetsTable,
        Key: { PK: cabinetPk(cabinetId), SK: cabinetMemberSk(targetUserId) },
        UpdateExpression: `SET ${setExpressions.join(', ')}`,
        ExpressionAttributeNames: body.role !== undefined ? { '#role': 'role' } : undefined,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );
    const updated = result.Attributes as MemberItem;

    metrics.publishStoredMetrics();
    logEvent('member updated', { requestId: event.requestContext.requestId, route: 'members-update', cabinetId, role: updated.role });

    const response: Member = {
      userId: targetUserId,
      role: updated.role,
      alertsEnabled: updated.alertsEnabled,
      joinedAt: updated.joinedAt,
    };
    return jsonResponse(200, response);
  });
}
