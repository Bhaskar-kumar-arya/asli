import type { PublicStats } from '@asli/contracts';
import { apiFetch } from '../../../api/client';
import type { InsightsDetail } from '../types';

export function getPublicInsights(): Promise<InsightsDetail> {
  return apiFetch<InsightsDetail>('/public/insights');
}

/** Same numbers `GET /v1/public/stats` (lane S) serves - reused verbatim for the headline
 * cards so this page's totals can never drift from S's (this task's acceptance criteria). */
export function getPublicStats(): Promise<PublicStats> {
  return apiFetch<PublicStats>('/public/stats');
}
