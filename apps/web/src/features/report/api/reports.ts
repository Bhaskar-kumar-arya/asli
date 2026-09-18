import type { MedicineIdentity, ProblemReportRequest, ProblemReportResponse } from '@asli/contracts';
import { apiFetch } from '../../../api/client';

export function postProblemReport(input: {
  identity: MedicineIdentity;
  alertRef?: string;
  problemType: string;
  note?: string;
}): Promise<ProblemReportResponse> {
  const body: ProblemReportRequest = {
    identity: input.identity,
    alertRef: input.alertRef,
    problemType: input.problemType,
    note: input.note,
  };
  return apiFetch<ProblemReportResponse>('/reports', { method: 'POST', body });
}
