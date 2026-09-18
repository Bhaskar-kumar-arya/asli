import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { CreateCabinetRequestSchema, type Cabinet } from '@asli/contracts';
import { getDdb, cabinetsTableName } from '../db';
import { createCabinetRepo, newCabinetId } from '../repo';
import { jsonResponse, parseJsonBody, userIdFromEvent, withErrors } from '../http';

export const handler = withErrors(async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const userId = userIdFromEvent(event);
  const { name } = parseJsonBody(event, (raw) => CreateCabinetRequestSchema.parse(raw));

  const repo = createCabinetRepo({ ddb: getDdb(), tableName: cabinetsTableName() });
  const cabinetId = newCabinetId();
  const now = new Date().toISOString();

  await repo.createCabinetWithOwner({ cabinetId, name, ownerId: userId, now });

  const body: Cabinet = { cabinetId, name, createdBy: userId, createdAt: now };
  return jsonResponse(201, body);
});
