/**
 * SSM parameter paths shared resources are exported under, relative to
 * `/asli/<stage>/...` (see infra/lib/ssm.ts `ssmName`/`importParam`).
 * Lane stacks import these instead of hardcoding path strings.
 */

/** Physical table names (without the `asli-<stage>-` prefix CDK adds). */
export const TABLE_NAMES = [
  'flagged-batches',
  'ingestion-state',
  'cabinets',
  'push-subscriptions',
  'reference',
  'stats',
  'reports',
  'idempotency',
] as const;
export type TableName = (typeof TABLE_NAMES)[number];

/** Physical bucket suffixes (buckets are named `asli-<stage>-<suffix>`). */
export const BUCKET_NAMES = ['raw', 'uploads', 'public'] as const;
export type BucketName = (typeof BUCKET_NAMES)[number];

export const SSM_PATHS = {
  table: (name: TableName): string => `/table/${name}`,
  tableStream: (name: TableName): string => `/table/${name}/stream`,
  bucket: (name: BucketName): string => `/bucket/${name}`,
  sns: {
    alerts: '/sns/alerts',
    ops: '/sns/ops',
  },
  dlq: {
    url: '/dlq/url',
    arn: '/dlq/arn',
  },
  cognito: {
    userPoolId: '/cognito/userPoolId',
    userPoolClientId: '/cognito/userPoolClientId',
    userPoolDomain: '/cognito/userPoolDomain',
  },
  httpApi: {
    id: '/api/httpApiId',
    endpoint: '/api/endpoint',
    jwtAuthorizerId: '/api/jwtAuthorizerId',
  },
  avp: {
    policyStoreId: '/avp/policyStoreId',
  },
  vapid: {
    secretArn: '/vapid/secretArn',
    publicKey: '/vapid/publicKey',
  },
  bedrock: {
    visionModelId: '/bedrock/visionModelId',
  },
} as const;
