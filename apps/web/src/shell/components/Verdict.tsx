import type { Category, MedicineStatus } from '@asli/contracts';

/**
 * The verdict is never colour alone. Three signals ride together:
 * a drawn margin mark (legible in greyscale), the words, and the ink.
 * NO_ALERT_FOUND is never stamped — an unlisted batch simply has no entry,
 * which is why nothing here can ever read "safe".
 */

const MARK: Record<MedicineStatus, { d: string; fill: string; label: string }> = {
  FLAGGED: { d: 'M2 2h12v12H2z', fill: 'currentColor', label: 'On record' },
  VERIFY: { d: 'M2 2h12v12H2zM2 8h12', fill: 'none', label: 'Referred' },
  NO_ALERT_FOUND: { d: 'M2 2h12v12H2z', fill: 'none', label: 'No entry' },
  PENDING: { d: 'M2 2h12v12H2z', fill: 'none', label: 'Pending' },
};

export function MarginMark({ tier }: { tier: MedicineStatus }) {
  const m = MARK[tier];
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none' }}
    >
      {tier === 'VERIFY' ? <path d="M2 8h12v6H2z" fill="currentColor" stroke="none" /> : null}
      {tier === 'PENDING' ? <path d="M2 2h12v12H2z" strokeDasharray="3 3" /> : <path d={m.d} fill={m.fill} />}
      {tier === 'VERIFY' ? <path d="M2 2h12v12H2z" /> : null}
    </svg>
  );
}

export function stampWords(tier: MedicineStatus, category?: Category): string {
  if (tier === 'FLAGGED') {
    return category === 'SPURIOUS' ? 'Declared spurious' : 'Not of standard quality';
  }
  if (tier === 'VERIFY') return 'Referred — particulars incomplete';
  if (tier === 'PENDING') return 'Checking against the register';
  return 'No entry on record';
}

export interface VerdictProps {
  tier: MedicineStatus;
  category?: Category;
  large?: boolean;
  /** The stamp lands once, when a result first resolves. */
  struck?: boolean;
}

/**
 * FLAGGED and VERIFY are struck with a stamp. NO_ALERT_FOUND and PENDING are
 * printed, because the register has no stamp for an absence.
 */
export function Verdict({ tier, category, large, struck }: VerdictProps) {
  const words = stampWords(tier, category);

  if (tier === 'NO_ALERT_FOUND' || tier === 'PENDING') {
    return (
      <span className="reg-nil">
        <MarginMark tier={tier} /> <span style={{ marginInlineStart: '0.4rem' }}>{words}</span>
      </span>
    );
  }

  const cls = [
    'reg-stamp',
    tier === 'FLAGGED' ? 'reg-stamp--flagged' : 'reg-stamp--verify',
    large ? 'reg-stamp--lg' : '',
    struck ? 'reg-stamp--struck' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls}>
      <MarginMark tier={tier} />
      {words}
    </span>
  );
}
