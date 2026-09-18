import type { RouteObject } from 'react-router-dom';

/**
 * Shared route registry. Each lane adds exactly one import + one spread line
 * below, keeping entries sorted by lane ID so parallel lanes don't conflict
 * on the same lines (plan/tasks/D1-web-shell.md).
 */
// D2 adds:
import { scanRoutes } from '../features/scan/routes';
// D3 adds:
import { cabinetRoutes } from '../features/cabinet/routes';
// J adds: import { dashboardRoutes } from '../features/dashboard/routes';
// M adds: import { insightsRoutes } from '../features/insights/routes';
// N adds: import { pharmacyRoutes } from '../features/pharmacy/routes';

export const featureRoutes: RouteObject[] = [
  ...scanRoutes, // D2
  ...cabinetRoutes, // D3
  // ...dashboardRoutes, // J
  // ...insightsRoutes, // M
  // ...pharmacyRoutes, // N
];
