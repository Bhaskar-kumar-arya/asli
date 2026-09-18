import { randomUUID } from 'node:crypto';
import { PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { reportPk, reportSk, type ReportItem } from '@asli/contracts';
import { normalizeBatch } from '@asli/matching';

export interface ReportsRepo {
  putReport(item: ReportItem): Promise<void>;
}

export function createReportsRepo(opts: { ddb: DynamoDBDocumentClient; tableName: string }): ReportsRepo {
  const { ddb, tableName } = opts;
  return {
    async putReport(item) {
      // Reports carry no userId (docs/DATA_MODEL.md Reports) so a random id plus a
      // not-exists condition is enough to make retries safe without a dedicated dedup key.
      await ddb.send(new PutCommand({ TableName: tableName, Item: item, ConditionExpression: 'attribute_not_exists(PK)' }));
    },
  };
}

export function newReportId(): string {
  return randomUUID();
}

/** yyyy-mm of `now`, used as the Reports partition key (docs/DATA_MODEL.md). */
export function reportMonth(now: Date): string {
  return now.toISOString().slice(0, 7);
}

export function buildReportItem(input: {
  now: Date;
  batchNumber: string;
  problemType: string;
  alertRef?: string;
  note?: string;
}): ReportItem {
  const nowIso = input.now.toISOString();
  const reportId = newReportId();
  return {
    PK: reportPk(reportMonth(input.now)),
    SK: reportSk(reportId),
    problemType: input.problemType,
    alertRef: input.alertRef,
    batchNorm: normalizeBatch(input.batchNumber),
    note: input.note,
    createdAt: nowIso,
  };
}
