import type { Category } from './enums';

/**
 * PK/SK/GSI key builders for every table in docs/DATA_MODEL.md.
 * Lanes must build keys with these functions rather than hand-formatting strings,
 * so a format change (e.g. a new separator) only needs to happen here.
 */

// ---- FlaggedBatches ----
export const flaggedBatchPk = (batchNorm: string): string => `BATCH#${batchNorm}`;
export const flaggedBatchSk = (alertMonth: string, category: Category, rowHash: string): string =>
  `ALERT#${alertMonth}#${category}#${rowHash}`;
export const flaggedBatchGsi1Pk = (batchSkeleton: string): string => `SKEL#${batchSkeleton}`;
export const flaggedBatchGsi1Sk = (alertMonth: string, rowHash: string): string =>
  `ALERT#${alertMonth}#${rowHash}`;
export const flaggedBatchGsi2Pk = (alertMonth: string): string => `MONTH#${alertMonth}`;
export const flaggedBatchGsi2Sk = (category: Category, rowHash: string): string => `${category}#${rowHash}`;

/** Single-alert lookup ref carried in API responses: base64url of `PK|SK`. */
export const encodeAlertRef = (pk: string, sk: string): string =>
  Buffer.from(`${pk}|${sk}`, 'utf8').toString('base64url');

export const decodeAlertRef = (alertRef: string): { pk: string; sk: string } => {
  const decoded = Buffer.from(alertRef, 'base64url').toString('utf8');
  const sep = decoded.indexOf('|');
  if (sep === -1) {
    throw new Error(`Malformed alertRef: ${alertRef}`);
  }
  return { pk: decoded.slice(0, sep), sk: decoded.slice(sep + 1) };
};

// ---- IngestionState ----
export const ingestionStatePk = (yyyyMm: string): string => `MONTH#${yyyyMm}`;
export const ingestionStateSk = (tab: 'nsq' | 'spurious'): string => `TAB#${tab}`;

// ---- Cabinets (single table) ----
export const cabinetPk = (cabinetId: string): string => `CAB#${cabinetId}`;
export const cabinetMetaSk = (): string => 'META';
export const cabinetMemberSk = (userId: string): string => `MEMBER#${userId}`;
export const cabinetMemberGsi1Pk = (userId: string): string => `USER#${userId}`;
export const cabinetMemberGsi1Sk = (cabinetId: string): string => `CAB#${cabinetId}`;
export const cabinetInviteSk = (code: string): string => `INVITE#${code}`;
export const cabinetInviteGsi2Pk = (code: string): string => `INVITE#${code}`;
export const cabinetMedicineSk = (medId: string): string => `MED#${medId}`;
export const cabinetMedicineGsi3Pk = (batchSkeleton: string): string => `SKEL#${batchSkeleton}`;
export const cabinetMedicineGsi3Sk = (cabinetId: string, medId: string): string =>
  `CAB#${cabinetId}#MED#${medId}`;
export const cabinetMatchSk = (medId: string, alertId: string): string => `MATCH#${medId}#${alertId}`;

// ---- PushSubscriptions ----
export const pushSubscriptionPk = (userId: string): string => `USER#${userId}`;
export const pushSubscriptionSk = (endpointSha256: string): string => `SUB#${endpointSha256}`;

// ---- Reference ----
export const referenceManufacturerPk = (manufacturerNorm: string): string => `MFR#${manufacturerNorm}`;
export const referenceAliasSk = (aliasNorm: string): string => `ALIAS#${aliasNorm}`;
export const referenceAliasGsi1Pk = (aliasNorm: string): string => `ALIAS#${aliasNorm}`;
export const referenceBrandPk = (brandNorm: string): string => `BRAND#${brandNorm}`;
export const referenceBrandMfrSk = (manufacturerNorm: string): string => `MFR#${manufacturerNorm}`;
export const referenceReasonPk = (reasonRawNorm: string): string => `REASON#${reasonRawNorm}`;
export const referenceReasonSk = (): string => 'CODE';

// ---- Stats ----
export const statsPk = (kind: string): string => `STATS#${kind}`;
export const statsSk = (scope: string): string => scope;

// ---- Reports (Wave 2) ----
export const reportPk = (yyyyMm: string): string => `REPORT#${yyyyMm}`;
export const reportSk = (reportId: string): string => reportId;
