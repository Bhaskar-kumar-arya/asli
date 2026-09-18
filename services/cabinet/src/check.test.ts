import type { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type { FlaggedBatch, MatchItem, MedicineIdentity, MedicineItem } from '@asli/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runRetroactiveCheck } from './check';
import type { CabinetRepo, MatchLookupRepo } from './repo';

// Same fixture as packages/matching/src/decide.test.ts.
const gidshaNsq: FlaggedBatch = {
  productName: 'Amoxicillin 500mg Capsules',
  batchRaw: 'GTL 1258',
  batchNorm: 'GTL1258',
  batchSkeleton: '6T11258',
  mfgMonth: null,
  expMonth: '2026-10',
  manufacturerRaw: 'M/s. Gidsha Pharmaceuticals Pvt. Ltd.',
  manufacturerNorm: 'GIDSHA',
  category: 'NSQ',
  reasonRaw: 'Assay (content of the drug) found outside limits',
  reasonCode: 'ASSAY',
  reportingSource: 'STATE_LAB',
  reportingLab: 'State Drug Testing Laboratory, Chandigarh',
  alertMonth: '2025-03',
  sourceUrl: 'https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Mar-2025&source=All&tab=nsq',
  snapshotKey: 'raw/cdsco/endpoint/2025-03/nsq/d521d57fe144d31a.html',
  rowHash: 'd521d57fe144d31a',
  alertId: 'd521d57fe144d31a',
  ingestedAt: '2025-03-05T06:00:00.000Z',
  demo: false,
};

function identity(overrides: Partial<MedicineIdentity> = {}): MedicineIdentity {
  return { batchNumber: 'GTL1258', manufacturer: 'Gidsha Pharmaceuticals', source: 'manual', ...overrides };
}

function fakeRepo(): CabinetRepo & { medicines: Map<string, MedicineItem>; matches: Map<string, MatchItem> } {
  const medicines = new Map<string, MedicineItem>();
  const matches = new Map<string, MatchItem>();
  return {
    medicines,
    matches,
    listMembershipsForUser: vi.fn(),
    getCabinetMeta: vi.fn(),
    getMember: vi.fn(),
    listMembers: vi.fn(),
    listMedicines: vi.fn(),
    listMatches: vi.fn(),
    createCabinetWithOwner: vi.fn(),
    addMedicine: vi.fn(),
    deleteMedicineAndMatches: vi.fn(),
    async updateMedicineTier(cabinetId, medId, latestTier, lastCheckedAt) {
      const key = `${cabinetId}#${medId}`;
      const existing = medicines.get(key);
      medicines.set(key, { ...(existing as MedicineItem), latestTier, lastCheckedAt });
    },
    async putMatchIfAbsent(item) {
      const key = `${item.PK}#${item.SK}`;
      if (matches.has(key)) return false;
      matches.set(key, item);
      return true;
    },
  };
}

function fakeLookup(candidates: FlaggedBatch[]): MatchLookupRepo {
  return {
    async findCandidatesForIdentity() {
      return candidates;
    },
    async findCandidatesBySkeleton() {
      return candidates;
    },
    async checkedAgainst() {
      return { monthCount: 24, latestMonth: '2025-08' };
    },
  };
}

function fakeSns() {
  const send = vi.fn().mockResolvedValue({});
  return { send } as unknown as SNSClient;
}

describe('runRetroactiveCheck', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let sns: SNSClient;

  beforeEach(() => {
    repo = fakeRepo();
    sns = fakeSns();
  });

  it('updates the medicine tier and publishes one AlertEvent for a new FLAGGED match', async () => {
    const result = await runRetroactiveCheck({
      repo,
      lookup: fakeLookup([gidshaNsq]),
      sns,
      alertsTopicArn: 'arn:aws:sns:ap-south-1:123:asli-dev-f-alerts',
      trigger: 'RETROACTIVE',
      cabinetId: 'cab1',
      medId: 'med1',
      medicineLabel: "Mom's amoxicillin",
      identity: identity(),
      now: '2026-01-01T00:00:00.000Z',
    });

    expect(result.latestTier).toBe('FLAGGED');
    expect(result.newMatchCount).toBe(1);
    expect(repo.matches.size).toBe(1);
    expect((sns.send as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);

    const publishCall = (sns.send as ReturnType<typeof vi.fn>).mock.calls[0]![0] as PublishCommand;
    const message = JSON.parse(publishCall.input.Message!);
    expect(message.tier).toBe('FLAGGED');
    expect(message.trigger).toBe('RETROACTIVE');
    expect(message.medicineLabel).toBe("Mom's amoxicillin");
  });

  it('is idempotent: re-running for the same medicine publishes nothing new', async () => {
    const lookup = fakeLookup([gidshaNsq]);
    const args = {
      repo,
      lookup,
      sns,
      alertsTopicArn: 'arn:aws:sns:ap-south-1:123:asli-dev-f-alerts',
      trigger: 'RETROACTIVE' as const,
      cabinetId: 'cab1',
      medId: 'med1',
      identity: identity(),
      now: '2026-01-01T00:00:00.000Z',
    };

    await runRetroactiveCheck(args);
    const second = await runRetroactiveCheck(args);

    expect(second.newMatchCount).toBe(0);
    expect(repo.matches.size).toBe(1);
    expect((sns.send as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('sets latestTier to NO_ALERT_FOUND and publishes nothing when nothing matches', async () => {
    const result = await runRetroactiveCheck({
      repo,
      lookup: fakeLookup([]),
      sns,
      alertsTopicArn: 'arn:aws:sns:ap-south-1:123:asli-dev-f-alerts',
      trigger: 'RETROACTIVE',
      cabinetId: 'cab1',
      medId: 'med1',
      identity: identity({ batchNumber: 'ZZZ999' }),
      now: '2026-01-01T00:00:00.000Z',
    });

    expect(result.latestTier).toBe('NO_ALERT_FOUND');
    expect(result.newMatchCount).toBe(0);
    expect(sns.send).not.toHaveBeenCalled();
  });
});
