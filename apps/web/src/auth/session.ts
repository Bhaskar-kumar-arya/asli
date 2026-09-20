import './amplifyConfig';
import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  confirmSignIn,
  type SignInInput,
} from 'aws-amplify/auth';
import { isMockMode } from '../mocks/isMockMode';

const MOCK_TOKEN = 'mock-id-token';

export async function getIdToken(): Promise<string | undefined> {
  if (isMockMode()) return MOCK_TOKEN;
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  } catch {
    return undefined;
  }
}

export async function getCurrentUserId(): Promise<string | undefined> {
  if (isMockMode()) return 'mock-user-id';
  try {
    const user = await getCurrentUser();
    return user.userId;
  } catch {
    return undefined;
  }
}

export async function isSignedIn(): Promise<boolean> {
  if (isMockMode()) return true;
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}

export async function emailSignIn(email: string, password: string) {
  const input: SignInInput = { username: email, password };
  return signIn(input);
}

/**
 * The pool's own policy (infra/lib/shared-stack.ts): 8+ characters, one lowercase
 * letter, one digit. No uppercase or symbol is required. Printed on the form so the
 * rule arrives before the attempt rather than as a rejection after it.
 */
export const PASSWORD_RULE = 'At least 8 characters, with one lowercase letter and one number.';

export function passwordProblem(password: string): string | undefined {
  if (password.length < 8) return 'Use at least 8 characters.';
  if (!/[a-z]/.test(password)) return 'Include at least one lowercase letter.';
  if (!/\d/.test(password)) return 'Include at least one number.';
  return undefined;
}

/** `true` when the account exists but still needs its emailed code. */
export type SignUpOutcome = 'CONFIRM' | 'DONE';

export async function emailSignUp(email: string, password: string): Promise<SignUpOutcome> {
  if (isMockMode()) return 'CONFIRM';
  const { nextStep } = await signUp({
    username: email,
    password,
    options: { userAttributes: { email } },
  });
  return nextStep.signUpStep === 'DONE' ? 'DONE' : 'CONFIRM';
}

export async function confirmEmail(email: string, code: string): Promise<void> {
  if (isMockMode()) return;
  await confirmSignUp({ username: email, confirmationCode: code });
}

export async function resendEmailCode(email: string): Promise<void> {
  if (isMockMode()) return;
  await resendSignUpCode({ username: email });
}

/** Raised when sign-in finds an account whose email was never confirmed. */
export const UNCONFIRMED = 'UserNotConfirmedException';

export function errorName(err: unknown): string {
  return err instanceof Error ? err.name : '';
}

/**
 * Cognito's own messages are terse and occasionally alarming. These are the plain
 * equivalents; anything unrecognised falls back to the caller's line rather than
 * leaking a service exception to the user.
 */
export function authErrorMessage(err: unknown, fallback: string): string {
  switch (errorName(err)) {
    case 'UsernameExistsException':
      return 'An account already exists for this email. Try signing in instead.';
    case 'InvalidPasswordException':
      return `That password does not meet the requirements. ${PASSWORD_RULE}`;
    case 'InvalidParameterException':
      return 'Check the email address and password, then try again.';
    case 'CodeMismatchException':
      return 'That code does not match the one we emailed. Check it and try again.';
    case 'ExpiredCodeException':
      return 'That code has expired. Send a new one and try again.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return 'Too many attempts. Please wait a minute and try again.';
    case 'UserLambdaValidationException':
      return 'We could not create this account. Please try a different email.';
    default:
      return fallback;
  }
}

export { confirmSignIn, signOut };
