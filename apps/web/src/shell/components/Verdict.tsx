import type { Category, MedicineStatus } from '@asli/contracts';

/**
 * The verdict is never colour alone. Three signals ride together:
 * a drawn margin mark (legible in greyscale), the words, and the ink.
 * NO_ALERT_FOUND is never stamped — an unlisted batch simply has no entry,
 * which is why nothing here can ever read "safe".
 */

export function MarginMark({ tier }: { tier: MedicineStatus }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none' }}
    >
      {tier === 'FLAGGED' ? <path d="M2 2h12v12H2z" fill="currentColor" /> : null}
      {tier === 'VERIFY' ? (
        <>
          <path d="M2 8h12v6H2z" fill="currentColor" stroke="none" />
          <path d="M2 2h12v12H2z" />
        </>
      ) : null}
      {tier === 'NO_ALERT_FOUND' ? <path d="M2 2h12v12H2z" /> : null}
      {tier === 'PENDING' ? <path d="M2 2h12v12H2z" strokeDasharray="3 3" /> : null}
    </svg>
  );
}

/** Short enough to be a stamp. The reviewed sentence rides underneath as a note. */
export function stampWords(tier: MedicineStatus, category?: Category): string {
  if (tier === 'FLAGGED') {
    if (category === 'SPURIOUS') return 'Declared spurious';
    if (category === 'NSQ') return 'Not of standard quality';
    return 'On record';
  }
  if (tier === 'VERIFY') return 'Referred';
  if (tier === 'PENDING') return 'Checking';
  return 'No entry on record';
}

export interface VerdictProps {
  tier: MedicineStatus;
  category?: Category;
  large?: boolean;
  /** The stamp lands once, when a result first resolves. */
  struck?: boolean;
  /** Reviewed tier copy, printed under the stamp (docs/SAFETY_AND_CONTENT.md). */
  note?: string;
  role?: string;
}

/**
 * FLAGGED and VERIFY are struck with a stamp. NO_ALERT_FOUND and PENDING are
 * printed, because the register has no stamp for an absence.
 */
export function Verdict({ tier, category, large, struck, note, role }: VerdictProps) {
  const words = stampWords(tier, category);
  const stamped = tier === 'FLAGGED' || tier === 'VERIFY';

  const mark = stamped ? (
    <span
      className={[
        'reg-stamp',
        tier === 'FLAGGED' ? 'reg-stamp--flagged' : 'reg-stamp--verify',
        large ? 'reg-stamp--lg' : '',
        struck ? 'reg-stamp--struck' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <MarginMark tier={tier} />
      {words}
    </span>
  ) : (
    <span className="reg-nil">
      <MarginMark tier={tier} />
      <span style={{ marginInlineStart: '0.4rem' }}>{words}</span>
    </span>
  );

  if (!note) {
    return role ? (
      <span role={role} className="reg-verdict-group">
        {mark}
      </span>
    ) : (
      mark
    );
  }

  return (
    <span className="reg-verdict-group" role={role}>
      {mark}
      <span className={['reg-verdict-note', stamped ? '' : 'reg-verdict-note--nil'].filter(Boolean).join(' ')}>{note}</span>
    </span>
  );
}
