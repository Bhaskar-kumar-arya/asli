import type { RouteObject } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';

/** Public, no auth (docs/API.md `GET /v1/public/metrics`). */
export const dashboardRoutes: RouteObject[] = [{ path: '/dashboard', element: <DashboardPage /> }];
