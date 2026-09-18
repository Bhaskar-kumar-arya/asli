// Placeholder until D1 ships real sign-in. D1 owns apps/web/src/features/auth/** (screen 1);
// once that lands, swap these two functions for whatever it exports and delete this file.
const ID_TOKEN_KEY = 'asli.idToken';
const USER_ID_KEY = 'asli.userId';

export function getIdToken(): string | null {
  try {
    return localStorage.getItem(ID_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getCurrentUserId(): string | null {
  try {
    return localStorage.getItem(USER_ID_KEY);
  } catch {
    return null;
  }
}
