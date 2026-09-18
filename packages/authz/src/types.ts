import type { CabinetAction } from '@asli/contracts';

/** docs/PERMISSIONS.md "packages/authz interface". */
export interface Authz {
  isAllowed(userId: string, action: CabinetAction, cabinetId: string): Promise<boolean>;
}
