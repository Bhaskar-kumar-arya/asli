import * as path from 'node:path';
import { SSM_PATHS } from '@asli/contracts';
import { Stack, aws_apigatewayv2 as apigwv2, aws_dynamodb as dynamodb, type App } from 'aws-cdk-lib';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { importParam } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

/**
 * Lane M: public insights page API (docs/UX.md screen 13, docs/API.md
 * `GET /v1/public/insights`). Read-only: reads lane S's `ImpactStatsDocument`
 * (`STATS#IMPACT`/`ALL`, services/stats/src/types.ts) from the shared Stats
 * table and reshapes it into chart-ready detail
 * (services/insights/src/types.ts `InsightsDetail`) - no compute job of its
 * own, no write access to any table.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneMStack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  const statsTableName = importParam(stack, shared, SSM_PATHS.table('stats'));
  const statsTable = dynamodb.Table.fromTableName(stack, 'StatsTable', statsTableName);

  const entry = (file: string) => path.join(__dirname, '../../../services/insights/src', file);

  const publicInsightsFn = nodeFn(stack, 'PublicInsightsHandler', {
    serviceName: 'm-public-insights',
    entry: entry('handlers/public-insights.ts'),
    environment: { STATS_TABLE: statsTableName },
  });
  statsTable.grantReadData(publicInsightsFn);

  addRoute(stack, stage, apigwv2.HttpMethod.GET, '/v1/public/insights', publicInsightsFn, { auth: 'public' });
}
