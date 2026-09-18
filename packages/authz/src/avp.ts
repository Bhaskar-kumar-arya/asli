import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { IsAuthorizedCommand } from '@aws-sdk/client-verifiedpermissions';
import type { EntityItem, VerifiedPermissionsClient } from '@aws-sdk/client-verifiedpermissions';
import type { Role } from '@asli/contracts';
import { cabinetMemberSk, cabinetPk } from '@asli/contracts';
import type { Authz } from './types';

const CACHE_TTL_MS = 30_000;

export interface AvpAuthzDeps {
  avpClient: VerifiedPermissionsClient;
  policyStoreId: string;
  ddb: DynamoDBDocumentClient;
  cabinetsTable: string;
  now?: () => number;
}

/**
 * `avp` mode (docs/PERMISSIONS.md): every cabinet has exactly one MemberGroup
 * entity per role ("<cabinetId>#OWNER" etc). A User's only parent is the group
 * matching their own role, and the Cabinet's owners/editors/viewers attributes
 * point at the same three fixed group ids - so `principal in resource.owners`
 * is true only when the caller's role group is the owners group. No entity
 * store: the full entity list is built and passed per request.
 */
const memberGroupId = (cabinetId: string, role: Role | string): string => `${cabinetId}#${role}`;

const memberGroupEntity = (cabinetId: string, role: Role): EntityItem => ({
  identifier: { entityType: 'Asli::MemberGroup', entityId: memberGroupId(cabinetId, role) },
});

export function createAvpAuthz(deps: AvpAuthzDeps): Authz {
  const now = deps.now ?? Date.now;
  const cache = new Map<string, { value: boolean; expiresAt: number }>();

  return {
    async isAllowed(userId, action, cabinetId) {
      const cacheKey = `${userId}#${action}#${cabinetId}`;
      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > now()) {
        return cached.value;
      }

      const allowed = await decide(deps, userId, action, cabinetId);
      cache.set(cacheKey, { value: allowed, expiresAt: now() + CACHE_TTL_MS });
      return allowed;
    },
  };
}

async function decide(deps: AvpAuthzDeps, userId: string, action: string, cabinetId: string): Promise<boolean> {
  try {
    const member = await deps.ddb.send(
      new GetCommand({
        TableName: deps.cabinetsTable,
        Key: { PK: cabinetPk(cabinetId), SK: cabinetMemberSk(userId) },
      }),
    );
    const role = member.Item?.role as Role | undefined;

    const entities: EntityItem[] = [
      memberGroupEntity(cabinetId, 'OWNER'),
      memberGroupEntity(cabinetId, 'EDITOR'),
      memberGroupEntity(cabinetId, 'VIEWER'),
      {
        identifier: { entityType: 'Asli::User', entityId: userId },
        parents: role ? [{ entityType: 'Asli::MemberGroup', entityId: memberGroupId(cabinetId, role) }] : [],
      },
      {
        identifier: { entityType: 'Asli::Cabinet', entityId: cabinetId },
        attributes: {
          owners: { entityIdentifier: { entityType: 'Asli::MemberGroup', entityId: memberGroupId(cabinetId, 'OWNER') } },
          editors: { entityIdentifier: { entityType: 'Asli::MemberGroup', entityId: memberGroupId(cabinetId, 'EDITOR') } },
          viewers: { entityIdentifier: { entityType: 'Asli::MemberGroup', entityId: memberGroupId(cabinetId, 'VIEWER') } },
        },
      },
    ];

    const result = await deps.avpClient.send(
      new IsAuthorizedCommand({
        policyStoreId: deps.policyStoreId,
        principal: { entityType: 'Asli::User', entityId: userId },
        action: { actionType: 'Asli::Action', actionId: action },
        resource: { entityType: 'Asli::Cabinet', entityId: cabinetId },
        entities: { entityList: entities },
      }),
    );
    return result.decision === 'ALLOW';
  } catch {
    return false; // deny by default on any error (PERMISSIONS.md)
  }
}
