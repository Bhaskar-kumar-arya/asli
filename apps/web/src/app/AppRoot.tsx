import { useRoutes, useLocation, Navigate, type RouteObject } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { SignInScreen } from '../auth/SignInScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { OfflineBanner } from '../shell/components/OfflineBanner';
import { BottomNav } from '../shell/components/BottomNav';
import { HomeScreen } from './HomeScreen';
import { featureRoutes } from './routes';

const routes: RouteObject[] = [
  { path: '/sign-in', element: <SignInScreen /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <HomeScreen />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <SettingsScreen />
      </ProtectedRoute>
    ),
  },
  ...featureRoutes,
  { path: '*', element: <Navigate to="/" replace /> },
];

function Shell() {
  const location = useLocation();
  const element = useRoutes(routes);
  const hideNav = location.pathname === '/sign-in';

  return (
    <>
      <OfflineBanner />
      {element}
      {!hideNav ? <BottomNav /> : null}
    </>
  );
}

export function AppRoot() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
