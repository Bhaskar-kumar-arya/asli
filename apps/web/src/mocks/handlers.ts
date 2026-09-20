import { http, HttpResponse } from 'msw';
import type {
  AddMedicineRequest,
  CabinetDetail,
  CabinetList,
  CheckRequest,
  CheckResponse,
  CreateUploadRequest,
  MedicineWithStatus,
  PublicStats,
  ScanRequest,
} from '@asli/contracts';
import type { InsightsDetail } from '../features/insights/types';
import type { DashboardMetrics } from '../features/dashboard/types';
import { getScanFixture, scanFixtures, type ScanFixtureState } from './fixtures';

const BASE = '/v1';

const MOCK_CABINET = {
  cabinetId: 'mock-cabinet-1',
  // Not "My family's medicines" — that is the list heading on Home, and a cabinet
  // named the same as the heading above it reads as a duplicate rather than a place.
  name: 'Sharma family',
  createdBy: 'mock-user',
  createdAt: '2026-02-11T09:00:00.000Z',
};

/** Demo cabinet: one entry per tier, so every state of the register is visible. */
const MOCK_MEDICINES: MedicineWithStatus[] = [
  {
    medId: 'mock-med-1',
    identity: { productName: 'Telmisartan 40mg', batchNumber: 'TLM2408A', manufacturer: 'Brightstone Labs', source: 'manual' },
    label: 'Telmisartan 40mg',
    forPerson: 'Amma',
    addedBy: 'mock-user',
    addedAt: '2026-03-02T05:20:00.000Z',
    lastCheckedAt: '2026-09-14T04:10:00.000Z',
    latestTier: 'FLAGGED',
  },
  {
    medId: 'mock-med-2',
    identity: { productName: 'Metformin 500mg', batchNumber: 'MET5591', manufacturer: 'Kaveri Pharma', source: 'strip_vision' },
    label: 'Metformin 500mg',
    forPerson: 'Amma',
    addedBy: 'mock-user',
    addedAt: '2026-03-02T05:22:00.000Z',
    lastCheckedAt: '2026-09-14T04:10:00.000Z',
    latestTier: 'NO_ALERT_FOUND',
  },
  {
    medId: 'mock-med-3',
    identity: { productName: 'Atorvastatin 10mg', batchNumber: 'ATV1174', source: 'bill_vision' },
    label: 'Atorvastatin 10mg',
    forPerson: 'Appa',
    addedBy: 'mock-user',
    addedAt: '2026-05-18T11:40:00.000Z',
    lastCheckedAt: '2026-09-14T04:10:00.000Z',
    latestTier: 'VERIFY',
  },
  {
    medId: 'mock-med-4',
    identity: { productName: 'Levothyroxine 50mcg', batchNumber: 'LVT0923', manufacturer: 'Sundar Remedies', source: 'strip_vision' },
    label: 'Levothyroxine 50mcg',
    forPerson: 'Appa',
    addedBy: 'mock-user',
    addedAt: '2026-08-30T07:05:00.000Z',
    latestTier: 'NO_ALERT_FOUND',
  },
];

const MOCK_DETAIL: CabinetDetail = {
  cabinet: MOCK_CABINET,
  members: [
    { userId: 'mock-user', role: 'OWNER', alertsEnabled: true, joinedAt: '2026-02-11T09:00:00.000Z' },
    { userId: 'mock-sibling', role: 'EDITOR', alertsEnabled: true, joinedAt: '2026-02-14T16:30:00.000Z' },
  ],
  medicines: MOCK_MEDICINES,
  matches: [
    {
      medId: 'mock-med-1',
      alertRef: 'CDSCO-2026-07-NSQ-0412',
      tier: 'FLAGGED',
      category: 'NSQ',
      alertMonth: '2026-07',
      createdAt: '2026-07-21T06:00:00.000Z',
    },
    {
      medId: 'mock-med-3',
      alertRef: 'CDSCO-2026-05-NSQ-0188',
      tier: 'VERIFY',
      category: 'NSQ',
      alertMonth: '2026-05',
      createdAt: '2026-05-19T06:00:00.000Z',
    },
  ],
};

function stateFromUploadId(uploadId: string): ScanFixtureState {
  const match = scanFixtures.find((f) => uploadId === `mock-upload-${f.state}`);
  return match?.state ?? 'NO_ALERT_FOUND';
}

