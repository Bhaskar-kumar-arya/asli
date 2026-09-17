import { aws_ssm as ssm } from 'aws-cdk-lib';
import type { Construct } from 'constructs';

/** Namespaced SSM parameter name: /asli/<stage>/<path>. `path` should start with "/". */
export function ssmName(stage: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/asli/${stage}${normalized}`;
}

/** Import a shared SSM string parameter by stage + path. */
export function importParam(scope: Construct, stage: string, path: string): string {
  return ssm.StringParameter.valueForStringParameter(scope, ssmName(stage, path));
}
