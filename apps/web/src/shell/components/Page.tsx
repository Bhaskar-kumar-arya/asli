import type { ReactNode } from 'react';
import { Icon } from './Icon';

export interface PageProps {
  title: string;
  children: ReactNode;
  onBack?: () => void;
  /** Indic band under the masthead rule, as a station board stacks its scripts. */
  subtitle?: string;
  /** What the register is current to — printed along the masthead's lower edge. */
  currency?: string;
}

/** One primary action per screen (docs/UX.md). The sheet only; entries live in children. */
export function Page({ title, children, onBack, subtitle, currency }: PageProps) {
  return (
    <main className="reg-sheet">
      {onBack ? (
        <div className="reg-row reg-row--tight" style={{ borderBottom: 0, paddingTop: '0.9rem' }}>
          <button type="button" onClick={onBack} aria-label="Back" className="reg-btn" style={{ padding: '0.4rem 0.6rem' }}>
            <Icon name="back" size={20} />
          </button>
        </div>
      ) : null}

      <header className="reg-masthead">
        <h1>{title}</h1>
        {subtitle ? <p className="reg-masthead__indic">{subtitle}</p> : null}
        {currency ? <p className="reg-masthead__currency">{currency}</p> : null}
      </header>

      {children}
    </main>
  );
}