/* ---------- the public returns ---------- */

/** A year of alert counts so the charts read as a trend rather than two bars. */
const MOCK_BY_MONTH_CATEGORY = [
  { month: '2025-08', NSQ: 31, SPURIOUS: 6 },
  { month: '2025-09', NSQ: 28, SPURIOUS: 4 },
  { month: '2025-10', NSQ: 36, SPURIOUS: 9 },
  { month: '2025-11', NSQ: 24, SPURIOUS: 5 },
  { month: '2025-12', NSQ: 33, SPURIOUS: 7 },
  { month: '2026-01', NSQ: 41, SPURIOUS: 11 },
  { month: '2026-02', NSQ: 29, SPURIOUS: 6 },
  { month: '2026-03', NSQ: 38, SPURIOUS: 8 },
  { month: '2026-04', NSQ: 35, SPURIOUS: 5 },
  { month: '2026-05', NSQ: 44, SPURIOUS: 12 },
  { month: '2026-06', NSQ: 30, SPURIOUS: 7 },
  { month: '2026-07', NSQ: 37, SPURIOUS: 10 },
];

const MOCK_TOTAL_NSQ = MOCK_BY_MONTH_CATEGORY.reduce((n, m) => n + m.NSQ, 0);
const MOCK_TOTAL_SPURIOUS = MOCK_BY_MONTH_CATEGORY.reduce((n, m) => n + m.SPURIOUS, 0);

const MOCK_STATS: PublicStats = {
  generatedAt: '2026-08-02T04:00:00.000Z',
  monthsCovered: MOCK_BY_MONTH_CATEGORY.length,
  latestMonth: '2026-07',
  totalFlaggedBatches: MOCK_TOTAL_NSQ + MOCK_TOTAL_SPURIOUS,
  cabinetsProtected: 1284,
  medicinesTracked: 5602,
};

const MOCK_INSIGHTS: InsightsDetail = {
  generatedAt: MOCK_STATS.generatedAt,
  byCategory: { NSQ: MOCK_TOTAL_NSQ, SPURIOUS: MOCK_TOTAL_SPURIOUS },
  byMonth: MOCK_BY_MONTH_CATEGORY.map((m) => ({ month: m.month, count: m.NSQ + m.SPURIOUS })),
  topReasonCodes: [
    { reasonCode: 'ASSAY', count: 118 },
    { reasonCode: 'DISSOLUTION', count: 96 },
    { reasonCode: 'DESCRIPTION', count: 61 },
    { reasonCode: 'UNIFORMITY', count: 43 },
    { reasonCode: 'STERILITY', count: 28 },
  ],
  byMonthCategory: MOCK_BY_MONTH_CATEGORY,
  byReportingSource: [
    { reportingSource: 'Central Drugs Laboratory, Kolkata', count: 141 },
    { reportingSource: 'Central Drugs Testing Laboratory, Mumbai', count: 112 },
    { reportingSource: 'Regional Drugs Testing Laboratory, Chandigarh', count: 87 },
    { reportingSource: 'Central Drugs Laboratory, Kasauli', count: 64 },
  ],
  withinExpiry: { rows: 504, withinExpiry: 311, missingExpiry: 42, withinExpiryShare: 311 / 504 },
  mfgToAlertLagMonths: { n: 504, mean: 9.4, median: 8, p10: 4, p90: 16, max: 29 },
  alertToExpiryRemainingMonths: { n: 462, mean: 7.1, median: 6, p10: 1, p90: 14, max: 23 },
};

