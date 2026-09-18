import { ConverseCommand, type BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { GetCommand, PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ReasonCodeSchema, type ReasonCode } from '@asli/contracts';
import { referenceReasonPk, referenceReasonSk } from '@asli/contracts';
import type { Metrics } from '@aws-lambda-powertools/metrics';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import type { ReasonClassifier } from '../cdsco';

function normalizeKey(reasonRaw: string): string {
  return reasonRaw.trim().toLowerCase();
}

export interface BedrockClassifierDeps {
  bedrock: BedrockRuntimeClient;
  doc: DynamoDBDocumentClient;
  referenceTableName: string;
  modelId: string;
  metrics?: Metrics;
}

const REASON_ENUM_LIST = ReasonCodeSchema.options.join(', ');

/**
 * docs/DATA_SOURCES.md §4 / docs/SAFETY_AND_CONTENT.md: Bedrock only classifies
 * reasonRaw values the keyword rules (A1's `classifyReasonByKeyword`, tried
 * first by `normalizeRows` before this is ever called) didn't cover, is
 * constrained to the ReasonCode enum, and is cached in Reference `REASON#`
 * so the same reasonRaw is never billed twice. No LLM decides a tier
 * (CLAUDE.md rule 1) - this only fills in a plain-language category.
 */
export function createBedrockReasonClassifier(deps: BedrockClassifierDeps): ReasonClassifier {
  return async (reasonRaw: string): Promise<ReasonCode> => {
    const key = normalizeKey(reasonRaw);

    const cached = await deps.doc.send(
      new GetCommand({
        TableName: deps.referenceTableName,
        Key: { PK: referenceReasonPk(key), SK: referenceReasonSk() },
      }),
    );
    if (cached.Item?.reasonCode) {
      const parsedCached = ReasonCodeSchema.safeParse(cached.Item.reasonCode);
      if (parsedCached.success) return parsedCached.data;
    }

    // A Bedrock outage/access issue (e.g. this account's model access is still
    // pending - see plan/tasks/T01-spikes.md Handoff) must not fail the whole
    // month's ingestion over one unmapped reasonRaw: docs/DATA_SOURCES.md's
    // "else OTHER" fallback applies here too, not just to an unparseable
    // reply. The failure is deliberately NOT cached, so a later run retries
    // Bedrock once access is restored instead of being stuck on OTHER.
    let text = '';
    try {
      const res = await deps.bedrock.send(
        new ConverseCommand({
          modelId: deps.modelId,
          system: [
            {
              text:
                'You classify a CDSCO drug quality-alert reason into exactly one code from this fixed list: ' +
                `${REASON_ENUM_LIST}. Reply with only the code, nothing else. If none fit, reply OTHER.`,
            },
          ],
          messages: [{ role: 'user', content: [{ text: reasonRaw }] }],
          inferenceConfig: { maxTokens: 16, temperature: 0 },
        }),
      );

      deps.metrics?.addDimension('purpose', 'reason');
      deps.metrics?.addMetric('BedrockInputTokens', MetricUnit.Count, res.usage?.inputTokens ?? 0);
      deps.metrics?.addMetric('BedrockOutputTokens', MetricUnit.Count, res.usage?.outputTokens ?? 0);

      const content = res.output?.message?.content?.[0];
      text = (content && 'text' in content ? content.text : undefined)?.trim().toUpperCase() ?? '';
    } catch {
      return 'OTHER';
    }

    const parsed = ReasonCodeSchema.safeParse(text);
    const reasonCode: ReasonCode = parsed.success ? parsed.data : 'OTHER';

    await deps.doc.send(
      new PutCommand({
        TableName: deps.referenceTableName,
        Item: {
          PK: referenceReasonPk(key),
          SK: referenceReasonSk(),
          reasonCode,
          classifiedAt: new Date().toISOString(),
        },
      }),
    );

    return reasonCode;
  };
}
