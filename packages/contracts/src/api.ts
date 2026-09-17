import { z } from 'zod';
import {
  ApiErrorCodeSchema,
  CategorySchema,
  IdentitySourceSchema,
  MatchReasonCodeSchema,
  ReasonCodeSchema,
  RoleSchema,
  ScanKindSchema,
  ScanMethodSchema,
  ScanWarningSchema,
  TierSchema,
  MedicineStatusSchema,
} from './enums';

/** docs/API.md error envelope. */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    requestId: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// ---- Core types (docs/API.md "Core types") ----

export const FieldConfidenceSchema = z.object({
  batchNumber: z.number().min(0).max(1).optional(),
  manufacturer: z.number().min(0).max(1).optional(),
  productName: z.number().min(0).max(1).optional(),
  expMonth: z.number().min(0).max(1).optional(),
});
export type FieldConfidence = z.infer<typeof FieldConfidenceSchema>;

const yyyyMm = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM');

export const MedicineIdentitySchema = z.object({
  productName: z.string().optional(),
  brandName: z.string().optional(),
  batchNumber: z.string().min(1),
  manufacturer: z.string().optional(),
  mfgMonth: yyyyMm.optional(),
  expMonth: yyyyMm.optional(),
  strength: z.string().optional(),
  dosageForm: z.string().optional(),
  mrp: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  source: IdentitySourceSchema,
  fieldConfidence: FieldConfidenceSchema.optional(),
});
export type MedicineIdentity = z.infer<typeof MedicineIdentitySchema>;

export const AlertSummarySchema = z.object({
  alertRef: z.string(),
  alertMonth: yyyyMm,
  category: CategorySchema,
  productName: z.string(),
  batchRaw: z.string(),
  manufacturerRaw: z.string(),
  mfgMonth: yyyyMm.optional(),
  expMonth: yyyyMm.optional(),
  reasonCode: ReasonCodeSchema,
  reasonRaw: z.string(),
  reportingSource: z.string(),
  reportingLab: z.string().optional(),
  sourceUrl: z.string().url(),
  demo: z.boolean(),
});
export type AlertSummary = z.infer<typeof AlertSummarySchema>;

export const CheckItemResultSchema = z.object({
  identity: MedicineIdentitySchema,
  tier: TierSchema,
  reasonCodes: z.array(MatchReasonCodeSchema),
  matches: z.array(AlertSummarySchema),
  checkedAgainst: z.object({
    monthCount: z.number().int().nonnegative(),
    latestMonth: yyyyMm,
  }),
  /** packages/content template key for the tier's guidance copy. */
  guidanceKey: z.string(),
});
export type CheckItemResult = z.infer<typeof CheckItemResultSchema>;

/** A line vision-extracted from a strip/bill photo, before matching. */
export const ExtractedItemSchema = MedicineIdentitySchema;
export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;

// ---- POST /v1/uploads ----
export const CreateUploadRequestSchema = z.object({
  kind: z.enum(['strip', 'bill', 'pharmacy']),
  contentType: z.string(),
});
export type CreateUploadRequest = z.infer<typeof CreateUploadRequestSchema>;

export const CreateUploadResponseSchema = z.object({
  uploadId: z.string(),
  url: z.string().url(),
  fields: z.record(z.string(), z.string()).optional(),
  expiresAt: z.string().datetime(),
});
export type CreateUploadResponse = z.infer<typeof CreateUploadResponseSchema>;

// ---- POST /v1/scans ----
export const ScanRequestSchema = z.object({
  uploadId: z.string(),
  kind: ScanKindSchema,
  qrText: z.string().optional(),
});
export type ScanRequest = z.infer<typeof ScanRequestSchema>;

export const ScanResponseSchema = z.object({
  scanId: z.string(),
  method: ScanMethodSchema,
  items: z.array(ExtractedItemSchema),
  results: z.array(CheckItemResultSchema),
  warnings: z.array(ScanWarningSchema),
});
export type ScanResponse = z.infer<typeof ScanResponseSchema>;

