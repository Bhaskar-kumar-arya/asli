import { z } from 'zod';

/**
 * Cost model structure - see docs/OBSERVABILITY_AND_COST.md.
 * Unit prices are filled in during the event from AWS pricing pages for ap-south-1;
 * never guessed. Until then every entry is null and cost computations must treat
 * a null price as "unknown" rather than zero.
 */
export const PricingEntrySchema = z.object({
  pricePerUnit: z.number().nonnegative(),
  currency: z.enum(['USD', 'INR']),
  /** URL of the AWS pricing page the number was read from. */
  source: z.string().url(),
  /** Date (YYYY-MM-DD) the price was checked. */
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type PricingEntry = z.infer<typeof PricingEntrySchema>;

export const PRICING_KEYS = [
  'bedrockInputTokenPer1k',
  'bedrockOutputTokenPer1k',
  'textractPage',
  'translateCharacterPer1M',
  'pollyCharacterPer1M',
  'lambdaGbSecond',
  'lambdaRequest',
  'apiGatewayRequest',
  's3Put',
  's3Get',
  'dynamoWriteRequestUnit',
  'dynamoReadRequestUnit',
  'stepFunctionsStateTransition',
] as const;
export type PricingKey = (typeof PRICING_KEYS)[number];

export const PricingTableSchema = z.record(z.enum(PRICING_KEYS), PricingEntrySchema.nullable());
export type PricingTable = z.infer<typeof PricingTableSchema>;

/** Placeholder table: every price unknown until measured from the AWS pricing pages. */
export const PRICING_PLACEHOLDER: PricingTable = Object.fromEntries(
  PRICING_KEYS.map((key) => [key, null]),
) as PricingTable;

/**
 * The live pricing table lane J's cost engine (services/metrics) and the accuracy harness
 * (tools/accuracy) read. Every non-null entry below was read from the AWS Price List API
 * (`aws pricing get-products`, filtered `regionCode=ap-south-1`), not the client-rendered
 * pricing pages (those only ever return their default us-east-1 row to an automated fetch -
 * see the prior note this replaces and plan/tasks/J-dashboard.md Handoff). `source` cites the
 * matching public pricing page for a human to re-verify against; `checkedAt` is when the API
 * call was made, 2026-09-19.
 *
 * `bedrockOutputTokenPer1k` is left `null`: the Price List API has no output-token SKU for
 * Claude 3 Haiku in any region (checked us-east-1 and us-west-2, the only two regions Claude 3
 * Haiku is priced in at all - see the note below). Guessing AWS's commonly-quoted $0.00125/1K
 * would violate this file's own "null over a guessed figure" rule, so cost-per-scan/-run
 * figures that need it stay partially "unknown" until a human confirms it on the Bedrock
 * pricing page directly.
 *
 * **Bedrock/Claude region gap, worth flagging beyond just this file:** Claude 3 Haiku (and
 * every other Anthropic model) has no Price List entry for `ap-south-1` at all - only
 * `us-east-1` and `us-west-2` carry it. `bedrockInputTokenPer1k` below is therefore the
 * `us-east-1` rate, not ap-south-1's (there isn't one to read). This is independent of the
 * account-wide Bedrock `SubscriptionRequiredException` T01 found: even with that access
 * restored, a vision Lambda in `ap-south-1` invoking Claude would need a cross-region
 * inference profile, which has its own pricing/latency implications not modeled here.
 *
 * `pollyCharacterPer1M` uses the **Standard** engine rate, not Neural: lane I's Handoff found
 * zero Neural `hi-IN`/`kn-IN` voices in `ap-south-1`, so Standard is the only engine this app
 * can actually use for Hindi/Kannada read-aloud.
 *
 * `apiGatewayRequest` is the HTTP API rate (this project's shared API Gateway is HTTP API, not
 * REST) - do not swap in the REST API per-request price if this table is ever revisited.
 */
export const PRICING_TABLE: PricingTable = {
  bedrockInputTokenPer1k: {
    pricePerUnit: 0.00025,
    currency: 'USD',
    source: 'https://aws.amazon.com/bedrock/pricing/',
    checkedAt: '2026-09-19',
  },
  bedrockOutputTokenPer1k: null,
  textractPage: {
    pricePerUnit: 0.015,
    currency: 'USD',
    source: 'https://aws.amazon.com/textract/pricing/',
    checkedAt: '2026-09-19',
  },
  translateCharacterPer1M: {
    pricePerUnit: 15,
    currency: 'USD',
    source: 'https://aws.amazon.com/translate/pricing/',
    checkedAt: '2026-09-19',
  },
  pollyCharacterPer1M: {
    pricePerUnit: 4,
    currency: 'USD',
    source: 'https://aws.amazon.com/polly/pricing/',
    checkedAt: '2026-09-19',
  },
  lambdaGbSecond: {
    pricePerUnit: 0.0000166667,
    currency: 'USD',
    source: 'https://aws.amazon.com/lambda/pricing/',
    checkedAt: '2026-09-19',
  },
  lambdaRequest: {
    pricePerUnit: 0.0000002,
    currency: 'USD',
    source: 'https://aws.amazon.com/lambda/pricing/',
    checkedAt: '2026-09-19',
  },
  apiGatewayRequest: {
    pricePerUnit: 0.00000105,
    currency: 'USD',
    source: 'https://aws.amazon.com/api-gateway/pricing/',
    checkedAt: '2026-09-19',
  },
  s3Put: {
    pricePerUnit: 0.000005,
    currency: 'USD',
    source: 'https://aws.amazon.com/s3/pricing/',
    checkedAt: '2026-09-19',
  },
  s3Get: {
    pricePerUnit: 0.0000004,
    currency: 'USD',
    source: 'https://aws.amazon.com/s3/pricing/',
    checkedAt: '2026-09-19',
  },
  dynamoWriteRequestUnit: {
    pricePerUnit: 0.00000071,
    currency: 'USD',
    source: 'https://aws.amazon.com/dynamodb/pricing/on-demand/',
    checkedAt: '2026-09-19',
  },
  dynamoReadRequestUnit: {
    pricePerUnit: 0.0000001425,
    currency: 'USD',
    source: 'https://aws.amazon.com/dynamodb/pricing/on-demand/',
    checkedAt: '2026-09-19',
  },
  stepFunctionsStateTransition: {
    pricePerUnit: 0.0000285,
    currency: 'USD',
    source: 'https://aws.amazon.com/step-functions/pricing/',
    checkedAt: '2026-09-19',
  },
};
