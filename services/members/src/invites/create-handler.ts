import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { CreateInviteRequestSchema, cabinetInviteGsi2Pk, cabinetInviteSk, cabinetPk } from '@asli/contracts';
import type { Invite } from '@asli/contracts';
import { createAuthzFactory } from '../lib/authz';
import { generateInviteCode } from '../lib/invite-code';
import { ApiError, jsonResponse, parseJsonBody, requirePathParam, requireUserId, withErrorHandling } from '../http';
import { logEvent } from '../logging';
import { metrics, recordAuthzDecision, recordInviteCreated } from '../metrics';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cabinetsTable = process.env.CABINETS_TABLE;
const authzModeParam = process.env.AUTHZ_MODE_PARAM;
const avpPolicyStoreIdParam = process.env.AVP_POLICY_STORE_ID_PARAM;

/** docs/PERMISSIONS.md: invite codes are 8 chars, 72h TTL, single use. */
const INVITE_TTL_SECONDS = 72 * 3600;
const MAX_CODE_ATTEMPTS = 5;

let authzFactory: ReturnType<typeof createAuthzFactory> | undefined;

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  return withErrorHandling(event, async () => {
    if (!cabinetsTable || !authzModeParam || !avpPolicyStoreIdParam) {
      throw new Error('CABINETS_TABLE, AUTHZ_MODE_PARAM and AVP_POLICY_STORE_ID_PARAM env vars are required');
    }
    const userId = requireUserId(event);
    const cabinetId = requirePathParam(event, 'cabinetId');
    const body = CreateInviteRequestSchema.parse(parseJsonBody(event));

    authzFactory ??= createAuthzFactory({ ddb, cabinetsTable, authzModeParam, avpPolicyStoreIdParam });
    const { authz, mode } = await authzFactory();
    const allowed = await authz.isAllowed(userId, 'ManageMembers', cabinetId);
    recordAuthzDecision(mode, allowed);
    if (!allowed) throw new ApiError('FORBIDDEN', 'only owners can manage members');

    const nowMs = Date.now();
    const expiresAtEpoch = Math.floor(nowMs / 1000) + INVITE_TTL_SECONDS;

    let code: string | undefined;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !code; attempt += 1) {
      const candidate = generateInviteCode();
      const written = await putIfNew({
        PK: cabinetPk(cabinetId),
        SK: cabinetInviteSk(candidate),
        role: body.role,
        expiresAt: expiresAtEpoch,
        createdBy: userId,
        GSI2PK: cabinetInviteGsi2Pk(candidate),
      });
      if (written) code = candidate;
    }
    if (!code) throw new Error('failed to allocate a unique invite code');

    recordInviteCreated();
    metrics.publishStoredMetrics();
    logEvent('invite created', { requestId: event.requestContext.requestId, route: 'invites-create', cabinetId, role: body.role });

    const response: Invite = { code, role: body.role, expiresAt: new Date(expiresAtEpoch * 1000).toISOString() };
    return jsonResponse(201, response);
  });
}

async function putIfNew(item: Record<string, unknown>): Promise<boolean> {
  try {
    await ddb.send(new PutCommand({ TableName: cabinetsTable, Item: item, ConditionExpression: 'attribute_not_exists(PK)' }));
    return true;
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') return false;
    throw err;
  }
}
