import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import type { CabinetList, CabinetSummary } from '@asli/contracts';
import { getDdb, cabinetsTableName } from '../db';
import { createCabinetRepo, newCabinetId } from '../repo';
import { jsonResponse, userIdFromEvent, withErrors } from '../http';

const DEFAULT_CABINET_NAME = 'My family';

export const handler = withErrors(async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const userId = userIdFromEvent(event);
  const repo = createCabinetRepo({ ddb: getDdb(), tableName: cabinetsTableName() });

  let memberships = await repo.listMembershipsForUser(userId);

  if (memberships.length === 0) {
    const cabinetId = newCabinetId();
    const now = new Date().toISOString();
    await repo.createCabinetWithOwner({ cabinetId, name: DEFAULT_CABINET_NAME, ownerId: userId, now });
    memberships = await repo.listMembershipsForUser(userId);
  }

  const cabinets: CabinetSummary[] = [];
  for (const membership of memberships) {
    const cabinetId = membership.PK.slice('CAB#'.length);
    const meta = await repo.getCabinetMeta(cabinetId);
    if (!meta) continue;
    cabinets.push({
      cabinetId,
      name: meta.name,
      createdBy: meta.createdBy,
      createdAt: meta.createdAt,
      role: membership.role,
    });
  }

  const body: CabinetList = { cabinets };
  return jsonResponse(200, body);
});
