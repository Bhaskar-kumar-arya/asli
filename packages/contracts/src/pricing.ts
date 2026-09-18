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
 * (tools/accuracy) read. Fill each key in with a `PricingEntry` read off the AWS Pricing
 * Calculator (https://calculator.aws) with region set to Asia Pacific (Mumbai) ap-south-1,
 * and set `checkedAt` to that day. Do not copy a number from a region-selector page you
 * couldn't confirm was showing ap-south-1 - a `null` here (rendered as "unknown" everywhere
 * downstream, never as 0) is more honest than a guessed figure.
 *
 * Unfilled this session: AWS's public pricing pages (aws.amazon.com/*\/pricing/) render their
 * region-specific tables client-side, so an automated fetch only ever returns the default
 * (usually us-east-1) row. Confirmed ap-south-1 numbers need the Pricing Calculator's "Add
 * service" flow with the region explicitly selected, or the Price List API
 * (https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/using-price-list-query-api.html)
 * with a region filter - both need a human (or a longer, more targeted session) to do once,
 * for real, during the event. See plan/tasks/J-dashboard.md Handoff.
 */
export const PRICING_TABLE: PricingTable = { ...PRICING_PLACEHOLDER };
