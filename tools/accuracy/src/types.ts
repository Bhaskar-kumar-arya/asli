import { z } from 'zod';

const yyyyMm = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM');

/** docs/TESTING.md "Test set" conditions block. */
export const ConditionsSchema = z.object({
  foil: z.boolean(),
  lighting: z.enum(['good', 'poor']),
  angle: z.enum(['flat', 'tilted']),
  blur: z.boolean(),
});
export type Conditions = z.infer<typeof ConditionsSchema>;

/** Ground truth for a single strip photo. */
export const StripTruthSchema = z.object({
  productName: z.string().optional(),
  batchNumber: z.string(),
  manufacturer: z.string().optional(),
  expMonth: yyyyMm.optional(),
});
export type StripTruth = z.infer<typeof StripTruthSchema>;

/** Ground truth for one medicine line on a bill. */
export const BillLineTruthSchema = z.object({
  productName: z.string().optional(),
  batchNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  expMonth: yyyyMm.optional(),
});
export type BillLineTruth = z.infer<typeof BillLineTruthSchema>;

export const BillTruthSchema = z.object({
  lines: z.array(BillLineTruthSchema).min(1),
});
export type BillTruth = z.infer<typeof BillTruthSchema>;

/** `<id>.json` next to `<id>.jpg` in testset/strips or testset/bills - docs/TESTING.md "Test set". */
export const LabelSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('strip'), truth: StripTruthSchema, conditions: ConditionsSchema }),
  z.object({ kind: z.literal('bill'), truth: BillTruthSchema, conditions: ConditionsSchema }),
]);
export type Label = z.infer<typeof LabelSchema>;

/** A labelled testset item resolved from disk. */
export interface TestsetItem {
  id: string;
  kind: 'strip' | 'bill';
  imagePath: string;
  label: Label;
}
