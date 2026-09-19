import { AdminDeleteUserCommand, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

/**
 * The JWT `sub` claim is the caller's stable identity, but Cognito's AdminDeleteUser needs
 * the pool's Username attribute, which isn't guaranteed to equal `sub` (this pool signs in
 * by email, see infra/lib/shared-stack.ts). Resolve it once via ListUsers' `sub = "..."`
 * filter, then delete by that resolved username.
 */
export async function deleteCognitoUserBySub(
  cognito: CognitoIdentityProviderClient,
  userPoolId: string,
  sub: string,
): Promise<void> {
  const found = await cognito.send(
    new ListUsersCommand({ UserPoolId: userPoolId, Filter: `sub = "${sub}"`, Limit: 1 }),
  );
  const username = found.Users?.[0]?.Username;
  if (!username) {
    // Already gone (e.g. a retried request after a prior success) - deleting an account
    // that's already deleted is not an error.
    return;
  }
  await cognito.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: username }));
}
