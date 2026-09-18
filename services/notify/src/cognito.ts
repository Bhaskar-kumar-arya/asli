import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { requiredEnv } from './ddb';

const cognito = new CognitoIdentityProviderClient({});

/**
 * Looks up a member's email by their Cognito `sub` (the userId stored on cabinet Member
 * items - docs/PRIVACY.md keeps email in Cognito, not the Cabinets table). Returns undefined
 * if no matching user is found (deleted account, etc.) so callers can skip that channel.
 */
export async function lookupEmail(userId: string): Promise<string | undefined> {
  const userPoolId = requiredEnv('USER_POOL_ID');

  const result = await cognito.send(
    new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `sub = "${userId}"`,
      Limit: 1,
    }),
  );

  const user = result.Users?.[0];
  const email = user?.Attributes?.find((attr) => attr.Name === 'email')?.Value;
  return email;
}