// ---- POST /v1/checks ----
export const CheckRequestSchema = z.object({
  items: z.array(MedicineIdentitySchema).min(1).max(50),
});
export type CheckRequest = z.infer<typeof CheckRequestSchema>;

export const CheckResponseSchema = z.object({
  results: z.array(CheckItemResultSchema),
});
export type CheckResponse = z.infer<typeof CheckResponseSchema>;

// ---- GET /v1/alerts/{alertRef} ----
export const AlertDetailSchema = AlertSummarySchema.extend({
  snapshotKey: z.string(),
  ingestedAt: z.string().datetime(),
});
export type AlertDetail = z.infer<typeof AlertDetailSchema>;

// ---- Cabinets (F) ----
export const CabinetSchema = z.object({
  cabinetId: z.string(),
  name: z.string(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
});
export type Cabinet = z.infer<typeof CabinetSchema>;

export const CabinetSummarySchema = CabinetSchema.extend({
  role: RoleSchema,
});
export type CabinetSummary = z.infer<typeof CabinetSummarySchema>;

export const CabinetListSchema = z.object({
  cabinets: z.array(CabinetSummarySchema),
  nextToken: z.string().optional(),
});
export type CabinetList = z.infer<typeof CabinetListSchema>;

export const CreateCabinetRequestSchema = z.object({
  name: z.string().min(1),
});
export type CreateCabinetRequest = z.infer<typeof CreateCabinetRequestSchema>;

export const MemberSchema = z.object({
  userId: z.string(),
  role: RoleSchema,
  alertsEnabled: z.boolean(),
  joinedAt: z.string().datetime(),
});
export type Member = z.infer<typeof MemberSchema>;

export const MedicineWithStatusSchema = z.object({
  medId: z.string(),
  identity: MedicineIdentitySchema,
  label: z.string().optional(),
  forPerson: z.string().optional(),
  addedBy: z.string(),
  addedAt: z.string().datetime(),
  lastCheckedAt: z.string().datetime().optional(),
  latestTier: MedicineStatusSchema,
});
export type MedicineWithStatus = z.infer<typeof MedicineWithStatusSchema>;

export const MatchSummarySchema = z.object({
  medId: z.string(),
  alertRef: z.string(),
  tier: z.enum(['FLAGGED', 'VERIFY']),
  category: CategorySchema,
  alertMonth: yyyyMm,
  createdAt: z.string().datetime(),
});
export type MatchSummary = z.infer<typeof MatchSummarySchema>;

export const CabinetDetailSchema = z.object({
  cabinet: CabinetSchema,
  members: z.array(MemberSchema),
  medicines: z.array(MedicineWithStatusSchema),
  matches: z.array(MatchSummarySchema),
});
export type CabinetDetail = z.infer<typeof CabinetDetailSchema>;

export const AddMedicineRequestSchema = z.object({
  identity: MedicineIdentitySchema,
  label: z.string().optional(),
  forPerson: z.string().optional(),
});
export type AddMedicineRequest = z.infer<typeof AddMedicineRequestSchema>;

// ---- Invites and members (H) ----
export const CreateInviteRequestSchema = z.object({
  role: RoleSchema,
});
export type CreateInviteRequest = z.infer<typeof CreateInviteRequestSchema>;

export const InviteSchema = z.object({
  code: z.string(),
  role: RoleSchema,
  expiresAt: z.string().datetime(),
});
export type Invite = z.infer<typeof InviteSchema>;

export const UpdateMemberRequestSchema = z
  .object({
    role: RoleSchema.optional(),
    alertsEnabled: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.alertsEnabled !== undefined, {
    message: 'at least one of role or alertsEnabled is required',
  });
export type UpdateMemberRequest = z.infer<typeof UpdateMemberRequestSchema>;

// ---- Push (G1) ----
export const PushSubscriptionKeysSchema = z.object({
  p256dh: z.string(),
  auth: z.string(),
});
export type PushSubscriptionKeys = z.infer<typeof PushSubscriptionKeysSchema>;

export const PushSubscriptionRequestSchema = z.object({
  endpoint: z.string().url(),
  keys: PushSubscriptionKeysSchema,
  userAgent: z.string(),
});
export type PushSubscriptionRequest = z.infer<typeof PushSubscriptionRequestSchema>;

export const VapidPublicKeyResponseSchema = z.object({
  publicKey: z.string(),
});
export type VapidPublicKeyResponse = z.infer<typeof VapidPublicKeyResponseSchema>;

// ---- Content (I) ----
export const GuidanceTemplateSchema = z.object({
  key: z.string(),
  lang: z.enum(['en', 'hi', 'kn']),
  title: z.string(),
  body: z.string(),
  whatToDoNext: z.array(z.string()),
  reviewedBy: z.string().optional(),
  reviewedAt: z.string().datetime().optional(),
});
export type GuidanceTemplate = z.infer<typeof GuidanceTemplateSchema>;

// ---- Reports / PvPI (L, Wave 2) ----
export const ProblemReportRequestSchema = z.object({
  identity: MedicineIdentitySchema,
  alertRef: z.string().optional(),
  problemType: z.string(),
  note: z.string().max(280).optional(),
});
export type ProblemReportRequest = z.infer<typeof ProblemReportRequestSchema>;

export const ProblemReportResponseSchema = z.object({
  pvpi: z.object({
    howToReport: z.string(),
    links: z.array(z.string().url()),
  }),
});
export type ProblemReportResponse = z.infer<typeof ProblemReportResponseSchema>;

// ---- Public stats / insights / metrics (S, M, J) ----
export const PublicStatsSchema = z.object({
  generatedAt: z.string().datetime(),
  monthsCovered: z.number().int().nonnegative(),
  latestMonth: yyyyMm,
  totalFlaggedBatches: z.number().int().nonnegative(),
  cabinetsProtected: z.number().int().nonnegative(),
  medicinesTracked: z.number().int().nonnegative(),
});
export type PublicStats = z.infer<typeof PublicStatsSchema>;

export const InsightsResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  byCategory: z.record(CategorySchema, z.number().int().nonnegative()),
  byMonth: z.array(z.object({ month: yyyyMm, count: z.number().int().nonnegative() })),
  topReasonCodes: z.array(z.object({ reasonCode: ReasonCodeSchema, count: z.number().int().nonnegative() })),
});
export type InsightsResponse = z.infer<typeof InsightsResponseSchema>;

