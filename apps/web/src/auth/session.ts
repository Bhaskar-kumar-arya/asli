import './amplifyConfig';
import { fetchAuthSession, getCurrentUser, signIn, signOut, confirmSignIn, type SignInInput } from 'aws-amplify/auth';
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

export { confirmSignIn, signOut };
