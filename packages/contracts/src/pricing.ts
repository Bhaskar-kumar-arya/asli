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
