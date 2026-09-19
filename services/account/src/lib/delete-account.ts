import { DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { cabinetMemberGsi1Pk, cabinetPk } from '@asli/contracts';
import type { MemberItem } from '@asli/contracts';
import { ApiError } from '../http';

export interface DeleteAccountDeps {
  ddb: DynamoDBDocumentClient;
  cabinetsTable: string;
  pushSubscriptionsTable: string;
}

export interface DeleteAccountResult {
  cabinetsLeft: number;
  cabinetsDeleted: number;
  subscriptionsRemoved: number;
}

/**
 * docs/PRIVACY.md: "Users can delete ... their account (`DELETE /v1/me`)".
 * A cabinet the caller shares with others must never be silently destroyed out from
 * under the other members, so this only ever does one of three things per membership:
 *  - caller is not the sole OWNER (another OWNER exists, or caller isn't an OWNER at all)
 *    -> remove just the caller's Member row.
 *  - caller is the sole OWNER and other (non-owner) members exist
 *    -> refuse (409): the caller must transfer ownership or remove the other members first.
 *  - caller is the sole OWNER and the sole member
 *    -> the cabinet is theirs alone; delete every item under it (Cabinet, Member, Invites,
 *       Medicines, Matches).
 */
export async function deleteAccountData(deps: DeleteAccountDeps, userId: string): Promise<DeleteAccountResult> {
  const { ddb, cabinetsTable, pushSubscriptionsTable } = deps;

  const membershipsResult = await ddb.send(
    new QueryCommand({
      TableName: cabinetsTable,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: { ':pk': cabinetMemberGsi1Pk(userId) },
    }),
  );
  const memberships = (membershipsResult.Items ?? []) as MemberItem[];

  let cabinetsDeleted = 0;
  for (const membership of memberships) {
    const cabinetId = membership.PK.slice('CAB#'.length);

    const cabinetMembersResult = await ddb.send(
      new QueryCommand({
        TableName: cabinetsTable,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': cabinetPk(cabinetId), ':prefix': 'MEMBER#' },
      }),
    );
    const cabinetMembers = (cabinetMembersResult.Items ?? []) as MemberItem[];
    const otherOwners = cabinetMembers.filter((m) => m.role === 'OWNER' && m.SK !== membership.SK);
    const isSoleOwner = membership.role === 'OWNER' && otherOwners.length === 0;

    if (!isSoleOwner) {
      await ddb.send(new DeleteCommand({ TableName: cabinetsTable, Key: { PK: membership.PK, SK: membership.SK } }));
      continue;
    }

    const otherMembers = cabinetMembers.filter((m) => m.SK !== membership.SK);
    if (otherMembers.length > 0) {
      throw new ApiError(
        'CONFLICT',
        'transfer ownership or remove the other members of a shared cabinet before deleting your account',
      );
    }

    await deleteWholeCabinet(ddb, cabinetsTable, cabinetId);
    cabinetsDeleted += 1;
  }

  const subscriptionsRemoved = await deleteAllPushSubscriptions(ddb, pushSubscriptionsTable, userId);

  return { cabinetsLeft: memberships.length - cabinetsDeleted, cabinetsDeleted, subscriptionsRemoved };
}

async function deleteWholeCabinet(ddb: DynamoDBDocumentClient, cabinetsTable: string, cabinetId: string): Promise<void> {
  const allItemsResult = await ddb.send(
    new QueryCommand({
      TableName: cabinetsTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': cabinetPk(cabinetId) },
    }),
  );
  for (const item of allItemsResult.Items ?? []) {
    await ddb.send(new DeleteCommand({ TableName: cabinetsTable, Key: { PK: item.PK, SK: item.SK } }));
  }
}

async function deleteAllPushSubscriptions(
  ddb: DynamoDBDocumentClient,
  pushSubscriptionsTable: string,
  userId: string,
): Promise<number> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: pushSubscriptionsTable,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    }),
  );
  const items = result.Items ?? [];
  for (const item of items) {
    await ddb.send(new DeleteCommand({ TableName: pushSubscriptionsTable, Key: { PK: item.PK, SK: item.SK } }));
  }
  return items.length;
}
