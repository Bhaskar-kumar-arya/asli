import type { CabinetAction, Role } from '@asli/contracts';

/**
 * docs/PERMISSIONS.md role table, mirrored by the `stub` mode and by
 * packages/authz/policies/*.cedar for the `avp` mode. Keep all three in sync.
 */
export const ROLE_ACTIONS: Record<Role, readonly CabinetAction[]> = {
  OWNER: ['ViewCabinet', 'AddMedicine', 'RemoveMedicine', 'ManageMembers', 'ReceiveAlerts'],
  EDITOR: ['ViewCabinet', 'AddMedicine', 'RemoveMedicine', 'ReceiveAlerts'],
  VIEWER: ['ViewCabinet', 'ReceiveAlerts'],
};

export function roleAllows(role: Role, action: CabinetAction): boolean {
  return ROLE_ACTIONS[role].includes(action);
}
