import { CloudFormationClient, DescribeStackResourcesCommand } from '@aws-sdk/client-cloudformation';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

const REGION = 'ap-south-1';
const cfn = new CloudFormationClient({ region: REGION });
const logs = new CloudWatchLogsClient({ region: REGION });

const physicalNameCache = new Map<string, string>();

/** Resolves a lane stack's Lambda physical function name from its CDK logical id prefix. */
async function resolveFunctionName(stackName: string, logicalIdPrefix: string): Promise<string> {
  const cacheKey = `${stackName}/${logicalIdPrefix}`;
  const cached = physicalNameCache.get(cacheKey);
  if (cached) return cached;

  const res = await cfn.send(new DescribeStackResourcesCommand({ StackName: stackName }));
  const resource = (res.StackResources ?? []).find(
    (r) => r.ResourceType === 'AWS::Lambda::Function' && r.LogicalResourceId?.startsWith(logicalIdPrefix),
  );
  if (!resource?.PhysicalResourceId) {
    throw new Error(`No Lambda function starting with "${logicalIdPrefix}" found in stack ${stackName}`);
  }
  physicalNameCache.set(cacheKey, resource.PhysicalResourceId);
  return resource.PhysicalResourceId;
}

/**
 * Polls a G1 (services/notify) Lambda's CloudWatch log group until a line matching
 * `predicate` appears after `sinceMs`, or `timeoutMs` elapses. Returns the matching line,
 * or null on timeout (a timeout is a real signal here, not just "keep waiting" - the
 * caller asserts on it).
 */
export async function waitForLogMatch(
  stage: string,
  handlerLogicalIdPrefix: 'PushSenderHandler' | 'EmailSenderHandler',
  predicate: (line: string) => boolean,
  sinceMs: number,
  timeoutMs: number,
): Promise<string | null> {
  const functionName = await resolveFunctionName(`LaneG1Stack-${stage}`, handlerLogicalIdPrefix);
  const logGroupName = `/aws/lambda/${functionName}`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await logs.send(
        new FilterLogEventsCommand({
          logGroupName,
          startTime: sinceMs,
        }),
      );
      const match = (res.events ?? []).map((e) => e.message ?? '').find(predicate);
      if (match) return match;
    } catch {
      // Log group may not exist yet on a cold-started Lambda - keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  return null;
}
