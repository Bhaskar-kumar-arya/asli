import { SSM_PATHS } from '@asli/contracts';
import {
  Stack,
  aws_apigatewayv2 as apigwv2,
  aws_apigatewayv2_integrations as apigwv2Integrations,
  aws_lambda as lambda,
} from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { importParam } from './ssm';
import { sharedStage } from './stage';

export type RouteAuth = 'jwt' | 'public' | 'admin';

export interface AddRouteOptions {
  auth: RouteAuth;
}

// Imported-resource constructs must live in the stack that uses them, so this is cached
// per-stack (not globally) - one lane stack can call addRoute many times without creating
// a duplicate import each time, but two different stacks never share one import construct.
const apiByStack = new WeakMap<Stack, apigwv2.IHttpApi>();
const authorizerByStack = new WeakMap<Stack, apigwv2.IHttpRouteAuthorizer>();

function sharedHttpApi(scope: Construct): apigwv2.IHttpApi {
  const stack = Stack.of(scope);
  let api = apiByStack.get(stack);
  if (!api) {
    const stage = sharedStage();
    api = apigwv2.HttpApi.fromHttpApiAttributes(stack, 'SharedHttpApi', {
      httpApiId: importParam(stack, stage, SSM_PATHS.httpApi.id),
    });
    apiByStack.set(stack, api);
  }
  return api;
}

function jwtAuthorizer(scope: Construct): apigwv2.IHttpRouteAuthorizer {
  const stack = Stack.of(scope);
  let authorizer = authorizerByStack.get(stack);
  if (!authorizer) {
    const stage = sharedStage();
    authorizer = apigwv2.HttpAuthorizer.fromHttpAuthorizerAttributes(stack, 'SharedJwtAuthorizer', {
      authorizerId: importParam(stack, stage, SSM_PATHS.httpApi.jwtAuthorizerId),
      authorizerType: 'JWT',
    });
    authorizerByStack.set(stack, authorizer);
  }
  return authorizer;
}

/**
 * Add a route to the shared HTTP API from a lane's own stack (see docs/API.md).
 *
 * `auth: "jwt"` and `"admin"` both attach the shared Cognito JWT authorizer - API Gateway's
 * JWT authorizer only validates the token (signature, issuer, audience), it can't check the
 * `cognito:groups` claim. Lanes using `"admin"` (currently only A2's demo replay endpoint) must
 * additionally check `event.requestContext.authorizer.jwt.claims['cognito:groups']` includes
 * `"admin"` inside the handler, and reject with FORBIDDEN otherwise.
 */
export function addRoute(
  scope: Construct,
  _stage: string,
  method: apigwv2.HttpMethod,
  path: string,
  fn: lambda.IFunction,
  options: AddRouteOptions,
): apigwv2.HttpRoute {
  const httpApi = sharedHttpApi(scope);
  const routeId = `Route-${method}-${path.replace(/[^A-Za-z0-9]/g, '')}`;
  const integration = new apigwv2Integrations.HttpLambdaIntegration(`${routeId}-Integration`, fn);

  return new apigwv2.HttpRoute(scope, routeId, {
    httpApi,
    routeKey: apigwv2.HttpRouteKey.with(path, method),
    integration,
    authorizer: options.auth === 'public' ? undefined : jwtAuthorizer(scope),
  });
}
