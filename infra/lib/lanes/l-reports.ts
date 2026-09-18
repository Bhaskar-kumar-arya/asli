import * as path from 'node:path';
import { SSM_PATHS } from '@asli/contracts';
import { Stack, aws_apigatewayv2 as apigwv2, aws_dynamodb as dynamodb, type App } from 'aws-cdk-lib';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { importParam } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

/**
 * Lane L: "Report a problem" routed to PvPI (plan/tasks/L-pvpi-report.md). Imports the shared
 * Reports table from SharedStack (T02) via SSM; owns no shared resources itself.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneLStack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  const reportsTableName = importParam(stack, shared, SSM_PATHS.table('reports'));
  const reportsTable = dynamodb.Table.fromTableName(stack, 'ReportsTable', reportsTableName);

  const createReportFn = nodeFn(stack, 'CreateReportHandler', {
    serviceName: 'l-reports-create',
    entry: path.join(__dirname, '../../../services/reports/src/handlers/create-report.ts'),
    environment: { REPORTS_TABLE_NAME: reportsTableName },
  });
  reportsTable.grantWriteData(createReportFn);

  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/reports', createReportFn, { auth: 'jwt' });
}
