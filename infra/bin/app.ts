#!/usr/bin/env node
import * as path from 'node:path';
import { App } from 'aws-cdk-lib';
import { registerLanes } from '../lib/load-lanes';
import { SharedStack } from '../lib/shared-stack';
import { cdkEnv, requireStage, stackName } from '../lib/stage';

const app = new App();
const stage = requireStage();

// SharedStack is only actually deployed for the stage that owns shared resources
// (SHARED_STAGE, default "dev-shared"). Other stages import its outputs via SSM instead
// of redeploying it - see infra/lib/ssm.ts.
if (stage === (process.env.SHARED_STAGE ?? 'dev-shared')) {
  new SharedStack(app, stackName('SharedStack', stage), { env: cdkEnv() });
}

registerLanes(app, stage, path.join(__dirname, '..', 'lib', 'lanes'));

app.synth();
