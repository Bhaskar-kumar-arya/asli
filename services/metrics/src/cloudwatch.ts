import { GetMetricDataCommand, type MetricDataQuery } from '@aws-sdk/client-cloudwatch';
import { getCloudWatch } from './env';

const NAMESPACE = 'Asli';
const WINDOW_MS = 24 * 60 * 60 * 1000;

/** Raw measurements over the last 24h on `stage`, straight off CloudWatch EMF metrics
 * (docs/OBSERVABILITY_AND_COST.md "Metrics") - no derived/estimated fields here. */
export interface MeasuredUsage {
  scanCount: number;
  scanLatencyAvgMs?: number;
  scanLatencyP50Ms?: number;
  scanLatencyP95Ms?: number;
  bedrockInputTokens: number;
  bedrockOutputTokens: number;
  textractPages: number;
  translateCharacters: number;
  pollyCharacters: number;
  ingestedRows: number;
  ingestionFailed: number;
  matchesCreated: number;
  pushSent: number;
  pushFailed: number;
  emailSent: number;
  emailFailed: number;
  tierCounts: { FLAGGED: number; VERIFY: number; NO_ALERT_FOUND: number };
  windowStart: string;
  windowEnd: string;
}

interface QuerySpec {
  id: string;
  metricName: string;
  stat: 'Sum' | 'Average' | 'SampleCount' | 'p50' | 'p95';
  dimensions?: { name: string; value: string }[];
}

function buildQuery(stage: string, spec: QuerySpec): MetricDataQuery {
  return {
    Id: spec.id,
    MetricStat: {
      Metric: {
        Namespace: NAMESPACE,
        MetricName: spec.metricName,
        Dimensions: [{ Name: 'stage', Value: stage }, ...(spec.dimensions ?? []).map((d) => ({ Name: d.name, Value: d.value }))],
      },
      Period: WINDOW_MS / 1000,
      Stat: spec.stat,
    },
  };
}

const SPECS: QuerySpec[] = [
  { id: 'scanCount', metricName: 'ScanLatencyMs', stat: 'SampleCount' },
  { id: 'scanLatencyAvgMs', metricName: 'ScanLatencyMs', stat: 'Average' },
  { id: 'scanLatencyP50Ms', metricName: 'ScanLatencyMs', stat: 'p50' },
  { id: 'scanLatencyP95Ms', metricName: 'ScanLatencyMs', stat: 'p95' },
  { id: 'bedrockInputTokens', metricName: 'BedrockInputTokens', stat: 'Sum' },
  { id: 'bedrockOutputTokens', metricName: 'BedrockOutputTokens', stat: 'Sum' },
  { id: 'textractPages', metricName: 'TextractPages', stat: 'Sum' },
  { id: 'translateCharacters', metricName: 'TranslateCharacters', stat: 'Sum' },
  { id: 'pollyCharacters', metricName: 'PollyCharacters', stat: 'Sum' },
  { id: 'ingestedRows', metricName: 'IngestedRows', stat: 'Sum' },
  { id: 'ingestionFailed', metricName: 'IngestionFailed', stat: 'Sum' },
  { id: 'matchesCreated', metricName: 'MatchesCreated', stat: 'Sum' },
  { id: 'pushSent', metricName: 'PushSent', stat: 'Sum' },
  { id: 'pushFailed', metricName: 'PushFailed', stat: 'Sum' },
  { id: 'emailSent', metricName: 'EmailSent', stat: 'Sum' },
  { id: 'emailFailed', metricName: 'EmailFailed', stat: 'Sum' },
  { id: 'tierFlagged', metricName: 'CheckTier', stat: 'Sum', dimensions: [{ name: 'tier', value: 'FLAGGED' }] },
  { id: 'tierVerify', metricName: 'CheckTier', stat: 'Sum', dimensions: [{ name: 'tier', value: 'VERIFY' }] },
  { id: 'tierNoAlert', metricName: 'CheckTier', stat: 'Sum', dimensions: [{ name: 'tier', value: 'NO_ALERT_FOUND' }] },
];

/** Fetches every dashboard metric for `stage` over the last 24h in one GetMetricData call. */
export async function fetchMeasuredUsage(stage: string, now: Date = new Date()): Promise<MeasuredUsage> {
  const end = now;
  const start = new Date(now.getTime() - WINDOW_MS);

  const res = await getCloudWatch().send(
    new GetMetricDataCommand({
      StartTime: start,
      EndTime: end,
      MetricDataQueries: SPECS.map((spec) => buildQuery(stage, spec)),
    }),
  );

  const value = (id: string): number | undefined => {
    const values = (res.MetricDataResults ?? []).find((r) => r.Id === id)?.Values;
    return values && values.length > 0 ? values[0] : undefined;
  };
  const sum = (id: string): number => value(id) ?? 0;

  return {
    scanCount: sum('scanCount'),
    scanLatencyAvgMs: value('scanLatencyAvgMs'),
    scanLatencyP50Ms: value('scanLatencyP50Ms'),
    scanLatencyP95Ms: value('scanLatencyP95Ms'),
    bedrockInputTokens: sum('bedrockInputTokens'),
    bedrockOutputTokens: sum('bedrockOutputTokens'),
    textractPages: sum('textractPages'),
    translateCharacters: sum('translateCharacters'),
    pollyCharacters: sum('pollyCharacters'),
    ingestedRows: sum('ingestedRows'),
    ingestionFailed: sum('ingestionFailed'),
    matchesCreated: sum('matchesCreated'),
    pushSent: sum('pushSent'),
    pushFailed: sum('pushFailed'),
    emailSent: sum('emailSent'),
    emailFailed: sum('emailFailed'),
    tierCounts: {
      FLAGGED: sum('tierFlagged'),
      VERIFY: sum('tierVerify'),
      NO_ALERT_FOUND: sum('tierNoAlert'),
    },
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
  };
}
