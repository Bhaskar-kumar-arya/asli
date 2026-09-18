import type { PricingKey, PricingTable } from '@asli/contracts';
import type { MeasuredUsage } from './cloudwatch';

/**
 * Assumptions the cost model states explicitly (docs/OBSERVABILITY_AND_COST.md
 * "Cost per scan = ... ; Projection at 10,000 families = ... (scans per month
 * assumption, stated explicitly)"). Every number here is a documented estimate,
 * not a measurement - CloudWatch only measures Bedrock tokens, Textract pages,
 * Translate/Polly characters, and scan latency directly.
 */
export const ASSUMPTIONS = {
  /** infra/lib/node-fn.ts default Lambda memory - used with measured scan latency to estimate GB-seconds. */
  lambdaMemoryMb: 512,
  /** One API Gateway request for the scan call itself, one more for the presigned upload. */
  apiGatewayRequestsPerScan: 2,
  /** One upload PUT, one snapshot GET, per scan. */
  s3PutsPerScan: 1,
  s3GetsPerScan: 1,
  /** Fixed Step Functions transitions per ingestion run (expand-work, map start/end, done) plus one per ingested row. */
  stateTransitionsPerRow: 1,
  fixedStateTransitionsPerRun: 4,
  /** One DynamoDB write and one raw-snapshot S3 PUT per ingested row. */
  dynamoWritesPerRow: 1,
  s3PutsPerRow: 1,
  /** Rough Lambda cost for the non-per-row steps of a run (expand-work, done), in GB-seconds. */
  lambdaGbSecondsFixedPerRun: 2,

  /** 10,000-family projection (docs/OBSERVABILITY_AND_COST.md) - all three numbers are stated
   * assumptions, not measurements, and should be tuned once real usage patterns are known. */
  projectedFamilies: 10_000,
  avgMedicinesPerFamily: 5,
  scansPerFamilyPerMonth: 2,
  newAlertFanoutsPerMonth: 4,
  /** Families notified per fan-out, and pushes+emails sent per notified family. */
  familiesNotifiedPerFanout: 50,
  notificationsPerFamily: 2,
} as const;

function price(pricing: PricingTable, key: PricingKey): number | undefined {
  return pricing[key]?.pricePerUnit;
}

/** `a*b` if both defined, else undefined - keeps "unknown" honest instead of silently treating it as 0. */
function mul(...factors: (number | undefined)[]): number | undefined {
  return factors.every((f) => f !== undefined) ? factors.reduce((acc, f) => (acc as number) * (f as number), 1) : undefined;
}
function add(...terms: (number | undefined)[]): number | undefined {
  return terms.every((t) => t !== undefined) ? terms.reduce((acc, t) => (acc as number) + (t as number), 0) : undefined;
}

export interface CostPerScan {
  bedrockUsd?: number;
  lambdaUsd?: number;
  apiGatewayUsd?: number;
  s3Usd?: number;
  totalUsd?: number;
}

/** Cost per scan, from measured 24h averages (docs/OBSERVABILITY_AND_COST.md "Cost per scan"). */
export function computeCostPerScan(pricing: PricingTable, usage: MeasuredUsage): CostPerScan {
  if (usage.scanCount <= 0) {
    return {};
  }
  const avgInputTokens = usage.bedrockInputTokens / usage.scanCount;
  const avgOutputTokens = usage.bedrockOutputTokens / usage.scanCount;

  const bedrockUsd = add(
    mul(avgInputTokens / 1000, price(pricing, 'bedrockInputTokenPer1k')),
    mul(avgOutputTokens / 1000, price(pricing, 'bedrockOutputTokenPer1k')),
  );

  const avgGbSeconds =
    usage.scanLatencyAvgMs !== undefined ? (ASSUMPTIONS.lambdaMemoryMb / 1024) * (usage.scanLatencyAvgMs / 1000) : undefined;
  const lambdaUsd = add(mul(avgGbSeconds, price(pricing, 'lambdaGbSecond')), price(pricing, 'lambdaRequest'));

  const apiGatewayUsd = mul(ASSUMPTIONS.apiGatewayRequestsPerScan, price(pricing, 'apiGatewayRequest'));

  const s3Usd = add(
    mul(ASSUMPTIONS.s3PutsPerScan, price(pricing, 's3Put')),
    mul(ASSUMPTIONS.s3GetsPerScan, price(pricing, 's3Get')),
  );

  return { bedrockUsd, lambdaUsd, apiGatewayUsd, s3Usd, totalUsd: add(bedrockUsd, lambdaUsd, apiGatewayUsd, s3Usd) };
}

