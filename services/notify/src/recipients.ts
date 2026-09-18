import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { MemberItemSchema, cabinetPk } from '@asli/contracts';
import { ddbClient, requiredEnv } from './ddb';
import { isAllowedForRole } from './authz-stub';

export interface Recipient {
  userId: string;
}

/**
 * Members of a cabinet permitted to receive alerts: alertsEnabled = true and the
 * ReceiveAlerts Cedar action allows their role (docs/ALERTS.md "Recipient resolution").
 */
export async function resolveRecipients(cabinetId: string): Promise<Recipient[]> {
  const tableName = requiredEnv('CABINETS_TABLE_NAME');
  const pk = cabinetPk(cabinetId);
  const memberSkPrefix = 'MEMBER#';

  const recipients: Recipient[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await ddbClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: { ':pk': pk, ':prefix': memberSkPrefix },
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    for (const raw of result.Items ?? []) {
      const member = MemberItemSchema.parse(raw);
      if (!member.alertsEnabled) continue;
      if (!isAllowedForRole(member.role, 'ReceiveAlerts')) continue;
      const userId = member.SK.slice('MEMBER#'.length);
      recipients.push({ userId });
    }

    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return recipients;
}
