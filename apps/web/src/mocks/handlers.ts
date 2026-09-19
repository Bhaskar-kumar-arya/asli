import { http, HttpResponse } from 'msw';
import type {
  AddMedicineRequest,
  CabinetDetail,
  CabinetList,
  CheckRequest,
  CheckResponse,
  CreateUploadRequest,
  MedicineWithStatus,
  ScanRequest,
} from '@asli/contracts';
import { getScanFixture, scanFixtures, type ScanFixtureState } from './fixtures';

const BASE = '/v1';

const MOCK_CABINET = {
  cabinetId: 'mock-cabinet-1',
  name: "My family's medicines",
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
