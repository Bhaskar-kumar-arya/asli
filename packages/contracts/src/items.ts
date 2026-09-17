import { z } from 'zod';
import { MedicineIdentitySchema } from './api';
import {
  AlertTriggerSchema,
  CategorySchema,
  IngestionSourceTypeSchema,
  IngestionStatusSchema,
  MatchReasonCodeSchema,
  ReasonCodeSchema,
  RoleSchema,
  TierSchema,
  MedicineStatusSchema,
} from './enums';

const yyyyMm = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM');

/** Domain fields of a CDSCO row - see docs/DATA_SOURCES.md §4. Key fields added by FlaggedBatchItemSchema. */
export const FlaggedBatchSchema = z.object({
  productName: z.string(),
  batchRaw: z.string(),
  batchNorm: z.string(),
  batchSkeleton: z.string(),
  mfgMonth: yyyyMm.nullable(),
  expMonth: yyyyMm.nullable(),
  manufacturerRaw: z.string(),
  manufacturerNorm: z.string(),
  category: CategorySchema,
  reasonRaw: z.string(),
  reasonCode: ReasonCodeSchema,
  reportingSource: z.string(),
  reportingLab: z.string().optional(),
  alertMonth: yyyyMm,
  sourceUrl: z.string().url(),
  snapshotKey: z.string(),
  /** sha256 of alertMonth+category+batchNorm+manufacturerNorm+productName. */
  rowHash: z.string(),
  /** = rowHash. */
  alertId: z.string(),
  ingestedAt: z.string().datetime(),
  /** true only for demo-injected rows (docs/ALERTS.md demo path). */
  demo: z.boolean(),
});
export type FlaggedBatch = z.infer<typeof FlaggedBatchSchema>;

export const FlaggedBatchItemSchema = FlaggedBatchSchema.extend({
  PK: z.string(),
  SK: z.string(),
  GSI1PK: z.string(),
  GSI1SK: z.string(),
  GSI2PK: z.string(),
  GSI2SK: z.string(),
});
export type FlaggedBatchItem = z.infer<typeof FlaggedBatchItemSchema>;

export const IngestionStateItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  status: IngestionStatusSchema,
  sourceType: IngestionSourceTypeSchema,
  rowCount: z.number().int().nonnegative(),
  snapshotKeys: z.array(z.string()),
  executionArn: z.string().optional(),
  updatedAt: z.string().datetime(),
  error: z.string().optional(),
});
export type IngestionStateItem = z.infer<typeof IngestionStateItemSchema>;

// ---- Cabinets (single table) ----

export const CabinetMetaItemSchema = z.object({
  PK: z.string(),
  SK: z.literal('META'),
  name: z.string(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
});
export type CabinetMetaItem = z.infer<typeof CabinetMetaItemSchema>;

export const MemberItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  role: RoleSchema,
  alertsEnabled: z.boolean(),
  /** Never logged - CLAUDE.md privacy rule. */
  email: z.string().email().optional(),
  joinedAt: z.string().datetime(),
  GSI1PK: z.string(),
  GSI1SK: z.string(),
});
export type MemberItem = z.infer<typeof MemberItemSchema>;

export const InviteItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  role: RoleSchema,
  /** TTL attribute, epoch seconds. */
  expiresAt: z.number().int().positive(),
  createdBy: z.string(),
  GSI2PK: z.string(),
});
export type InviteItem = z.infer<typeof InviteItemSchema>;

export const MedicineItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  identity: MedicineIdentitySchema,
  label: z.string().optional(),
  forPerson: z.string().optional(),
  addedBy: z.string(),
  addedAt: z.string().datetime(),
  lastCheckedAt: z.string().datetime().optional(),
  latestTier: MedicineStatusSchema,
  GSI3PK: z.string(),
  GSI3SK: z.string(),
});
export type MedicineItem = z.infer<typeof MedicineItemSchema>;

