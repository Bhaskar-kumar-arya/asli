import { http, HttpResponse } from 'msw';
import type {
  AddMedicineRequest,
  CabinetList,
  CheckRequest,
  CheckResponse,
  CreateUploadRequest,
  MedicineWithStatus,
  ScanRequest,
} from '@asli/contracts';
import { getScanFixture, scanFixtures, type ScanFixtureState } from './fixtures';

const BASE = '/v1';

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
    HttpResponse.json({
      cabinets: [{ cabinetId: 'mock-cabinet-1', name: "My family's medicines", createdBy: 'mock-user', createdAt: new Date().toISOString(), role: 'OWNER' }],
    } satisfies CabinetList),
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
