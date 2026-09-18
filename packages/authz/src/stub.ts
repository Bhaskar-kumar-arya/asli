import { GetCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { Role } from '@asli/contracts';
import { cabinetMemberSk, cabinetPk } from '@asli/contracts';
import { roleAllows } from './roles';
import type { Authz } from './types';

export interface StubAuthzDeps {
  ddb: DynamoDBDocumentClient;
  cabinetsTable: string;
}

/**
 * `stub` mode (docs/PERMISSIONS.md): decide from the role table in code,
 * looking the caller's role up directly in the Cabinets table. Used by other
 * lanes until AVP's account restriction clears (see plan/tasks/H-permissions-cedar.md).
 */
export function createStubAuthz(deps: StubAuthzDeps): Authz {
  return {
    async isAllowed(userId, action, cabinetId) {
      try {
        const member = await deps.ddb.send(
          new GetCommand({
            TableName: deps.cabinetsTable,
            Key: { PK: cabinetPk(cabinetId), SK: cabinetMemberSk(userId) },
          }),
        );
        const role = member.Item?.role as Role | undefined;
        if (!role) return false;
        return roleAllows(role, action);
      } catch {
        return false; // deny by default on any error (PERMISSIONS.md)
      }
    },
  };
}
