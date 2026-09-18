import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { cabinetPk } from '@asli/contracts';
import type { MemberItem } from '@asli/contracts';

export interface OwnerGuardDeps {
  ddb: DynamoDBDocumentClient;
  cabinetsTable: string;
}

/**
 * docs/PERMISSIONS.md: "A cabinet must always keep at least one OWNER
 * (enforced in code, not policy)." Counts current OWNER members, excluding
 * the member about to change, and throws if that would leave zero.
 */
export async function ensureNotLastOwner(deps: OwnerGuardDeps, cabinetId: string, excludingUserId: string): Promise<void> {
  const result = await deps.ddb.send(
    new QueryCommand({
      TableName: deps.cabinetsTable,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': cabinetPk(cabinetId), ':prefix': 'MEMBER#' },
    }),
  );
  const members = (result.Items ?? []) as MemberItem[];
  const remainingOwners = members.filter((m) => m.role === 'OWNER' && m.SK !== `MEMBER#${excludingUserId}`);
  if (remainingOwners.length === 0) {
    const err = new Error('cabinet must keep at least one owner');
    err.name = 'LastOwnerError';
    throw err;
  }
}

export function isLastOwnerError(err: unknown): boolean {
  return err instanceof Error && err.name === 'LastOwnerError';
}
