import type {
  CheckRequest,
  CheckResponse,
  CreateUploadRequest,
  CreateUploadResponse,
  ScanRequest,
  ScanResponse,
  AlertDetail,
  VapidPublicKeyResponse,
  PushSubscriptionRequest,
  CabinetList,
  AddMedicineRequest,
  MedicineWithStatus,
} from '@asli/contracts';
import { apiFetch } from './client';

export const api = {
  createUpload: (body: CreateUploadRequest) => apiFetch<CreateUploadResponse>('/uploads', { method: 'POST', body }),
  createScan: (body: ScanRequest) => apiFetch<ScanResponse>('/scans', { method: 'POST', body }),
  createCheck: (body: CheckRequest) => apiFetch<CheckResponse>('/checks', { method: 'POST', body }),
  getAlert: (alertRef: string) => apiFetch<AlertDetail>(`/alerts/${encodeURIComponent(alertRef)}`),
  getVapidPublicKey: () => apiFetch<VapidPublicKeyResponse>('/push/vapid-public-key'),
  subscribePush: (body: PushSubscriptionRequest) => apiFetch<void>('/push/subscriptions', { method: 'POST', body }),
  unsubscribePush: (endpoint: string) =>
    apiFetch<void>('/push/subscriptions', { method: 'DELETE', body: { endpoint } }),
  sendTestPush: () => apiFetch<void>('/push/test', { method: 'POST' }),
  getCabinets: () => apiFetch<CabinetList>('/cabinets'),
  addMedicine: (cabinetId: string, body: AddMedicineRequest) =>
    apiFetch<MedicineWithStatus>(`/cabinets/${encodeURIComponent(cabinetId)}/medicines`, { method: 'POST', body }),
};