export interface CostPerIngestionRun {
  stepFunctionsUsd?: number;
  dynamoUsd?: number;
  s3Usd?: number;
  textractUsd?: number;
  lambdaUsd?: number;
  totalUsd?: number;
  rows: number;
}

/** Cost per ingestion run, from the rows ingested in the last 24h (0 if no run happened in the window). */
export function computeCostPerIngestionRun(pricing: PricingTable, usage: MeasuredUsage): CostPerIngestionRun {
  const rows = usage.ingestedRows;
  if (rows <= 0) {
    return { rows: 0 };
  }
  const transitions = rows * ASSUMPTIONS.stateTransitionsPerRow + ASSUMPTIONS.fixedStateTransitionsPerRun;
  const stepFunctionsUsd = mul(transitions, price(pricing, 'stepFunctionsStateTransition'));
  const dynamoUsd = mul(rows * ASSUMPTIONS.dynamoWritesPerRow, price(pricing, 'dynamoWriteRequestUnit'));
  const s3Usd = mul(rows * ASSUMPTIONS.s3PutsPerRow, price(pricing, 's3Put'));
  const textractUsd = usage.textractPages > 0 ? mul(usage.textractPages, price(pricing, 'textractPage')) : 0;
  const lambdaUsd = mul(ASSUMPTIONS.lambdaGbSecondsFixedPerRun, price(pricing, 'lambdaGbSecond'));

  return {
    stepFunctionsUsd,
    dynamoUsd,
    s3Usd,
    textractUsd,
    lambdaUsd,
    totalUsd: add(stepFunctionsUsd, dynamoUsd, s3Usd, textractUsd, lambdaUsd),
    rows,
  };
}

export interface TenThousandFamilyProjection {
  assumptions: typeof ASSUMPTIONS;
  retroactiveCheckUsd?: number;
  monthlyScansUsd?: number;
  fanoutUsd?: number;
  totalUsd?: number;
}

/** The 10,000-family cost projection, with every assumption stated on the object itself. */
export function computeTenThousandFamilyProjection(pricing: PricingTable, costPerScan: CostPerScan): TenThousandFamilyProjection {
  const perScan = costPerScan.totalUsd;
  const retroactiveCheckUsd = mul(ASSUMPTIONS.projectedFamilies, ASSUMPTIONS.avgMedicinesPerFamily, perScan);
  const monthlyScansUsd = mul(ASSUMPTIONS.projectedFamilies, ASSUMPTIONS.scansPerFamilyPerMonth, perScan);
  // Push/email/SNS send costs have no PRICING_KEYS line item yet, so each notification is
  // costed as one Lambda invocation + one API Gateway request - a stated, rough proxy.
  const perNotificationUsd = add(price(pricing, 'lambdaRequest'), price(pricing, 'apiGatewayRequest'));
  const fanoutUsd = mul(
    ASSUMPTIONS.newAlertFanoutsPerMonth,
    ASSUMPTIONS.familiesNotifiedPerFanout,
    ASSUMPTIONS.notificationsPerFamily,
    perNotificationUsd,
  );

  return {
    assumptions: ASSUMPTIONS,
    retroactiveCheckUsd,
    monthlyScansUsd,
    fanoutUsd,
    totalUsd: add(retroactiveCheckUsd, monthlyScansUsd, fanoutUsd),
  };
}
