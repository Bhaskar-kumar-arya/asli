import { beforeAll, describe, expect, it } from 'vitest';
import type { CabinetDetail, Cabinet, CheckResponse, MedicineWithStatus } from '@asli/contracts';
import { resolveStageConfig, signInTestUser, type StageConfig } from './aws';
import { ApiClient } from './client';
import { waitForLogMatch } from './logs';

/**
 * Integration suite (docs/TESTING.md "Integration (deployed)"): runs against a real
 * deployed stage (default `int`) as a real signed-in Cognito user, never a service-role
 * bypass. Requires:
 *   ASLI_TEST_USER_EMAIL / ASLI_TEST_USER_PASSWORD - a real Cognito user in the shared pool
 *   E2E_STAGE (default "int") - which lane stacks' routes/Lambdas to exercise
 *   SHARED_STAGE (default "dev-shared") - owns the physical HTTP API and Cognito pool
 */
const STAGE = process.env.E2E_STAGE ?? 'int';
const SHARED_STAGE = process.env.SHARED_STAGE ?? 'dev-shared';

// This suite only runs against a real deployed stage with a real signed-in user
// (docs/TESTING.md "Integration (deployed)"). `pnpm -r test` runs repo-wide without
// AWS credentials, so skip rather than fail when those aren't provided.
const canRun = Boolean(process.env.ASLI_TEST_USER_EMAIL && process.env.ASLI_TEST_USER_PASSWORD);

let config: StageConfig;
let api: ApiClient;

describe.skipIf(!canRun)(`e2e against ${STAGE}`, () => {
  beforeAll(async () => {
    config = await resolveStageConfig(SHARED_STAGE);
    const idToken = await signInTestUser(config.userPoolClientId);
    api = new ApiClient(config.apiBaseUrl, idToken);
  }, 30_000);

  it('manual check against a seeded FlaggedBatch row returns FLAGGED with a cited source', async () => {
    const res = await api.checks<CheckResponse>({
      items: [
        {
          productName: 'Amoxicillin 500mg Capsules',
          batchNumber: 'GTL 1258',
          manufacturer: 'Gidsha Pharmaceuticals',
          source: 'manual',
        },
      ],
    });

    expect(res.status).toBe(200);
    const [result] = res.body.results;
    expect(result?.tier).toBe('FLAGGED');
    expect(result?.matches.length).toBeGreaterThan(0);
    const match = result?.matches[0];
    expect(match?.sourceUrl).toMatch(/^https:\/\/cdscoonline\.gov\.in\//);
    expect(match?.alertMonth).toMatch(/^\d{4}-\d{2}$/);
    expect(match?.reportingSource).toBeTruthy();
  });

  it(
    'adding a medicine that matches a seeded batch reaches MATCH (FLAGGED) within 10s of the retroactive check',
    async () => {
      const cabinetRes = await api.createCabinet<Cabinet>(`e2e-${Date.now()}`);
      expect(cabinetRes.status).toBe(201);
      const cabinetId = cabinetRes.body.cabinetId;

      const addedAt = Date.now();
      const addRes = await api.addMedicine<MedicineWithStatus>(cabinetId, {
        identity: {
          productName: 'Paracetamol 500mg Tablets',
          batchNumber: 'AKL1000',
          manufacturer: 'Sunrise Pharmaceuticals',
          source: 'manual',
        },
        label: 'e2e test strip',
      });
      expect(addRes.status).toBe(201);
      expect(addRes.body.latestTier).toBe('PENDING');
      const medId = addRes.body.medId;

      const deadline = addedAt + 10_000;
      let latestTier = 'PENDING';
      let matched = false;
      while (Date.now() < deadline) {
        const detail = await api.getCabinet<CabinetDetail>(cabinetId);
        const med = detail.body.medicines.find((m) => m.medId === medId);
        latestTier = med?.latestTier ?? 'PENDING';
        if (latestTier !== 'PENDING') {
          matched = detail.body.matches.some((m) => m.medId === medId && m.tier === 'FLAGGED');
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      expect(latestTier).toBe('FLAGGED');
      expect(matched).toBe(true);

      // The retroactive MATCH publishes an AlertEvent to SNS, fanning out to G1's
      // push-sender and email-sender - confirm both actually processed it (docs/ALERTS.md).
      // SES sandbox / no real push subscription means delivery itself can legitimately fail;
      // this only confirms the fan-out path ran, which is what the Core gate checks.
      const [pushLog, emailLog] = await Promise.all([
        waitForLogMatch(STAGE, 'PushSenderHandler', (line) => line.includes(cabinetId), addedAt, 20_000),
        waitForLogMatch(STAGE, 'EmailSenderHandler', (line) => line.includes(cabinetId), addedAt, 20_000),
      ]);
      expect(pushLog, 'push-sender never processed the AlertEvent for this cabinet').not.toBeNull();
      expect(emailLog, 'email-sender never processed the AlertEvent for this cabinet').not.toBeNull();

      await api.deleteMedicine(cabinetId, medId);
    },
    25_000,
  );
});
