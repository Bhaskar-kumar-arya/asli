import type { MetricsSummary } from '@asli/contracts';

/**
 * `GET /v1/public/metrics` returns the frozen `MetricsSummary` contract fields plus a superset
 * of dashboard-only detail (services/metrics/src/handlers/public-metrics.ts) that isn't in
 * `@asli/contracts` yet - see plan/tasks/J-dashboard.md Handoff "Contract change requests".
 * This type documents that superset for the `/dashboard` page only; any other caller should
 * keep reading just `MetricsSummary`'s documented fields.
 */
export interface AccuracyDetail {
  runId: string;
  measuredAt: string;
  tierCorrectnessRate?: number;
  byMethod: { method: string; count: number; batchExactRate: number }[];
  byCondition: { condition: string; value: string; count: number; batchExactRate: number }[];
}

export interface CostComponents {
  bedrockUsd?: number;
  lambdaUsd?: number;
  apiGatewayUsd?: number;
  s3Usd?: number;
  totalUsd?: number;
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

export interface TenThousandFamilyProjection {
  assumptions: {
    projectedFamilies: number;
    avgMedicinesPerFamily: number;
    scansPerFamilyPerMonth: number;
    newAlertFanoutsPerMonth: number;
    familiesNotifiedPerFanout: number;
    notificationsPerFamily: number;
  };
  retroactiveCheckUsd?: number;
  monthlyScansUsd?: number;
  fanoutUsd?: number;
  totalUsd?: number;
}

export interface CostDetail {
  window: { start: string; end: string };
  scanCount: number;
  perScanUsd: CostComponents;
  perIngestionRun: CostPerIngestionRun;
  tenThousandFamilyProjection: TenThousandFamilyProjection;
}

export interface DashboardMetrics extends MetricsSummary {
  accuracyDetail?: AccuracyDetail;
  costDetail: CostDetail;
}
