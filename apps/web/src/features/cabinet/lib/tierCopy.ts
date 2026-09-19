import type { MedicineStatus } from '@asli/contracts';

// Wording follows docs/SAFETY_AND_CONTENT.md - never "safe"/"genuine"/"verified", always "batch" not brand.
export interface TierCopy {
  label: string;
}

const TIER_COPY: Record<MedicineStatus, TierCopy> = {
  FLAGGED: { label: 'On a CDSCO alert list' },
  VERIFY: { label: 'Please check with your pharmacist' },
  NO_ALERT_FOUND: { label: 'No alert found for this batch' },
  PENDING: { label: 'Checking…' },
};

export function tierCopy(status: MedicineStatus): TierCopy {
  return TIER_COPY[status];
}

export function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-').map(Number);
  if (!year || !month) return yyyyMm;
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
