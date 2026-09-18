import type { CreateUploadRequest, CreateUploadResponse, PharmacyCheckResponse } from '@asli/contracts';
import { apiFetch } from '../../../api/client';

export const pharmacyApi = {
  createUpload: (contentType: string) =>
    apiFetch<CreateUploadResponse>('/uploads', { method: 'POST', body: { kind: 'pharmacy', contentType } satisfies CreateUploadRequest }),
  checkCsv: (csv: string) => apiFetch<PharmacyCheckResponse>('/pharmacy/checks', { method: 'POST', body: { csv } }),
  checkUpload: (uploadId: string) => apiFetch<PharmacyCheckResponse>('/pharmacy/checks', { method: 'POST', body: { uploadId } }),
};
