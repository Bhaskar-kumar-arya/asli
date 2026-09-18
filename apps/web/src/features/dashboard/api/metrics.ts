import { apiFetch } from '../../../api/client';
import type { DashboardMetrics } from '../types';

export function getPublicMetrics(): Promise<DashboardMetrics> {
  return apiFetch<DashboardMetrics>('/public/metrics');
}
