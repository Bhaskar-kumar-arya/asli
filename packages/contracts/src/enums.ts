import { z } from 'zod';

/** Matching tier. Decided only by packages/matching - see CLAUDE.md rule 1. */
export const TierSchema = z.enum(['FLAGGED', 'VERIFY', 'NO_ALERT_FOUND']);
export type Tier = z.infer<typeof TierSchema>;

/** Tier a saved medicine can be in while no check has completed yet. */
export const MedicineStatusSchema = z.enum([...TierSchema.options, 'PENDING']);
export type MedicineStatus = z.infer<typeof MedicineStatusSchema>;

export const CategorySchema = z.enum(['NSQ', 'SPURIOUS']);
export type Category = z.infer<typeof CategorySchema>;

/** docs/SAFETY_AND_CONTENT.md reason codes. */
export const ReasonCodeSchema = z.enum([
  'DISSOLUTION',
  'ASSAY',
  'IDENTIFICATION',
  'DISINTEGRATION',
  'STERILITY',
  'PARTICULATE',
  'MICROBIAL',
  'RELATED_SUBSTANCES',
  'PH',
  'DESCRIPTION',
  'UNIFORMITY',
  'LABELLING',
  'SPURIOUS',
  'OTHER',
]);
export type ReasonCode = z.infer<typeof ReasonCodeSchema>;

/** docs/MATCHING.md per-candidate and overall match reason codes. */
export const MatchReasonCodeSchema = z.enum([
  'BATCH_EXACT',
  'BATCH_NEAR',
  'MFR_STRONG',
  'MFR_WEAK',
  'MFR_UNKNOWN',
  'MFR_FROM_BRAND_MAP',
  'EXPIRY_DIFFERS',
  'LOW_READ_CONFIDENCE',
]);
export type MatchReasonCode = z.infer<typeof MatchReasonCodeSchema>;

/** docs/PERMISSIONS.md roles. */
export const RoleSchema = z.enum(['OWNER', 'EDITOR', 'VIEWER']);
export type Role = z.infer<typeof RoleSchema>;

/** docs/PERMISSIONS.md Cedar actions. */
export const CabinetActionSchema = z.enum([
  'ViewCabinet',
  'AddMedicine',
  'RemoveMedicine',
  'ManageMembers',
  'ReceiveAlerts',
]);
export type CabinetAction = z.infer<typeof CabinetActionSchema>;

/** How a MedicineIdentity was produced. */
export const ScanMethodSchema = z.enum(['strip_vision', 'bill_vision', 'qr']);
export type ScanMethod = z.infer<typeof ScanMethodSchema>;

/** MedicineIdentity.source - ScanMethod plus non-scan entry points. */
export const IdentitySourceSchema = z.enum([...ScanMethodSchema.options, 'manual', 'pharmacy_csv']);
export type IdentitySource = z.infer<typeof IdentitySourceSchema>;

export const ReportingSourceSchema = z.enum(['CENTRAL_LAB', 'STATE_LAB', 'UNKNOWN']);
export type ReportingSource = z.infer<typeof ReportingSourceSchema>;

/** docs/DATA_SOURCES.md ingestion source of a FlaggedBatch row. */
export const IngestionSourceTypeSchema = z.enum(['ENDPOINT', 'PDF', 'FIXTURE']);
export type IngestionSourceType = z.infer<typeof IngestionSourceTypeSchema>;

export const IngestionStatusSchema = z.enum(['PENDING', 'RUNNING', 'DONE', 'FAILED']);
export type IngestionStatus = z.infer<typeof IngestionStatusSchema>;

/** docs/ALERTS.md triggers. */
export const AlertTriggerSchema = z.enum(['NEW_ALERT', 'RETROACTIVE', 'DEMO']);
export type AlertTrigger = z.infer<typeof AlertTriggerSchema>;

/** docs/API.md upload kinds. */
export const UploadKindSchema = z.enum(['strip', 'bill', 'pharmacy']);
export type UploadKind = z.infer<typeof UploadKindSchema>;

/** docs/API.md scan request kinds (subset of UploadKind that scans support). */
export const ScanKindSchema = z.enum(['strip', 'bill']);
export type ScanKind = z.infer<typeof ScanKindSchema>;

/** docs/API.md POST /v1/scans warnings. */
export const ScanWarningSchema = z.enum(['LOW_READ_CONFIDENCE', 'NO_BATCH_ON_LINE', 'NOT_A_MEDICINE']);
export type ScanWarning = z.infer<typeof ScanWarningSchema>;

/** docs/API.md error envelope codes. */
export const ApiErrorCodeSchema = z.enum([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'EXTRACTION_FAILED',
  'INTERNAL',
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
