import * as path from 'node:path';
import { SSM_PATHS } from '@asli/contracts';
import { Stack, aws_apigatewayv2 as apigwv2, aws_dynamodb as dynamodb, aws_iam as iam, type App } from 'aws-cdk-lib';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { importParam } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

/**
 * Lane Z1: optional `DELETE /v1/me` account deletion (docs/PRIVACY.md, plan/tasks/Z1-hardening-freeze.md).
 * Imports the shared Cabinets/PushSubscriptions tables and Cognito user pool from SharedStack
 * (T02) via SSM; owns no shared resources itself.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneZ1Stack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  const cabinetsTableName = importParam(stack, shared, SSM_PATHS.table('cabinets'));
  const cabinetsTable = dynamodb.Table.fromTableAttributes(stack, 'CabinetsTable', {
    tableName: cabinetsTableName,
    globalIndexes: ['GSI1'],
  });

  const pushSubscriptionsTableName = importParam(stack, shared, SSM_PATHS.table('push-subscriptions'));
  const pushSubscriptionsTable = dynamodb.Table.fromTableName(
    stack,
    'PushSubscriptionsTable',
    pushSubscriptionsTableName,
  );

  const userPoolId = importParam(stack, shared, SSM_PATHS.cognito.userPoolId);

  const deleteMeFn = nodeFn(stack, 'DeleteMeHandler', {
    serviceName: 'z1-account-delete-me',
    entry: path.join(__dirname, '../../../services/account/src/handlers/delete-me.ts'),
    environment: {
      CABINETS_TABLE_NAME: cabinetsTableName,
      PUSH_SUBSCRIPTIONS_TABLE_NAME: pushSubscriptionsTableName,
      USER_POOL_ID: userPoolId,
    },
  });

  cabinetsTable.grantReadWriteData(deleteMeFn);
  pushSubscriptionsTable.grantReadWriteData(deleteMeFn);

  // Scoped to this one user pool - ListUsers resolves the caller's Cognito Username from
  // their JWT `sub` (the pool signs in by email, so Username isn't guaranteed to equal sub);
  // AdminDeleteUser then removes it.
  deleteMeFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminDeleteUser'],
      resources: [`arn:aws:cognito-idp:${stack.region}:${stack.account}:userpool/${userPoolId}`],
    }),
  );

  addRoute(stack, stage, apigwv2.HttpMethod.DELETE, '/v1/me', deleteMeFn, { auth: 'jwt' });
}