const MOCK_METRICS: DashboardMetrics = {
  accuracy: { sampleSize: 120, measuredAt: '2026-08-01T12:00:00.000Z' },
  cost: { costPer1000ScansUsd: 1.94, measuredAt: '2026-08-02T00:00:00.000Z' },
  accuracyDetail: {
    runId: 'acc-2026-08-01',
    measuredAt: '2026-08-01T12:00:00.000Z',
    tierCorrectnessRate: 0.975,
    byMethod: [
      { method: 'strip_vision', count: 60, batchExactRate: 0.9 },
      { method: 'bill_vision', count: 34, batchExactRate: 0.824 },
      { method: 'qr', count: 14, batchExactRate: 1 },
      { method: 'manual', count: 12, batchExactRate: 1 },
    ],
    byCondition: [
      { condition: 'lighting', value: 'good', count: 71, batchExactRate: 0.944 },
      { condition: 'lighting', value: 'dim', count: 31, batchExactRate: 0.806 },
      { condition: 'strip', value: 'creased', count: 18, batchExactRate: 0.722 },
    ],
  },
  costDetail: {
    window: { start: '2026-07-02T00:00:00.000Z', end: '2026-08-02T00:00:00.000Z' },
    scanCount: 4120,
    perScanUsd: { bedrockUsd: 0.00121, lambdaUsd: 0.00009, apiGatewayUsd: 0.0000035, s3Usd: 0.0000042, totalUsd: 0.00194 },
    perIngestionRun: {
      stepFunctionsUsd: 0.00025,
      dynamoUsd: 0.0131,
      s3Usd: 0.0004,
      textractUsd: 0.045,
      lambdaUsd: 0.0021,
      totalUsd: 0.0609,
      rows: 512,
    },
    tenThousandFamilyProjection: {
      assumptions: {
        projectedFamilies: 10_000,
        avgMedicinesPerFamily: 5,
        scansPerFamilyPerMonth: 2,
        newAlertFanoutsPerMonth: 4,
        familiesNotifiedPerFanout: 50,
        notificationsPerFamily: 2,
      },
      retroactiveCheckUsd: 4.62,
      monthlyScansUsd: 38.8,
      fanoutUsd: 1.14,
      totalUsd: 44.56,
    },
  },
};

export const handlers = [
  http.post(`${BASE}/uploads`, async ({ request }) => {
    const body = (await request.json()) as CreateUploadRequest & { mockState?: ScanFixtureState };
    return HttpResponse.json({
      uploadId: `mock-upload-${body.mockState ?? 'NO_ALERT_FOUND'}`,
      url: 'https://example-mock-upload.local/put',
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
  }),

  http.put('https://example-mock-upload.local/put', () => HttpResponse.text('', { status: 200 })),

  http.post(`${BASE}/scans`, async ({ request }) => {
    const body = (await request.json()) as ScanRequest;
    const state = stateFromUploadId(body.uploadId);
    return HttpResponse.json(getScanFixture(state));
  }),

  http.post(`${BASE}/checks`, async ({ request }) => {
    const body = (await request.json()) as CheckRequest;
    const fallback = getScanFixture('NO_ALERT_FOUND').results[0];
    if (!fallback) throw new Error('NO_ALERT_FOUND fixture is missing its result');
    const results = body.items.map((identity) => {
      const matchedResult = scanFixtures.find(
        (f) => f.response.results[0]?.identity.batchNumber === identity.batchNumber,
      )?.response.results[0];
      return { ...(matchedResult ?? fallback), identity };
    });
    return HttpResponse.json({ results } satisfies CheckResponse);
  }),

  http.get(`${BASE}/push/vapid-public-key`, () => HttpResponse.json({ publicKey: 'mock-vapid-public-key' })),

  /* Public, no auth. Without these the two open pages render only their error line. */
  http.get(`${BASE}/public/stats`, () => HttpResponse.json(MOCK_STATS)),
  http.get(`${BASE}/public/insights`, () => HttpResponse.json(MOCK_INSIGHTS)),
  http.get(`${BASE}/public/metrics`, () => HttpResponse.json(MOCK_METRICS)),

  http.get(`${BASE}/cabinets`, () =>
    HttpResponse.json({ cabinets: [{ ...MOCK_CABINET, role: 'OWNER' }] } satisfies CabinetList),
  ),

  http.get(`${BASE}/cabinets/:cabinetId`, ({ params }) =>
    HttpResponse.json({
      ...MOCK_DETAIL,
      cabinet: { ...MOCK_CABINET, cabinetId: String(params.cabinetId) },
    } satisfies CabinetDetail),
  ),

  http.post(`${BASE}/cabinets/:cabinetId/medicines`, async ({ request }) => {
    const body = (await request.json()) as AddMedicineRequest;
    return HttpResponse.json({
      medId: `mock-med-${Date.now()}`,
      identity: body.identity,
      label: body.label,
      forPerson: body.forPerson,
      addedBy: 'mock-user',
      addedAt: new Date().toISOString(),
      latestTier: 'PENDING',
    } satisfies MedicineWithStatus);
  }),
];
