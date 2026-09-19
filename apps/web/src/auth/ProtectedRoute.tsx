import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <main className="reg-sheet">
        <p role="status" className="reg-line" style={{ marginTop: '2rem' }}>
          <span className="reg-line__ellipsis">Opening the register</span>
        </p>
      </main>
    );
  }

  if (status === 'signed-out') {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}
