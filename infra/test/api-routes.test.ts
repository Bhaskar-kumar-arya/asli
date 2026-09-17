import { App, Stack, aws_apigatewayv2 as apigwv2, aws_lambda as lambda } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, it } from 'vitest';
import { addRoute } from '../lib/api-routes';

describe('addRoute (dummy lane stack)', () => {
  it('adds a route + integration referencing the shared HTTP API and JWT authorizer by SSM-imported id', () => {
    const app = new App();
    const stack = new Stack(app, 'DummyLaneStack', { env: { account: '111111111111', region: 'ap-south-1' } });

    const fn = new lambda.Function(stack, 'DummyHandler', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200 });'),
    });

    addRoute(stack, 'dev-a1', apigwv2.HttpMethod.POST, '/v1/dummy', fn, { auth: 'jwt' });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ApiGatewayV2::Route', 1);
    template.resourceCountIs('AWS::ApiGatewayV2::Integration', 1);
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'POST /v1/dummy',
    });
  });

  it('adds a public route with no authorizer', () => {
    const app = new App();
    const stack = new Stack(app, 'DummyPublicLaneStack', { env: { account: '111111111111', region: 'ap-south-1' } });

    const fn = new lambda.Function(stack, 'DummyHandler', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({ statusCode: 200 });'),
    });

    addRoute(stack, 'dev-g1', apigwv2.HttpMethod.GET, '/v1/public/stats', fn, { auth: 'public' });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'GET /v1/public/stats',
      AuthorizationType: 'NONE',
    });
  });
});
