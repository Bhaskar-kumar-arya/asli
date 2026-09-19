import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { createAuthz } from '@asli/authz';
import { getDdb, cabinetsTableName } from '../db';
import { forbidden, notFound, userIdFromEvent, withErrors } from '../http';
import { createCabinetRepo } from '../repo';

export const handler = withErrors(async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const userId = userIdFromEvent(event);
  const cabinetId = event.pathParameters?.cabinetId;
  const medId = event.pathParameters?.medId;
  if (!cabinetId || !medId) throw notFound('cabinetId and medId path parameters are required');

  const repo = createCabinetRepo({ ddb: getDdb(), tableName: cabinetsTableName() });
  const authz = createAuthz({ mode: 'stub', ddb: getDdb(), cabinetsTable: cabinetsTableName() });

  if (!(await authz.isAllowed(userId, 'RemoveMedicine', cabinetId))) throw forbidden();

  // Deleting an already-deleted medicine is a no-op, not an error - DELETE is idempotent by nature.
  await repo.deleteMedicineAndMatches(cabinetId, medId);

  return { statusCode: 204 };
});
