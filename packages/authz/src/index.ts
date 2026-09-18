import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { VerifiedPermissionsClient } from '@aws-sdk/client-verifiedpermissions';
import { createAvpAuthz } from './avp';
import { createStubAuthz } from './stub';
import type { Authz } from './types';

export type { Authz } from './types';
export { ROLE_ACTIONS, roleAllows } from './roles';

export interface CreateAuthzOptions {
  mode: 'stub' | 'avp';
  ddb: DynamoDBDocumentClient;
  cabinetsTable: string;
  /** required when mode: 'avp' */
  policyStoreId?: string;
  avpClient?: VerifiedPermissionsClient;
  /** overridable for tests; defaults to Date.now */
  now?: () => number;
}

/**
 * docs/PERMISSIONS.md "packages/authz interface". Owned by lane H; imported by
 * F, G1, H, N. `stub`: role table in code. `avp`: Verified Permissions
 * IsAuthorized with entities built from the Cabinets table, 30s cache, deny by
 * default on any error.
 */
export function createAuthz(opts: CreateAuthzOptions): Authz {
  if (opts.mode === 'stub') {
    return createStubAuthz({ ddb: opts.ddb, cabinetsTable: opts.cabinetsTable });
  }
  if (!opts.policyStoreId || !opts.avpClient) {
    throw new Error('createAuthz({ mode: "avp" }) requires policyStoreId and avpClient');
  }
  return createAvpAuthz({
    avpClient: opts.avpClient,
    policyStoreId: opts.policyStoreId,
    ddb: opts.ddb,
    cabinetsTable: opts.cabinetsTable,
    now: opts.now,
  });
}
