import { Amplify } from 'aws-amplify';

/**
 * Cognito config comes from Vite build-time env vars, set from the SSM params
 * T02's shared stack exports (/asli/<stage>/cognito/*, see packages/contracts/src/ssm.ts).
 * X (integrator) wires these into the Amplify Hosting build environment for `int`.
 */
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined;
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID as string | undefined;

export const authConfigured = Boolean(userPoolId && userPoolClientId);

if (authConfigured) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: userPoolId!,
        userPoolClientId: userPoolClientId!,
      },
    },
  });
}
