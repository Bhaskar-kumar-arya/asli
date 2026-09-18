import type { AlertDetail } from '@asli/contracts';
import { apiClient } from './client';

export function getAlertDetail(alertRef: string): Promise<AlertDetail> {
  return apiClient.get<AlertDetail>(`/v1/alerts/${encodeURIComponent(alertRef)}`);
}
