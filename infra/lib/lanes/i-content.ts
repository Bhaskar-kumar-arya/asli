import * as path from 'node:path';
import { Stack, aws_apigatewayv2 as apigwv2, type App } from 'aws-cdk-lib';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { cdkEnv, stackName } from '../stage';

/**
 * Lane I: content/guidance HTTP API. Templates are bundled data in `packages/content` (no
 * table/bucket read on the request path - `packages/content` drafts hi/kn text and renders
 * audio offline via `scripts/content/*.ts`, uploaded to the shared public bucket separately),
 * so this lane owns exactly one Lambda + route and no shared-resource imports.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneIStack', stage), { env: cdkEnv() });

  const guidanceFn = nodeFn(stack, 'GuidanceHandler', {
    serviceName: 'i-content-guidance',
    entry: path.join(__dirname, '../../../services/content/src/handlers/guidance.ts'),
  });
  addRoute(stack, stage, apigwv2.HttpMethod.GET, '/v1/content/guidance/{guidanceKey}', guidanceFn, { auth: 'public' });
}
