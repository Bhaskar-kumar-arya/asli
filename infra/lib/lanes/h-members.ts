import * as path from 'node:path';
import { Stack, aws_apigatewayv2 as apigwv2, aws_dynamodb as dynamodb, aws_iam as iam, aws_ssm as ssm } from 'aws-cdk-lib';
import type { App } from 'aws-cdk-lib';
import { SSM_PATHS } from '@asli/contracts';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { importParam, ssmName } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

/**
 * Lane H: caregiver permissions (Cedar/AVP), invites and members APIs
 * (docs/PERMISSIONS.md, docs/API.md). One Lambda per route, all sharing the
 * shared HTTP API/JWT authorizer via addRoute.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneHStack', stage), { env: cdkEnv() });
  const shared = sharedStage();

  const cabinetsTableName = importParam(stack, shared, SSM_PATHS.table('cabinets'));
  const cabinetsTable = dynamodb.Table.fromTableAttributes(stack, 'CabinetsTable', {
    tableName: cabinetsTableName,
    globalIndexes: ['GSI1', 'GSI2', 'GSI3'],
  });

  // docs/PERMISSIONS.md: "SSM switch /asli/<stage>/authz/mode = stub|avp" - this
  // lane's own switch (not imported from shared), defaulting to "stub" until
  // AVP's account restriction clears (see plan/tasks/T01-spikes.md Handoff) and
  // X redeploys SharedStack with ENABLE_AVP unset.
  const authzModeParam = new ssm.StringParameter(stack, 'AuthzModeParam', {
    parameterName: ssmName(stage, '/authz/mode'),
    stringValue: process.env.AUTHZ_MODE ?? 'stub',
  });
  // Imported from SharedStack when ENABLE_AVP is set there; otherwise this
  // param doesn't exist yet in dev-shared and avp mode can't be selected -
  // fine, since the mode switch above defaults to stub until then.
  const avpPolicyStoreIdParamName = ssmName(shared, SSM_PATHS.avp.policyStoreId);

  const commonEnv = {
    CABINETS_TABLE: cabinetsTableName,
    AUTHZ_MODE_PARAM: authzModeParam.parameterName,
    AVP_POLICY_STORE_ID_PARAM: avpPolicyStoreIdParamName,
  };
  const entry = (relPath: string): string => path.join(__dirname, '../../../services/members/src', relPath);

  // Built as a plain ARN string (not ssm.StringParameter.fromStringParameterName(...).parameterArn,
  // which makes CDK emit an AWS::SSM::Parameter::Value<String> CFN parameter that CloudFormation
  // tries to resolve at deploy time even though only .parameterArn is used - and fails the whole
  // deploy while ENABLE_AVP=false means this param doesn't exist yet in dev-shared).
  const avpPolicyStoreIdParamArn = stack.formatArn({
    service: 'ssm',
    resource: 'parameter',
    resourceName: avpPolicyStoreIdParamName.replace(/^\//, ''),
  });

  const grantAuthzReads = (fn: import('aws-cdk-lib/aws-lambda-nodejs').NodejsFunction): void => {
    cabinetsTable.grantReadData(fn);
    authzModeParam.grantRead(fn);
    fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter'],
        resources: [avpPolicyStoreIdParamArn],
      }),
    );
    fn.addToRolePolicy(new iam.PolicyStatement({ actions: ['verifiedpermissions:IsAuthorized'], resources: ['*'] }));
  };

  // ---- POST /v1/cabinets/{cabinetId}/invites ----
  const createInviteFn = nodeFn(stack, 'InvitesCreateHandler', {
    serviceName: 'members-invites-create',
    entry: entry('invites/create-handler.ts'),
    environment: commonEnv,
  });
  cabinetsTable.grantReadWriteData(createInviteFn);
  grantAuthzReads(createInviteFn);
  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/cabinets/{cabinetId}/invites', createInviteFn, { auth: 'jwt' });

  // ---- POST /v1/invites/{code}/accept ----
  const acceptInviteFn = nodeFn(stack, 'InvitesAcceptHandler', {
    serviceName: 'members-invites-accept',
    entry: entry('invites/accept-handler.ts'),
    environment: { CABINETS_TABLE: cabinetsTableName },
  });
  cabinetsTable.grantReadWriteData(acceptInviteFn);
  addRoute(stack, stage, apigwv2.HttpMethod.POST, '/v1/invites/{code}/accept', acceptInviteFn, { auth: 'jwt' });

  // ---- PATCH /v1/cabinets/{cabinetId}/members/{userId} ----
  const updateMemberFn = nodeFn(stack, 'MembersUpdateHandler', {
    serviceName: 'members-update',
    entry: entry('members/update-handler.ts'),
    environment: commonEnv,
  });
  cabinetsTable.grantReadWriteData(updateMemberFn);
  grantAuthzReads(updateMemberFn);
  addRoute(stack, stage, apigwv2.HttpMethod.PATCH, '/v1/cabinets/{cabinetId}/members/{userId}', updateMemberFn, { auth: 'jwt' });

  // ---- DELETE /v1/cabinets/{cabinetId}/members/{userId} ----
  const deleteMemberFn = nodeFn(stack, 'MembersDeleteHandler', {
    serviceName: 'members-delete',
    entry: entry('members/delete-handler.ts'),
    environment: commonEnv,
  });
  cabinetsTable.grantReadWriteData(deleteMemberFn);
  grantAuthzReads(deleteMemberFn);
  addRoute(stack, stage, apigwv2.HttpMethod.DELETE, '/v1/cabinets/{cabinetId}/members/{userId}', deleteMemberFn, { auth: 'jwt' });
}
