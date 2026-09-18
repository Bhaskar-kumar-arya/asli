import type { CabinetAction, Role } from '@asli/contracts';

/**
 * docs/PERMISSIONS.md packages/authz interface, reimplemented locally in this
 * lane's own files: packages/authz is owned by H and still a placeholder, and
 * CLAUDE.md forbids editing another lane's package. `createAuthz({ mode: "stub" })`
 * mirrors the same role table AVP will enforce once H merges - swap the import
 * for `@asli/authz` at that point, the call signature is identical.
 */
export interface Authz {
  isAllowed(userId: string, action: CabinetAction, cabinetId: string): Promise<boolean>;
}

export type RoleLookup = (userId: string, cabinetId: string) => Promise<Role | undefined>;

const ROLE_ALLOWS: Record<Role, ReadonlySet<CabinetAction>> = {
  OWNER: new Set(['ViewCabinet', 'AddMedicine', 'RemoveMedicine', 'ManageMembers', 'ReceiveAlerts']),
  EDITOR: new Set(['ViewCabinet', 'AddMedicine', 'RemoveMedicine', 'ReceiveAlerts']),
  VIEWER: new Set(['ViewCabinet', 'ReceiveAlerts']),
};

/**
 * `mode: "avp"` is out of scope for this lane (H owns Verified Permissions);
 * kept in the type so callers can switch without a signature change later.
 * Deny by default on any error, per PERMISSIONS.md.
 */
export function createAuthz(opts: { mode: 'stub' | 'avp'; lookupRole: RoleLookup }): Authz {
  return {
    async isAllowed(userId, action, cabinetId) {
      try {
        const role = await opts.lookupRole(userId, cabinetId);
        if (!role) return false;
        return ROLE_ALLOWS[role].has(action);
      } catch {
        return false;
      }
    },
  };
}
