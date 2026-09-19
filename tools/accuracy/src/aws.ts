import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { CloudWatchClient, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { SSM_PATHS } from '@asli/contracts';

const REGION = 'ap-south-1';

export interface StageConfig {
  apiBaseUrl: string;
  userPoolClientId: string;
  publicBucket: string;
}

/**
 * Resolves the shared-resource SSM parameters (API endpoint, Cognito client, public bucket)
 * that only `shared-stack.ts` publishes, under `/asli/<sharedStage>/...`. Per CLAUDE.md, lanes
 * import shared resources via `SHARED_STAGE` (default `dev-shared`), not their own `--stage`.
 */
export async function resolveStageConfig(sharedStage: string = process.env.SHARED_STAGE ?? 'dev-shared'): Promise<StageConfig> {
  const client = new SSMClient({ region: REGION });
  const prefix = `/asli/${sharedStage}`;
  const names = [
    `${prefix}${SSM_PATHS.httpApi.endpoint}`,
    `${prefix}${SSM_PATHS.cognito.userPoolClientId}`,
    `${prefix}${SSM_PATHS.bucket('public')}`,
  ];
  const res = await client.send(new GetParametersCommand({ Names: names }));
  const byName = new Map((res.Parameters ?? []).map((p) => [p.Name, p.Value]));

  const missing = names.filter((n) => !byName.get(n));
  if (missing.length > 0) {
    throw new Error(`Missing SSM parameters for shared stage "${sharedStage}": ${missing.join(', ')}`);
  }

  return {
    apiBaseUrl: byName.get(names[0])!,
    userPoolClientId: byName.get(names[1])!,
    publicBucket: byName.get(names[2])!,
  };
}

/**
 * Signs in a test Cognito user via USER_PASSWORD_AUTH (CLAUDE.md: only the ingestion
 * pipeline talks to CDSCO directly; every other lane's live check goes through the
 * real API as a real user, never a service-role bypass).
 * Requires ASLI_TEST_USER_EMAIL / ASLI_TEST_USER_PASSWORD in the environment.
 */
export async function signInTestUser(userPoolClientId: string): Promise<string> {
  const email = process.env.ASLI_TEST_USER_EMAIL;
  const password = process.env.ASLI_TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error('Set ASLI_TEST_USER_EMAIL and ASLI_TEST_USER_PASSWORD to run against a deployed stage.');
  }

  const client = new CognitoIdentityProviderClient({ region: REGION });
  const res = await client.send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: userPoolClientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );

  const idToken = res.AuthenticationResult?.IdToken;
  if (!idToken) {
    throw new Error('Cognito sign-in did not return an IdToken.');
  }
  return idToken;
}

export interface TokenTotals {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Sums the BedrockInputTokens/BedrockOutputTokens EMF metrics (docs/OBSERVABILITY_AND_COST.md,
 * emitted by C) over the run window, so the report shows real measured token usage rather than
 * an estimate. Returns undefined (not zero) if CloudWatch is unreachable - an honest "unknown"
 * beats a fabricated number.
 */
export async function getBedrockTokenTotals(stage: string, start: Date, end: Date): Promise<TokenTotals | undefined> {
  try {
    const client = new CloudWatchClient({ region: REGION });
    const res = await client.send(
      new GetMetricDataCommand({
        StartTime: start,
        EndTime: end,
        MetricDataQueries: [
          {
            Id: 'inputTokens',
            MetricStat: {
              Metric: {
                Namespace: 'Asli',
                MetricName: 'BedrockInputTokens',
                Dimensions: [{ Name: 'stage', Value: stage }],
              },
              Period: 3600,
              Stat: 'Sum',
            },
          },
          {
            Id: 'outputTokens',
            MetricStat: {
              Metric: {
                Namespace: 'Asli',
                MetricName: 'BedrockOutputTokens',
                Dimensions: [{ Name: 'stage', Value: stage }],
              },
              Period: 3600,
              Stat: 'Sum',
            },
          },
        ],
      }),
    );
    const sum = (id: string): number => (res.MetricDataResults ?? []).find((r) => r.Id === id)?.Values?.reduce((a, b) => a + b, 0) ?? 0;
    return { inputTokens: sum('inputTokens'), outputTokens: sum('outputTokens') };
  } catch {
    return undefined;
  }
}

/** Uploads the harness report to the public bucket for the dashboard (J), docs/TESTING.md. */
export async function uploadPublicJson(bucket: string, key: string, body: unknown): Promise<void> {
  const client = new S3Client({ region: REGION });
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(body, null, 2),
      ContentType: 'application/json',
    }),
  );
}
