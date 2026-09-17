import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';

/**
 * Owned by T02 (see CLAUDE.md "Infrastructure ownership").
 * Placeholder only - T02 replaces this with tables, buckets, SNS topic, Cognito,
 * HTTP API + JWT authorizer, Verified Permissions policy store, idempotency table,
 * and the SSM parameters under /asli/<stage>/... that lanes import from.
 */
export class SharedStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}
