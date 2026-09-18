import type { RouteObject } from 'react-router-dom';
import { InsightsPage } from './pages/InsightsPage';

/** Public, no auth (docs/API.md `GET /v1/public/insights`). */
export const insightsRoutes: RouteObject[] = [{ path: '/insights', element: <InsightsPage /> }];
