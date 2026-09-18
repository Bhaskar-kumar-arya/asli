import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import { SSM_PATHS } from '@asli/contracts';

const REGION = 'ap-south-1';

export interface StageConfig {
  apiBaseUrl: string;
  userPoolClientId: string;
}

/**
 * Resolves the SSM parameters the shared stack exports under `/asli/<sharedStage>/...`
 * (CLAUDE.md, docs/DATA_MODEL.md). The HTTP API and Cognito pool are single physical
 * resources owned by SHARED_STAGE (default "dev-shared") - lane stacks in other stages
 * (e.g. `int`) only add routes/resources to them via SSM import, they don't republish
 * their own endpoint/pool.
 */
export async function resolveStageConfig(sharedStage: string): Promise<StageConfig> {
  const client = new SSMClient({ region: REGION });
  const prefix = `/asli/${sharedStage}`;
  const names = [`${prefix}${SSM_PATHS.httpApi.endpoint}`, `${prefix}${SSM_PATHS.cognito.userPoolClientId}`];
  const res = await client.send(new GetParametersCommand({ Names: names }));
  const byName = new Map((res.Parameters ?? []).map((p) => [p.Name, p.Value]));
  const missing = names.filter((n) => !byName.get(n));
  if (missing.length > 0) {
    throw new Error(`Missing SSM parameters for stage "${sharedStage}": ${missing.join(', ')}`);
  }
  return {
    apiBaseUrl: byName.get(names[0])!,
    userPoolClientId: byName.get(names[1])!,
  };
}

/**
 * Signs in the e2e test Cognito user via USER_PASSWORD_AUTH - the same non-interactive
 * flow tools/accuracy uses (CLAUDE.md: every lane's live check goes through the real API
 * as a real user, never a service-role bypass). Requires ASLI_TEST_USER_EMAIL /
 * ASLI_TEST_USER_PASSWORD in the environment.
 */
export async function signInTestUser(userPoolClientId: string): Promise<string> {
  const email = process.env.ASLI_TEST_USER_EMAIL;
  const password = process.env.ASLI_TEST_USER_PASSWORD;
  if (!email || !password) {
    throw new Error('Set ASLI_TEST_USER_EMAIL and ASLI_TEST_USER_PASSWORD to run tests/e2e against a deployed stage.');
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
