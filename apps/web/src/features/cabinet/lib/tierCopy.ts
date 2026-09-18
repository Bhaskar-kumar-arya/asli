import type { MedicineStatus } from '@asli/contracts';

// Wording follows docs/SAFETY_AND_CONTENT.md - never "safe"/"genuine"/"verified", always "batch" not brand.
export interface TierCopy {
  label: string;
  icon: string;
  colorVar: string;
}

const TIER_COPY: Record<MedicineStatus, TierCopy> = {
  FLAGGED: { label: 'On a CDSCO alert list', icon: '⚠', colorVar: 'var(--tier-flagged)' },
  VERIFY: { label: 'Please check with your pharmacist', icon: '❓', colorVar: 'var(--tier-verify)' },
  NO_ALERT_FOUND: { label: 'No alert found for this batch', icon: '🔍', colorVar: 'var(--tier-none)' },
  PENDING: { label: 'Checking…', icon: '⏳', colorVar: 'var(--tier-pending)' },
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
