import type { Environment } from 'aws-cdk-lib';

export const REGION = 'ap-south-1';

/** The stage this process's own stack deploys to, e.g. "dev-a1" or "int". Required. */
export function requireStage(): string {
  const stage = process.env.STAGE;
  if (!stage) {
    throw new Error('STAGE env var is required, e.g. STAGE=dev-a1');
  }
  return stage;
}

/** The stage shared resources are imported from. Defaults to "dev-shared". */
export function sharedStage(): string {
  return process.env.SHARED_STAGE ?? 'dev-shared';
}

/** CDK environment (account from the CLI/credentials, fixed region). */
export function cdkEnv(): Environment {
  return {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: REGION,
  };
}

/** Stack name convention: <StackPrefix>-<stage>, e.g. LaneA1Stack-dev-a1. */
export function stackName(prefix: string, stage: string): string {
  return `${prefix}-${stage}`;
}
