import { randomUUID } from 'node:crypto';
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  MedicineItemSchema,
  cabinetMatchSk,
  cabinetMedicineGsi3Pk,
  cabinetMedicineSk,
  cabinetPk,
  type AlertEvent,
  type AlertTrigger,
  type FlaggedBatch,
  type MedicineItem,
} from '@asli/contracts';
import { decide, type AliasMap } from '@asli/matching';
import type { CheckedAgainst } from '@asli/lookup';
import { shouldNotify } from './backfill-guard';
import { isHigherTier } from './tier-rank';
import { logger, metrics, MetricUnit } from './observability';

export interface FanOutDeps {
  ddb: DynamoDBDocumentClient;
  cabinetsTable: string;
  aliases: AliasMap;
  checkedAgainst: CheckedAgainst;
  now?: () => Date;
}

/** Cabinets GSI3: medicines whose saved batch skeleton matches this new alert row. */
async function findCandidateMedicines(deps: FanOutDeps, batchSkeleton: string): Promise<MedicineItem[]> {
  const items: MedicineItem[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await deps.ddb.send(
      new QueryCommand({
        TableName: deps.cabinetsTable,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk',
        ExpressionAttributeValues: { ':pk': cabinetMedicineGsi3Pk(batchSkeleton) },
        ExclusiveStartKey,
      }),
    );
    for (const raw of result.Items ?? []) {
      items.push(MedicineItemSchema.parse(raw));
    }
    ExclusiveStartKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (ExclusiveStartKey);
  return items;
}

/** Conditional put so reprocessing the same (medId, alertId) pair never duplicates a MATCH. */
async function putMatchIfNew(
  deps: FanOutDeps,
  medicine: MedicineItem,
  row: FlaggedBatch,
  tier: 'FLAGGED' | 'VERIFY',
  reasonCode: string[],
  alertRef: string,
  trigger: AlertTrigger,
  notify: boolean,
  nowIso: string,
): Promise<boolean> {
  const cabinetId = medicine.PK.slice('CAB#'.length);
  const medId = medicine.SK.slice('MED#'.length);
  try {
    await deps.ddb.send(
      new PutCommand({
        TableName: deps.cabinetsTable,
        Item: {
          PK: cabinetPk(cabinetId),
          SK: cabinetMatchSk(medId, row.alertId),
          tier,
          category: row.category,
          alertRef,
          reasonCode,
          alertMonth: row.alertMonth,
          trigger,
          createdAt: nowIso,
          ...(notify ? { notifiedAt: nowIso } : {}),
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      }),
    );
    return true;
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return false;
    }
    throw err;
  }
}

/** Only ever raises latestTier, and only if it hasn't already moved since we read it. */
async function bumpLatestTierIfHigher(deps: FanOutDeps, medicine: MedicineItem, tier: 'FLAGGED' | 'VERIFY'): Promise<void> {
  if (!isHigherTier(tier, medicine.latestTier)) return;
  const cabinetId = medicine.PK.slice('CAB#'.length);
  const medId = medicine.SK.slice('MED#'.length);
  try {
    await deps.ddb.send(
      new UpdateCommand({
        TableName: deps.cabinetsTable,
        Key: { PK: cabinetPk(cabinetId), SK: cabinetMedicineSk(medId) },
        UpdateExpression: 'SET latestTier = :new',
        ConditionExpression: 'latestTier = :old',
        ExpressionAttributeValues: { ':new': tier, ':old': medicine.latestTier },
      }),
    );
  } catch (err) {
    if ((err as { name?: string }).name !== 'ConditionalCheckFailedException') throw err;
    // Another stream record already moved latestTier since we read it - fine, it only moves up.
  }
}

/**
 * docs/ALERTS.md "New-alert fan-out": for one newly-inserted FlaggedBatches row, find every
 * saved medicine that matches it, write idempotent MATCH items, bump MED.latestTier, and return
 * the AlertEvents to publish for newly-created matches (skipping ones the backfill guard mutes).
 */
export async function processFlaggedBatch(row: FlaggedBatch, deps: FanOutDeps): Promise<AlertEvent[]> {
  const now = deps.now?.() ?? new Date();
  const nowIso = now.toISOString();
  const trigger: AlertTrigger = row.demo ? 'DEMO' : 'NEW_ALERT';

  const candidates = await findCandidateMedicines(deps, row.batchSkeleton);
  const events: AlertEvent[] = [];
  metrics.addDimension('trigger', trigger);

  for (const medicine of candidates) {
    const result = decide(medicine.identity, [row], {
      monthCount: deps.checkedAgainst.monthCount,
      latestMonth: deps.checkedAgainst.latestMonth,
      aliases: deps.aliases,
    });
    metrics.addDimension('tier', result.tier);
    metrics.addMetric('CheckTier', MetricUnit.Count, 1);

    if (result.tier !== 'FLAGGED' && result.tier !== 'VERIFY') continue;
    const matchedAlert = result.matches[0];
    if (!matchedAlert) continue;

    const notify = shouldNotify(row.alertMonth, trigger, now);
    const created = await putMatchIfNew(
      deps,
      medicine,
      row,
      result.tier,
      result.reasonCodes,
      matchedAlert.alertRef,
      trigger,
      notify,
      nowIso,
    );
    if (!created) continue;

    metrics.addMetric('MatchesCreated', MetricUnit.Count, 1);
    await bumpLatestTierIfHigher(deps, medicine, result.tier);

    if (!notify) {
      logger.info('backfill guard suppressed notification', {
        cabinetId: medicine.PK,
        alertMonth: row.alertMonth,
        trigger,
      });
      continue;
    }

    events.push({
      eventId: randomUUID(),
      trigger,
      cabinetId: medicine.PK.slice('CAB#'.length),
      medId: medicine.SK.slice('MED#'.length),
      medicineLabel: medicine.label,
      tier: result.tier,
      alert: matchedAlert,
      createdAt: nowIso,
    });
  }

  return events;
}
