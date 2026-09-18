import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import type { CabinetDetail, Member } from '@asli/contracts';
import { createAuthz } from '../authz';
import { getDdb, cabinetsTableName } from '../db';
import { forbidden, jsonResponse, notFound, userIdFromEvent, withErrors } from '../http';
import { createCabinetRepo, roleOf } from '../repo';

export const handler = withErrors(async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const userId = userIdFromEvent(event);
  const cabinetId = event.pathParameters?.cabinetId;
  if (!cabinetId) throw notFound('cabinetId path parameter is required');

  const repo = createCabinetRepo({ ddb: getDdb(), tableName: cabinetsTableName() });
  const authz = createAuthz({
    mode: 'stub',
    lookupRole: async (uid, cid) => roleOf(await repo.getMember(cid, uid)),
  });

  if (!(await authz.isAllowed(userId, 'ViewCabinet', cabinetId))) throw forbidden();

  const cabinet = await repo.getCabinetMeta(cabinetId);
  if (!cabinet) throw notFound('Cabinet not found');

  const [members, medicines, matches] = await Promise.all([
    repo.listMembers(cabinetId),
    repo.listMedicines(cabinetId),
    repo.listMatches(cabinetId),
  ]);

  const body: CabinetDetail = {
    cabinet: { cabinetId, name: cabinet.name, createdBy: cabinet.createdBy, createdAt: cabinet.createdAt },
    members: members.map(
      (m): Member => ({
        userId: m.SK.slice('MEMBER#'.length),
        role: m.role,
        alertsEnabled: m.alertsEnabled,
        joinedAt: m.joinedAt,
      }),
    ),
    medicines: medicines.map((m) => ({
      medId: m.SK.slice('MED#'.length),
      identity: m.identity,
      label: m.label,
      forPerson: m.forPerson,
      addedBy: m.addedBy,
      addedAt: m.addedAt,
      lastCheckedAt: m.lastCheckedAt,
      latestTier: m.latestTier,
    })),
    matches: matches.map((m) => {
      const [medId] = m.SK.slice('MATCH#'.length).split('#');
      return {
        medId: medId ?? '',
        alertRef: m.alertRef,
        tier: m.tier,
        category: m.category,
        alertMonth: m.alertMonth,
        createdAt: m.createdAt,
      };
    }),
  };
  return jsonResponse(200, body);
});
