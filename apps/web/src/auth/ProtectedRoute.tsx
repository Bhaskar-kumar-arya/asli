import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div role="status" style={{ padding: '2rem', textAlign: 'center' }}>
        Loading…
      </div>
    );
  }

  if (status === 'signed-out') {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}
