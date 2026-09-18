import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
  encodeAlertRef,
  flaggedBatchPk,
  flaggedBatchSk,
  type AlertEvent,
  type AlertTrigger,
  type FlaggedBatch,
  type MatchItem,
  type MedicineIdentity,
} from '@asli/contracts';
import { batchSkeleton, classifyMatch, decide, normalizeBatch } from '@asli/matching';
import type { CabinetRepo, MatchLookupRepo } from './repo';
import { matchKeyFor } from './repo';
import { recordBatchCollisionIgnored, recordCheckTier, recordMatchCreated } from './metrics';

export interface RunCheckResult {
  latestTier: 'FLAGGED' | 'VERIFY' | 'NO_ALERT_FOUND';
  newMatchCount: number;
}

/**
 * docs/ALERTS.md "Retroactive check": query candidates by exact batch + near
 * skeleton, classify each, update the medicine's tier, and conditionally
 * create+publish MATCH items for newly matched FLAGGED/VERIFY candidates.
 * Idempotent - re-running for the same medicine only ever skips existing MATCH
 * items (attribute_not_exists put) and never re-publishes for them.
 */
export async function runRetroactiveCheck(opts: {
  repo: CabinetRepo;
  lookup: MatchLookupRepo;
  sns: SNSClient;
  alertsTopicArn: string;
  trigger: AlertTrigger;
  cabinetId: string;
  medId: string;
  medicineLabel?: string;
  identity: MedicineIdentity;
  now: string;
}): Promise<RunCheckResult> {
  const { repo, lookup, sns, alertsTopicArn, trigger, cabinetId, medId, medicineLabel, identity, now } = opts;

  const skeleton = batchSkeleton(normalizeBatch(identity.batchNumber));
  const [exact, near] = await Promise.all([
    lookup.findCandidatesForIdentity(identity),
    lookup.findCandidatesBySkeleton(skeleton),
  ]);
  const candidates = dedupeByAlertId([...exact, ...near]);

  const ctx = await lookup.checkedAgainst();
  const overall = decide(identity, candidates, ctx);
  recordCheckTier(overall.tier);

  await repo.updateMedicineTier(cabinetId, medId, overall.tier, now);

  let newMatchCount = 0;
  for (const candidate of candidates) {
    const classified = classifyMatch(identity, candidate, ctx);
    if (classified.collision) {
      recordBatchCollisionIgnored();
      continue;
    }
    if (classified.tier === null) continue;

    const alertRef = encodeAlertRef(
      flaggedBatchPk(candidate.batchNorm),
      flaggedBatchSk(candidate.alertMonth, candidate.category, candidate.rowHash),
    );
    const matchItem: MatchItem = {
      ...matchKeyFor(cabinetId, medId, candidate.alertId),
      tier: classified.tier,
      category: candidate.category,
      alertRef,
      reasonCode: classified.reasonCodes,
      alertMonth: candidate.alertMonth,
      trigger,
      createdAt: now,
    };

    const created = await repo.putMatchIfAbsent(matchItem);
    if (!created) continue;

    newMatchCount += 1;
    recordMatchCreated(trigger, classified.tier);

    const event: AlertEvent = {
      eventId: `${medId}#${candidate.alertId}`,
      trigger,
      cabinetId,
      medId,
      medicineLabel,
      tier: classified.tier,
      alert: toAlertSummary(candidate, alertRef),
      createdAt: now,
    };
    await sns.send(
      new PublishCommand({
        TopicArn: alertsTopicArn,
        Message: JSON.stringify(event),
        MessageAttributes: {
          trigger: { DataType: 'String', StringValue: trigger },
          tier: { DataType: 'String', StringValue: classified.tier },
        },
      }),
    );
  }

  return { latestTier: overall.tier, newMatchCount };
}

function dedupeByAlertId(candidates: FlaggedBatch[]): FlaggedBatch[] {
  const seen = new Map<string, FlaggedBatch>();
  for (const c of candidates) seen.set(c.alertId, c);
  return [...seen.values()];
}

function toAlertSummary(candidate: FlaggedBatch, alertRef: string): AlertEvent['alert'] {
  return {
    alertRef,
    alertMonth: candidate.alertMonth,
    category: candidate.category,
    productName: candidate.productName,
    batchRaw: candidate.batchRaw,
    manufacturerRaw: candidate.manufacturerRaw,
    mfgMonth: candidate.mfgMonth ?? undefined,
    expMonth: candidate.expMonth ?? undefined,
    reasonCode: candidate.reasonCode,
    reasonRaw: candidate.reasonRaw,
    reportingSource: candidate.reportingSource,
    reportingLab: candidate.reportingLab,
    sourceUrl: candidate.sourceUrl,
    demo: candidate.demo,
  };
}
