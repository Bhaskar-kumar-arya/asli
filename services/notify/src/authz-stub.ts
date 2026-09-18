import type { Role } from '@asli/contracts';

/**
 * Local copy of the stable `packages/authz` interface (docs/PERMISSIONS.md) in "stub" mode -
 * lane H hasn't merged the real package yet, so G1 (like F) uses the role table from
 * PERMISSIONS.md directly. Swap for `createAuthz({ mode: 'avp' })` once H merges; the call
 * site (recipients.ts) only depends on this interface, not on this file's internals.
 */
export type CabinetAction = 'ViewCabinet' | 'AddMedicine' | 'RemoveMedicine' | 'ManageMembers' | 'ReceiveAlerts';

const ROLE_ACTIONS: Record<Role, ReadonlySet<CabinetAction>> = {
  OWNER: new Set(['ViewCabinet', 'AddMedicine', 'RemoveMedicine', 'ManageMembers', 'ReceiveAlerts']),
  EDITOR: new Set(['ViewCabinet', 'AddMedicine', 'RemoveMedicine', 'ReceiveAlerts']),
  VIEWER: new Set(['ViewCabinet', 'ReceiveAlerts']),
};

/** Deny by default on any error, per docs/PERMISSIONS.md. */
export function isAllowedForRole(role: Role, action: CabinetAction): boolean {
  return ROLE_ACTIONS[role]?.has(action) ?? false;
}
