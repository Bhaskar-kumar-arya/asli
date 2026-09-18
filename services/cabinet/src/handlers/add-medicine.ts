import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import {
  AddMedicineRequestSchema,
  cabinetMedicineSk,
  cabinetPk,
  type MedicineItem,
  type MedicineWithStatus,
} from '@asli/contracts';
import { createAuthz } from '../authz';
import { getDdb, cabinetsTableName } from '../db';
import { forbidden, jsonResponse, notFound, parseJsonBody, userIdFromEvent, withErrors } from '../http';
import { withIdempotency } from '../idempotency';
import { createCabinetRepo, medicineGsi3Keys, newMedId, roleOf } from '../repo';

const baseHandler = withErrors(async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const userId = userIdFromEvent(event);
  const cabinetId = event.pathParameters?.cabinetId;
  if (!cabinetId) throw notFound('cabinetId path parameter is required');

  const { identity, label, forPerson } = parseJsonBody(event, (raw) => AddMedicineRequestSchema.parse(raw));

  const repo = createCabinetRepo({ ddb: getDdb(), tableName: cabinetsTableName() });
  const authz = createAuthz({
    mode: 'stub',
    lookupRole: async (uid, cid) => roleOf(await repo.getMember(cid, uid)),
  });

  if (!(await authz.isAllowed(userId, 'AddMedicine', cabinetId))) throw forbidden();

  const medId = newMedId();
  const now = new Date().toISOString();
  const item: MedicineItem = {
    PK: cabinetPk(cabinetId),
    SK: cabinetMedicineSk(medId),
    identity,
    label,
    forPerson,
    addedBy: userId,
    addedAt: now,
    // PENDING until the Cabinets stream consumer's retroactive check completes (docs/API.md).
    latestTier: 'PENDING',
    ...medicineGsi3Keys(cabinetId, medId, identity),
  };
  await repo.addMedicine(item);

  const body: MedicineWithStatus = {
    medId,
    identity,
    label,
    forPerson,
    addedBy: userId,
    addedAt: now,
    latestTier: 'PENDING',
  };
  return jsonResponse(201, body);
});

export const handler = withIdempotency(baseHandler);
