import * as path from 'node:path';
import { SSM_PATHS } from '@asli/contracts';
import {
  Duration,
  Stack,
  aws_apigatewayv2 as apigwv2,
  aws_dynamodb as dynamodb,
  aws_iam as iam,
  aws_lambda_event_sources as eventSources,
  aws_secretsmanager as secretsmanager,
  aws_ses as ses,
  aws_sns as sns,
  aws_sqs as sqs,
  type App,
} from 'aws-cdk-lib';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { importParam } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

/**
 * Lane G1: web push + email senders, subscribed to the shared alerts SNS topic
 * (docs/ALERTS.md "Senders"), plus the push subscriptions HTTP API.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneG1Stack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  // ---- Imported shared resources ----
  const pushSubscriptionsTableName = importParam(stack, shared, SSM_PATHS.table('push-subscriptions'));
  const cabinetsTableName = importParam(stack, shared, SSM_PATHS.table('cabinets'));
  const idempotencyTableName = importParam(stack, shared, SSM_PATHS.table('idempotency'));
  const alertsTopicArn = importParam(stack, shared, SSM_PATHS.sns.alerts);
  const vapidSecretArn = importParam(stack, shared, SSM_PATHS.vapid.secretArn);
  const vapidPublicKey = importParam(stack, shared, SSM_PATHS.vapid.publicKey);
  const userPoolId = importParam(stack, shared, SSM_PATHS.cognito.userPoolId);

  const pushSubscriptionsTable = dynamodb.Table.fromTableName(stack, 'PushSubscriptionsTable', pushSubscriptionsTableName);
  const cabinetsTable = dynamodb.Table.fromTableName(stack, 'CabinetsTable', cabinetsTableName);
  const idempotencyTable = dynamodb.Table.fromTableName(stack, 'IdempotencyTable', idempotencyTableName);
  const alertsTopic = sns.Topic.fromTopicArn(stack, 'AlertsTopic', alertsTopicArn);
  const vapidSecret = secretsmanager.Secret.fromSecretNameV2(stack, 'VapidSecret', vapidSecretArn);

  // Sender address must be a verified SES identity (docs/ALERTS.md "Email (SES)") - the human
  // verifies it in the console (see T01 Handoff) and passes it here at deploy time; the
  // placeholder documents the value shape without pretending a real address is verified.
  const fromEmail = process.env.FROM_EMAIL ?? 'alerts@asli.app';

  const configurationSet = new ses.CfnConfigurationSet(stack, 'EmailConfigurationSet', {
    name: `asli-${stage}-g1-alerts`,
    reputationOptions: { reputationMetricsEnabled: true },
  });

  const commonEnv = {
    PUSH_SUBSCRIPTIONS_TABLE_NAME: pushSubscriptionsTableName,
    CABINETS_TABLE_NAME: cabinetsTableName,
    IDEMPOTENCY_TABLE_NAME: idempotencyTableName,
    VAPID_SECRET_ARN: vapidSecretArn,
  };

  // ---- push-sender (SNS subscriber) ----
  const pushSenderDlq = new sqs.Queue(stack, 'PushSenderDlq', { retentionPeriod: Duration.days(14) });
  const pushSenderFn = nodeFn(stack, 'PushSenderHandler', {
    serviceName: 'g1-push-sender',
    entry: path.join(__dirname, '../../../services/notify/src/handlers/push-sender.ts'),
    environment: commonEnv,
    timeout: Duration.seconds(60),
  });
  pushSubscriptionsTable.grantReadWriteData(pushSenderFn);
  cabinetsTable.grantReadData(pushSenderFn);
  idempotencyTable.grantReadWriteData(pushSenderFn);
  vapidSecret.grantRead(pushSenderFn);
  pushSenderFn.addEventSource(
    new eventSources.SnsEventSource(alertsTopic, { deadLetterQueue: pushSenderDlq }),
  );

  // ---- email-sender (SNS subscriber) ----
  const emailSenderDlq = new sqs.Queue(stack, 'EmailSenderDlq', { retentionPeriod: Duration.days(14) });
  const emailSenderFn = nodeFn(stack, 'EmailSenderHandler', {
    serviceName: 'g1-email-sender',
    entry: path.join(__dirname, '../../../services/notify/src/handlers/email-sender.ts'),
    environment: {
      CABINETS_TABLE_NAME: cabinetsTableName,
      IDEMPOTENCY_TABLE_NAME: idempotencyTableName,
      USER_POOL_ID: userPoolId,
      FROM_EMAIL: fromEmail,
      SES_CONFIGURATION_SET_NAME: configurationSet.name!,
    },
    timeout: Duration.seconds(60),
  });
  cabinetsTable.grantReadData(emailSenderFn);
  idempotencyTable.grantReadWriteData(emailSenderFn);
  emailSenderFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['cognito-idp:ListUsers'],
      resources: [`arn:aws:cognito-idp:${stack.region}:${stack.account}:userpool/${userPoolId}`],
    }),
  );
  emailSenderFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['ses:SendEmail'],
      resources: ['*'],
    }),
  );
  emailSenderFn.addEventSource(
    new eventSources.SnsEventSource(alertsTopic, { deadLetterQueue: emailSenderDlq }),
  );

  // ---- Subscriptions HTTP API ----
  const createFn = nodeFn(stack, 'SubscriptionsCreateHandler', {
    serviceName: 'g1-push-subscriptions-create',
    entry: path.join(__dirname, '../../../services/notify/src/handlers/subscriptions-create.ts'),
    environment: { PUSH_SUBSCRIPTIONS_TABLE_NAME: pushSubscriptionsTableName },
  });
  pushSubscriptionsTable.grantWriteData(createFn);
  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/push/subscriptions', createFn, { auth: 'jwt' });

  const deleteFn = nodeFn(stack, 'SubscriptionsDeleteHandler', {
    serviceName: 'g1-push-subscriptions-delete',
    entry: path.join(__dirname, '../../../services/notify/src/handlers/subscriptions-delete.ts'),
    environment: { PUSH_SUBSCRIPTIONS_TABLE_NAME: pushSubscriptionsTableName },
  });
  pushSubscriptionsTable.grantWriteData(deleteFn);
  addRoute(stack, stage, apigwv2.HttpMethod.DELETE, '/v1/push/subscriptions', deleteFn, { auth: 'jwt' });

  const vapidPublicKeyFn = nodeFn(stack, 'VapidPublicKeyHandler', {
    serviceName: 'g1-vapid-public-key',
    entry: path.join(__dirname, '../../../services/notify/src/handlers/vapid-public-key.ts'),
    environment: { VAPID_PUBLIC_KEY: vapidPublicKey },
  });
  addRoute(stack, stage, apigwv2.HttpMethod.GET, '/v1/push/vapid-public-key', vapidPublicKeyFn, { auth: 'public' });

  const pushTestFn = nodeFn(stack, 'PushTestHandler', {
    serviceName: 'g1-push-test',
    entry: path.join(__dirname, '../../../services/notify/src/handlers/push-test.ts'),
    environment: { PUSH_SUBSCRIPTIONS_TABLE_NAME: pushSubscriptionsTableName, VAPID_SECRET_ARN: vapidSecretArn },
  });
  pushSubscriptionsTable.grantReadWriteData(pushTestFn);
  vapidSecret.grantRead(pushTestFn);
  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/push/test', pushTestFn, { auth: 'jwt' });
}
