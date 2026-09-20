import * as path from 'node:path';
import { SSM_PATHS } from '@asli/contracts';
import { Stack, aws_apigatewayv2 as apigwv2, aws_s3 as s3, type App } from 'aws-cdk-lib';
import { addRoute } from '../api-routes';
import { nodeFn } from '../node-fn';
import { importParam } from '../ssm';
import { cdkEnv, sharedStage, stackName } from '../stage';

/**
 * Lane I: content/guidance HTTP API, plus the public-bucket audio redirect
 * (docs/SAFETY_AND_CONTENT.md "Read-aloud"). Guidance templates are bundled data in
 * `packages/content` (no table/bucket read on the request path). Audio does read the shared
 * public bucket - `scripts/content/audio.ts` renders Polly MP3s to
 * `asli-<stage>-public/audio/<lang>/<key>.mp3` offline, and that bucket blocks all public
 * access (infra/lib/shared-stack.ts `PublicBucket`), so this lane's own Lambda presigns a
 * short-lived GET URL rather than serving the bytes itself.
 */
export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneIStack', stage), { env: cdkEnv() });

  const guidanceFn = nodeFn(stack, 'GuidanceHandler', {
    serviceName: 'i-content-guidance',
    entry: path.join(__dirname, '../../../services/content/src/handlers/guidance.ts'),
  });
  addRoute(stack, stage, apigwv2.HttpMethod.GET, '/v1/content/guidance/{guidanceKey}', guidanceFn, { auth: 'public' });

  const shared = sharedStage();
  const publicBucketName = importParam(stack, shared, SSM_PATHS.bucket('public'));
  const publicBucket = s3.Bucket.fromBucketName(stack, 'PublicBucket', publicBucketName);

  const audioFn = nodeFn(stack, 'AudioHandler', {
    serviceName: 'i-content-audio',
    entry: path.join(__dirname, '../../../services/content/src/handlers/audio.ts'),
    environment: { PUBLIC_BUCKET_NAME: publicBucketName },
  });
  publicBucket.grantRead(audioFn, 'audio/*');
  addRoute(stack, stage, apigwv2.HttpMethod.GET, '/v1/public/audio/{lang}/{keyFile}', audioFn, { auth: 'public' });
}