export const MatchItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  tier: z.enum(['FLAGGED', 'VERIFY']),
  category: CategorySchema,
  alertRef: z.string(),
  reasonCode: z.array(MatchReasonCodeSchema),
  alertMonth: yyyyMm,
  trigger: AlertTriggerSchema,
  createdAt: z.string().datetime(),
  notifiedAt: z.string().datetime().optional(),
});
export type MatchItem = z.infer<typeof MatchItemSchema>;

// ---- PushSubscriptions ----

export const PushSubscriptionItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
  userAgent: z.string(),
  createdAt: z.string().datetime(),
  lastSuccessAt: z.string().datetime().optional(),
  failures: z.number().int().nonnegative(),
});
export type PushSubscriptionItem = z.infer<typeof PushSubscriptionItemSchema>;

// ---- Reference ----

export const ManufacturerAliasItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  GSI1PK: z.string(),
  createdAt: z.string().datetime(),
});
export type ManufacturerAliasItem = z.infer<typeof ManufacturerAliasItemSchema>;

export const BrandManufacturerCandidateItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  confidence: z.number().min(0).max(1),
  /** CDSCO rows whose product name contains the brand, as rowHash references. */
  evidence: z.array(z.string()),
});
export type BrandManufacturerCandidateItem = z.infer<typeof BrandManufacturerCandidateItemSchema>;

export const ReasonClassificationItemSchema = z.object({
  PK: z.string(),
  SK: z.literal('CODE'),
  reasonCode: ReasonCodeSchema,
  classifiedAt: z.string().datetime(),
});
export type ReasonClassificationItem = z.infer<typeof ReasonClassificationItemSchema>;

// ---- Stats ----

export const StatsDocumentSchema = z.object({
  generatedAt: z.string().datetime(),
  ingestion: z.object({
    lastRunAt: z.string().datetime().optional(),
    rowsByCategory: z.record(CategorySchema, z.number().int().nonnegative()),
    failures: z.number().int().nonnegative(),
  }),
  scans: z.object({
    count: z.number().int().nonnegative(),
    latencyP50Ms: z.number().nonnegative().optional(),
    latencyP95Ms: z.number().nonnegative().optional(),
    failures: z.number().int().nonnegative(),
    edits: z.number().int().nonnegative(),
  }),
  matching: z.object({
    tierCounts: z.record(TierSchema, z.number().int().nonnegative()),
    matchesCreated: z.number().int().nonnegative(),
  }),
  alerts: z.object({
    pushSent: z.number().int().nonnegative(),
    pushFailed: z.number().int().nonnegative(),
    emailSent: z.number().int().nonnegative(),
    emailFailed: z.number().int().nonnegative(),
  }),
  cost: z.object({
    tokensByPurpose: z.record(z.string(), z.number().int().nonnegative()),
    costPer1000ScansUsd: z.number().nonnegative().optional(),
  }),
});
export type StatsDocument = z.infer<typeof StatsDocumentSchema>;

export const StatsItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  document: StatsDocumentSchema,
});
export type StatsItem = z.infer<typeof StatsItemSchema>;

// ---- Reports (PvPI, private, Wave 2) ----

export const ReportItemSchema = z.object({
  PK: z.string(),
  SK: z.string(),
  problemType: z.string(),
  alertRef: z.string().optional(),
  batchNorm: z.string(),
  note: z.string().max(280).optional(),
  createdAt: z.string().datetime(),
});
export type ReportItem = z.infer<typeof ReportItemSchema>;

// ---- Idempotency (Powertools standard schema) ----

export const IdempotencyItemSchema = z.object({
  id: z.string(),
  status: z.enum(['INPROGRESS', 'COMPLETED', 'EXPIRED']),
  expiration: z.number().int().positive(),
  data: z.unknown().optional(),
  validation: z.string().optional(),
});
export type IdempotencyItem = z.infer<typeof IdempotencyItemSchema>;
