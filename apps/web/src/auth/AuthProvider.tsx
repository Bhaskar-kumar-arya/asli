import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isSignedIn as checkSignedIn } from './session';

interface AuthState {
  status: 'loading' | 'signed-in' | 'signed-out';
  refresh: () => void;
}

const AuthContext = createContext<AuthState>({ status: 'loading', refresh: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');

  const refresh = () => {
    setStatus('loading');
    void checkSignedIn().then((ok) => setStatus(ok ? 'signed-in' : 'signed-out'));
  };

  useEffect(refresh, []);

  return <AuthContext.Provider value={{ status, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
