import type { ScanResponse } from '@asli/contracts';
import scanResponsesFixture from '../../../../packages/contracts/fixtures/scan-responses.json';

export type ScanFixtureState =
  | 'FLAGGED_NSQ'
  | 'FLAGGED_SPURIOUS'
  | 'VERIFY_NEAR_BATCH'
  | 'VERIFY_MANUFACTURER_UNKNOWN'
  | 'VERIFY_LOW_READ_CONFIDENCE'
  | 'NO_ALERT_FOUND'
  | 'EXTRACTION_FAILED_MANUAL_ENTRY'
  | 'NOT_A_MEDICINE_PHOTO';

interface ScanFixtureEntry {
  state: ScanFixtureState;
  response: ScanResponse;
}

export const scanFixtures = scanResponsesFixture as ScanFixtureEntry[];

export function getScanFixture(state: ScanFixtureState): ScanResponse {
  const entry = scanFixtures.find((f) => f.state === state);
  if (!entry) throw new Error(`No scan fixture for state ${state}`);
  return entry.response;
}
