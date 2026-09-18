import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { ProblemReportRequestSchema, type ProblemReportResponse } from '@asli/contracts';
import { getDdb, reportsTableName } from '../db';
import { badRequest, jsonResponse, parseJsonBody, userIdFromEvent, withErrors } from '../http';
import { recordProblemReportCreated } from '../metrics';
import { isKnownProblemType, pvpiResponse } from '../pvpi';
import { buildReportItem, createReportsRepo } from '../repo';

const logger = new Logger();

/** POST /v1/reports - docs/API.md. Never displayed to other users, never affects tiers (CLAUDE.md rule 1). */
export const handler = withErrors(async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  // JWT is required (docs/API.md) so only signed-in users can report, but the sub is not
  // stored (docs/DATA_MODEL.md Reports has no userId field) - it's checked and discarded.
  userIdFromEvent(event);

  const { identity, alertRef, problemType, note } = parseJsonBody(event, (raw) =>
    ProblemReportRequestSchema.parse(raw),
  );
  if (!isKnownProblemType(problemType)) {
    throw badRequest(`problemType must be one of the fixed report categories, got: ${problemType}`);
  }

  const repo = createReportsRepo({ ddb: getDdb(), tableName: reportsTableName() });
  const item = buildReportItem({
    now: new Date(),
    batchNumber: identity.batchNumber,
    problemType,
    alertRef,
    note,
  });
  await repo.putReport(item);

  // IDs and counts only (CLAUDE.md rule 7) - no free text, no identity fields.
  logger.info('problem report stored', { problemType, hasAlertRef: alertRef !== undefined });
  recordProblemReportCreated(problemType);

  const body: ProblemReportResponse = { pvpi: pvpiResponse() };
  return jsonResponse(201, body);
});
