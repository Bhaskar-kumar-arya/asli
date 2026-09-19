import type {
  AddMedicineRequest,
  Cabinet,
  CabinetDetail,
  CabinetList,
  CreateCabinetRequest,
  CreateInviteRequest,
  Invite,
  Member,
  MedicineWithStatus,
  UpdateMemberRequest,
} from '@asli/contracts';
import { apiClient } from './client';

export function listCabinets(): Promise<CabinetList> {
  return apiClient.get<CabinetList>('/cabinets');
}

export function createCabinet(req: CreateCabinetRequest): Promise<Cabinet> {
  return apiClient.post<Cabinet>('/cabinets', req);
}

export function getCabinet(cabinetId: string): Promise<CabinetDetail> {
  return apiClient.get<CabinetDetail>(`/cabinets/${cabinetId}`);
}

export function addMedicine(cabinetId: string, req: AddMedicineRequest): Promise<MedicineWithStatus> {
  return apiClient.post<MedicineWithStatus>(`/cabinets/${cabinetId}/medicines`, req);
}

export function removeMedicine(cabinetId: string, medId: string): Promise<void> {
  return apiClient.delete<void>(`/cabinets/${cabinetId}/medicines/${medId}`);
}

export function createInvite(cabinetId: string, req: CreateInviteRequest): Promise<Invite> {
  return apiClient.post<Invite>(`/cabinets/${cabinetId}/invites`, req);
}

export function acceptInvite(code: string): Promise<Cabinet> {
  return apiClient.post<Cabinet>(`/invites/${code}/accept`);
}

export function updateMember(cabinetId: string, userId: string, req: UpdateMemberRequest): Promise<Member> {
  return apiClient.patch<Member>(`/cabinets/${cabinetId}/members/${userId}`, req);
}

export function removeMember(cabinetId: string, userId: string): Promise<void> {
  return apiClient.delete<void>(`/cabinets/${cabinetId}/members/${userId}`);
}
