import { describe, expect, it } from 'vitest';
import type { PricingTable } from '@asli/contracts';
import { PRICING_PLACEHOLDER } from '@asli/contracts';
import type { MeasuredUsage } from './cloudwatch';
import { ASSUMPTIONS, computeCostPerIngestionRun, computeCostPerScan, computeTenThousandFamilyProjection } from './cost';

function pricing(overrides: Partial<PricingTable>): PricingTable {
  return { ...PRICING_PLACEHOLDER, ...overrides };
}

function priceEntry(pricePerUnit: number) {
  return { pricePerUnit, currency: 'USD' as const, source: 'https://example.com/pricing', checkedAt: '2026-09-18' };
}

const baseUsage: MeasuredUsage = {
  scanCount: 100,
  scanLatencyAvgMs: 2000,
  scanLatencyP50Ms: 1800,
  scanLatencyP95Ms: 3000,
  bedrockInputTokens: 100_000,
  bedrockOutputTokens: 20_000,
  textractPages: 0,
  translateCharacters: 0,
  pollyCharacters: 0,
  ingestedRows: 0,
  ingestionFailed: 0,
  matchesCreated: 0,
  pushSent: 0,
  pushFailed: 0,
  emailSent: 0,
  emailFailed: 0,
  tierCounts: { FLAGGED: 1, VERIFY: 2, NO_ALERT_FOUND: 97 },
  windowStart: '2026-09-17T00:00:00.000Z',
  windowEnd: '2026-09-18T00:00:00.000Z',
};

describe('computeCostPerScan', () => {
  it('returns nothing when a needed price is unknown (null stays null, not 0)', () => {
    const result = computeCostPerScan(PRICING_PLACEHOLDER, baseUsage);
    expect(result.totalUsd).toBeUndefined();
    expect(result.bedrockUsd).toBeUndefined();
  });

  it('matches a hand computation from the same CloudWatch numbers', () => {
    const table = pricing({
      bedrockInputTokenPer1k: priceEntry(0.001),
      bedrockOutputTokenPer1k: priceEntry(0.005),
      lambdaGbSecond: priceEntry(0.0000166667),
      lambdaRequest: priceEntry(0.0000002),
      apiGatewayRequest: priceEntry(0.000001),
      s3Put: priceEntry(0.000005),
      s3Get: priceEntry(0.0000004),
    });

    const result = computeCostPerScan(table, baseUsage);

    // Bedrock: (100000/100 tokens per scan) / 1000 * price + (20000/100)/1000 * price
    const expectedBedrock = (1000 / 1000) * 0.001 + (200 / 1000) * 0.005;
    expect(result.bedrockUsd).toBeCloseTo(expectedBedrock, 10);

    // Lambda: GB-seconds = (512/1024) * (2000ms/1000) = 1.0 GB-second
    const expectedGbSeconds = (ASSUMPTIONS.lambdaMemoryMb / 1024) * (baseUsage.scanLatencyAvgMs! / 1000);
    expect(expectedGbSeconds).toBe(1);
    const expectedLambda = expectedGbSeconds * 0.0000166667 + 0.0000002;
    expect(result.lambdaUsd).toBeCloseTo(expectedLambda, 10);

    const expectedApiGateway = ASSUMPTIONS.apiGatewayRequestsPerScan * 0.000001;
    expect(result.apiGatewayUsd).toBeCloseTo(expectedApiGateway, 10);

    const expectedS3 = ASSUMPTIONS.s3PutsPerScan * 0.000005 + ASSUMPTIONS.s3GetsPerScan * 0.0000004;
    expect(result.s3Usd).toBeCloseTo(expectedS3, 10);

    expect(result.totalUsd).toBeCloseTo(expectedBedrock + expectedLambda + expectedApiGateway + expectedS3, 10);
  });

  it('returns an empty result when there were no scans in the window', () => {
    const table = pricing({ bedrockInputTokenPer1k: priceEntry(0.001), bedrockOutputTokenPer1k: priceEntry(0.005) });
    const result = computeCostPerScan(table, { ...baseUsage, scanCount: 0 });
    expect(result).toEqual({});
  });
});

describe('computeCostPerIngestionRun', () => {
  it('reports rows: 0 and no cost when no run happened in the window', () => {
    const result = computeCostPerIngestionRun(PRICING_PLACEHOLDER, baseUsage);
    expect(result).toEqual({ rows: 0 });
  });

  it('computes step function + dynamo + s3 cost from ingested rows', () => {
    const table = pricing({
      stepFunctionsStateTransition: priceEntry(0.000025),
      dynamoWriteRequestUnit: priceEntry(0.0000006),
      s3Put: priceEntry(0.000005),
      lambdaGbSecond: priceEntry(0.0000166667),
    });
    const usage: MeasuredUsage = { ...baseUsage, ingestedRows: 50 };
    const result = computeCostPerIngestionRun(table, usage);

    const transitions = 50 * ASSUMPTIONS.stateTransitionsPerRow + ASSUMPTIONS.fixedStateTransitionsPerRun;
    expect(result.stepFunctionsUsd).toBeCloseTo(transitions * 0.000025, 10);
    expect(result.dynamoUsd).toBeCloseTo(50 * ASSUMPTIONS.dynamoWritesPerRow * 0.0000006, 10);
    expect(result.s3Usd).toBeCloseTo(50 * ASSUMPTIONS.s3PutsPerRow * 0.000005, 10);
    expect(result.textractUsd).toBe(0);
    expect(result.rows).toBe(50);
  });
});

describe('computeTenThousandFamilyProjection', () => {
  it('states its assumptions even when cost is unknown', () => {
    const result = computeTenThousandFamilyProjection(PRICING_PLACEHOLDER, {});
    expect(result.assumptions).toBe(ASSUMPTIONS);
    expect(result.totalUsd).toBeUndefined();
  });

  it('scales cost-per-scan by families and medicines/scans-per-month assumptions', () => {
    const table = pricing({ lambdaRequest: priceEntry(0.0000002), apiGatewayRequest: priceEntry(0.000001) });
    const costPerScan = { totalUsd: 0.001 };
    const result = computeTenThousandFamilyProjection(table, costPerScan);

    expect(result.retroactiveCheckUsd).toBeCloseTo(
      ASSUMPTIONS.projectedFamilies * ASSUMPTIONS.avgMedicinesPerFamily * 0.001,
      10,
    );
    expect(result.monthlyScansUsd).toBeCloseTo(
      ASSUMPTIONS.projectedFamilies * ASSUMPTIONS.scansPerFamilyPerMonth * 0.001,
      10,
    );
    expect(result.fanoutUsd).toBeCloseTo(
      ASSUMPTIONS.newAlertFanoutsPerMonth *
        ASSUMPTIONS.familiesNotifiedPerFanout *
        ASSUMPTIONS.notificationsPerFamily *
        (0.0000002 + 0.000001),
      10,
    );
  });
});
