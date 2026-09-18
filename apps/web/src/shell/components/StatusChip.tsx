import type { MedicineStatus } from '@asli/contracts';

const CONFIG: Record<MedicineStatus, { label: string; icon: string; bg: string; text: string; border: string }> = {
  FLAGGED: { label: 'Alert', icon: '⚠', bg: 'var(--color-flagged-bg)', text: 'var(--color-flagged-text)', border: 'var(--color-flagged-border)' },
  VERIFY: { label: 'Please check', icon: '❓', bg: 'var(--color-verify-bg)', text: 'var(--color-verify-text)', border: 'var(--color-verify-border)' },
  NO_ALERT_FOUND: { label: 'No alert found', icon: '🔍', bg: 'var(--color-no-alert-bg)', text: 'var(--color-no-alert-text)', border: 'var(--color-no-alert-border)' },
  PENDING: { label: 'Checking…', icon: '…', bg: 'var(--color-no-alert-bg)', text: 'var(--color-no-alert-text)', border: 'var(--color-no-alert-border)' },
};

export interface StatusChipProps {
  tier: MedicineStatus;
}

/** Status is never colour-alone: icon + label text + colour, per docs/UX.md. */
export function StatusChip({ tier }: StatusChipProps) {
  const c = CONFIG[tier];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.35rem 0.75rem',
        borderRadius: '999px',
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        fontWeight: 600,
        fontSize: '0.9em',
      }}
    >
      <span aria-hidden="true">{c.icon}</span>
      {c.label}
    </span>
  );
}
