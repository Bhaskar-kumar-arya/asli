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
  return apiClient.get<CabinetList>('/v1/cabinets');
}

export function createCabinet(req: CreateCabinetRequest): Promise<Cabinet> {
  return apiClient.post<Cabinet>('/v1/cabinets', req);
}

export function getCabinet(cabinetId: string): Promise<CabinetDetail> {
  return apiClient.get<CabinetDetail>(`/v1/cabinets/${cabinetId}`);
}

export function addMedicine(cabinetId: string, req: AddMedicineRequest): Promise<MedicineWithStatus> {
  return apiClient.post<MedicineWithStatus>(`/v1/cabinets/${cabinetId}/medicines`, req);
}

export function removeMedicine(cabinetId: string, medId: string): Promise<void> {
  return apiClient.delete<void>(`/v1/cabinets/${cabinetId}/medicines/${medId}`);
}

export function createInvite(cabinetId: string, req: CreateInviteRequest): Promise<Invite> {
  return apiClient.post<Invite>(`/v1/cabinets/${cabinetId}/invites`, req);
}

export function acceptInvite(code: string): Promise<Cabinet> {
  return apiClient.post<Cabinet>(`/v1/invites/${code}/accept`);
}

export function updateMember(cabinetId: string, userId: string, req: UpdateMemberRequest): Promise<Member> {
  return apiClient.patch<Member>(`/v1/cabinets/${cabinetId}/members/${userId}`, req);
}

export function removeMember(cabinetId: string, userId: string): Promise<void> {
  return apiClient.delete<void>(`/v1/cabinets/${cabinetId}/members/${userId}`);
}
