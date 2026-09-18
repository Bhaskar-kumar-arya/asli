import type { IngestLambdaArns } from './types';

/**
 * Pure builder for `asli-<stage>-ingest`'s Amazon States Language definition
 * (docs/ARCHITECTURE.md, this task's Deliverable 2). Kept as plain ASL JSON
 * rather than CDK's `aws_stepfunctions` constructs so it's unit-testable
 * without `cdk synth`, and so this "statemachine/**" path (owned by A2 per
 * the task file) stays free of the CDK dependency that belongs to
 * infra/lib/lanes/a2-ingestion.ts.
 *
 * Every Lambda task unwraps its result with `OutputPath: "$.Payload"` (the
 * `lambda:invoke` service integration otherwise wraps it in
 * `{Payload, StatusCode, ...}`), and each handler receives the whole running
 * context as its event and returns a superset of it - no ResultPath merging,
 * so downstream states always see every field earlier states added.
 */
export function buildIngestDefinition(arns: IngestLambdaArns): object {
  const catchToMarkFailed = {
    ErrorEquals: ['States.ALL'],
    ResultPath: '$.error',
    Next: 'MarkFailed',
  };

  const lambdaTask = (arn: string, extra: Record<string, unknown>): Record<string, unknown> => ({
    Type: 'Task',
    Resource: 'arn:aws:states:::lambda:invoke',
    Parameters: { FunctionName: arn, 'Payload.$': '$' },
    OutputPath: '$.Payload',
    Retry: [
      {
        ErrorEquals: [
          'Lambda.ServiceException',
          'Lambda.AWSLambdaException',
          'Lambda.SdkClientException',
          'Lambda.TooManyRequestsException',
        ],
        IntervalSeconds: 2,
        MaxAttempts: 3,
        BackoffRate: 2,
      },
    ],
    ...extra,
  });

  return {
    Comment: 'Asli ingestion pipeline - docs/ARCHITECTURE.md, plan/tasks/A2-ingestion-pipeline.md',
    StartAt: 'ExpandWork',
    States: {
      ExpandWork: lambdaTask(arns.expandWork, { Next: 'ProcessMonths' }),
      ProcessMonths: {
        Type: 'Map',
        ItemsPath: '$.items',
        MaxConcurrency: 1,
        ResultPath: null,
        Next: 'InvokeStatsIfPresent',
        Iterator: {
          StartAt: 'MarkRunning',
          States: {
            MarkRunning: lambdaTask(arns.markRunning, {
              Next: 'ChooseSource',
              Catch: [catchToMarkFailed],
            }),
            ChooseSource: {
              Type: 'Choice',
              Choices: [
                { Variable: '$.sourceType', StringEquals: 'ENDPOINT', Next: 'FetchMonth' },
                { Variable: '$.sourceType', StringEquals: 'FIXTURE', Next: 'LoadFixture' },
                { Variable: '$.sourceType', StringEquals: 'PDF', Next: 'PdfNotImplemented' },
              ],
              Default: 'PdfNotImplemented',
            },
            // A3 (PDF + Textract fallback) hasn't merged yet - placeholder Pass
            // state per this task's Deliverable 2, so ENDPOINT failure still
            // reaches a terminal FAILED state instead of the state machine
            // erroring with no matching Choice branch.
            PdfNotImplemented: {
              Type: 'Pass',
              Parameters: {
                'month.$': '$.month',
                'tab.$': '$.tab',
                'sourceType.$': '$.sourceType',
                reason: 'PDF_NOT_IMPLEMENTED: lane A3 has not merged the PDF/Textract fallback yet',
              },
              Next: 'MarkFailed',
            },
            FetchMonth: lambdaTask(arns.fetchMonth, {
              Next: 'NormalizeAndWrite',
              Catch: [catchToMarkFailed],
            }),
            LoadFixture: lambdaTask(arns.loadFixture, {
              Next: 'NormalizeAndWrite',
              Catch: [catchToMarkFailed],
            }),
            NormalizeAndWrite: lambdaTask(arns.normalizeAndWrite, {
              Next: 'MarkDone',
              Catch: [catchToMarkFailed],
            }),
            MarkDone: lambdaTask(arns.markDone, { End: true, Catch: [catchToMarkFailed] }),
            // Terminal for the iteration either way, so one bad month never
            // fails the whole Map - the other months still run.
            MarkFailed: lambdaTask(arns.markFailed, { End: true }),
          },
        },
      },
      InvokeStatsIfPresent: lambdaTask(arns.invokeStats, { Next: 'BuildReference' }),
      BuildReference: lambdaTask(arns.buildReference, { End: true }),
    },
  };
}