export const MetricsSummarySchema = z.object({
  accuracy: z.object({
    sampleSize: z.number().int().nonnegative(),
    precision: z.number().min(0).max(1).optional(),
    recall: z.number().min(0).max(1).optional(),
    measuredAt: z.string().datetime().optional(),
  }),
  cost: z.object({
    costPer1000ScansUsd: z.number().nonnegative().optional(),
    measuredAt: z.string().datetime().optional(),
  }),
});
export type MetricsSummary = z.infer<typeof MetricsSummarySchema>;

// ---- Pharmacy mode (N, Wave 2) ----
export const PharmacyCheckRequestSchema = z.union([
  z.object({ uploadId: z.string() }),
  z.object({ csv: z.string() }),
]);
export type PharmacyCheckRequest = z.infer<typeof PharmacyCheckRequestSchema>;

export const PharmacyCheckResponseSchema = z.object({
  rows: z.array(CheckItemResultSchema.extend({ quantity: z.number().int().nonnegative().optional() })),
  flaggedUnits: z.number().int().nonnegative(),
});
export type PharmacyCheckResponse = z.infer<typeof PharmacyCheckResponseSchema>;

// ---- Demo replay (A2) ----
export const DemoReplayRequestSchema = z.object({
  fixtureKey: z.string(),
});
export type DemoReplayRequest = z.infer<typeof DemoReplayRequestSchema>;

export const DemoReplayResponseSchema = z.object({
  executionArn: z.string(),
});
export type DemoReplayResponse = z.infer<typeof DemoReplayResponseSchema>;
