import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { requireEnv } from '../lib/env';

const ssm = new SSMClient({});
const lambda = new LambdaClient({});

/**
 * After the Map: invokes lane S's stats job if it's deployed, no-ops
 * otherwise (this task's Deliverable 4: "skip if absent"). Lane S publishes
 * its Lambda's ARN under this SSM path once it exists - no contract for that
 * path exists yet in packages/contracts/src/ssm.ts (see this task's Handoff
 * "Contract change requests"), so it's a plain string here rather than
 * SSM_PATHS.
 */
export async function handler(): Promise<{ invoked: boolean }> {
  const stage = requireEnv('STAGE');
  const paramName = `/asli/${stage}/lambda/statsJobArn`;

  let arn: string | undefined;
  try {
    const res = await ssm.send(new GetParameterCommand({ Name: paramName }));
    arn = res.Parameter?.Value;
  } catch (err) {
    if ((err as { name?: string }).name === 'ParameterNotFound') {
      return { invoked: false };
    }
    throw err;
  }

  if (!arn) return { invoked: false };

  await lambda.send(new InvokeCommand({ FunctionName: arn, InvocationType: 'Event' }));
  return { invoked: true };
}
