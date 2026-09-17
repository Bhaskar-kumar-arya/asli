import { Duration, aws_lambda as lambda, aws_logs as logs } from 'aws-cdk-lib';
import { NodejsFunction, type NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import type { Construct } from 'constructs';

/**
 * NodejsFunction with Asli's shared defaults: Node 22, arm64, 512 MB, 30 s,
 * esbuild minify + source maps, active X-Ray tracing, Powertools env vars, 2-week log retention.
 * Lanes override any field via `props`.
 */
export function nodeFn(
  scope: Construct,
  id: string,
  props: NodejsFunctionProps & { serviceName: string },
): NodejsFunction {
  const { serviceName, environment, bundling, ...rest } = props;

  return new NodejsFunction(scope, id, {
    runtime: lambda.Runtime.NODEJS_22_X,
    architecture: lambda.Architecture.ARM_64,
    memorySize: 512,
    timeout: Duration.seconds(30),
    tracing: lambda.Tracing.ACTIVE,
    logRetention: logs.RetentionDays.TWO_WEEKS,
    ...rest,
    bundling: {
      minify: true,
      sourceMap: true,
      target: 'node22',
      ...bundling,
    },
    environment: {
      POWERTOOLS_SERVICE_NAME: serviceName,
      POWERTOOLS_METRICS_NAMESPACE: 'Asli',
      POWERTOOLS_LOG_LEVEL: 'INFO',
      POWERTOOLS_LOGGER_SAMPLE_RATE: '0',
      POWERTOOLS_TRACE_ENABLED: 'true',
      ...environment,
    },
  });
}
