import type { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import { PharmacyPage } from './pages/PharmacyPage';

export const pharmacyRoutes: RouteObject[] = [
  {
    path: '/pharmacy',
    element: (
      <ProtectedRoute>
        <PharmacyPage />
      </ProtectedRoute>
    ),
  },
];
