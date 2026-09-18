import { SSMClient } from '@aws-sdk/client-ssm';
import { VerifiedPermissionsClient } from '@aws-sdk/client-verifiedpermissions';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { createAuthz } from '@asli/authz';
import type { Authz } from '@asli/authz';
import { createSsmParamLoader } from './config';

export interface AuthzFactoryDeps {
  ddb: DynamoDBDocumentClient;
  cabinetsTable: string;
  authzModeParam: string;
  avpPolicyStoreIdParam: string;
  ssmClient?: SSMClient;
  avpClient?: VerifiedPermissionsClient;
}

export interface AuthzResolution {
  authz: Authz;
  mode: 'stub' | 'avp';
}

/**
 * Builds an Authz instance per invocation from the SSM-backed mode switch
 * (docs/PERMISSIONS.md). Falls back to `stub` if the mode param can't be read
 * or holds anything other than "avp" - `stub` itself still denies by default
 * on any DynamoDB error, so this never fails open.
 */
export function createAuthzFactory(deps: AuthzFactoryDeps): () => Promise<AuthzResolution> {
  const ssmClient = deps.ssmClient ?? new SSMClient({});
  const avpClient = deps.avpClient ?? new VerifiedPermissionsClient({});
  const loadMode = createSsmParamLoader(ssmClient, deps.authzModeParam);
  const loadPolicyStoreId = createSsmParamLoader(ssmClient, deps.avpPolicyStoreIdParam);

  return async () => {
    let mode: string;
    try {
      mode = await loadMode();
    } catch {
      mode = 'stub';
    }
    if (mode === 'avp') {
      const policyStoreId = await loadPolicyStoreId();
      return {
        mode: 'avp',
        authz: createAuthz({ mode: 'avp', ddb: deps.ddb, cabinetsTable: deps.cabinetsTable, policyStoreId, avpClient }),
      };
    }
    return { mode: 'stub', authz: createAuthz({ mode: 'stub', ddb: deps.ddb, cabinetsTable: deps.cabinetsTable }) };
  };
}
