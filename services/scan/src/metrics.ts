import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

/** docs/OBSERVABILITY_AND_COST.md metrics this lane emits. */
export const metrics = new Metrics({ namespace: 'Asli', serviceName: 'scan-api' });

export function recordBedrockTokens(purpose: 'strip' | 'bill', inputTokens: number, outputTokens: number): void {
  metrics.addDimension('purpose', purpose);
  metrics.addMetric('BedrockInputTokens', MetricUnit.Count, inputTokens);
  metrics.addMetric('BedrockOutputTokens', MetricUnit.Count, outputTokens);
}

/** docs/OBSERVABILITY_AND_COST.md: every Textract call emits a cost metric, same as Bedrock's token metrics. */
export function recordTextractPage(purpose: 'strip' | 'bill'): void {
  metrics.addDimension('purpose', purpose);
  metrics.addMetric('TextractPages', MetricUnit.Count, 1);
}

export function recordGeminiTokens(purpose: 'strip' | 'bill', inputTokens: number, outputTokens: number): void {
  metrics.addDimension('purpose', purpose);
  metrics.addMetric('GeminiInputTokens', MetricUnit.Count, inputTokens);
  metrics.addMetric('GeminiOutputTokens', MetricUnit.Count, outputTokens);
}

export function recordScanLatency(ms: number): void {
  metrics.addMetric('ScanLatencyMs', MetricUnit.Milliseconds, ms);
}

export function recordExtractionFailed(): void {
  metrics.addMetric('ExtractionFailed', MetricUnit.Count, 1);
}

export function recordCheckTier(tier: string): void {
  metrics.addDimension('tier', tier);
  metrics.addMetric('CheckTier', MetricUnit.Count, 1);
}

export function recordBatchCollisionIgnored(count: number): void {
  if (count <= 0) return;
  metrics.addMetric('BatchCollisionIgnored', MetricUnit.Count, count);
}
