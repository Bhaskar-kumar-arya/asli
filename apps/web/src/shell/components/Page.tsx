import type { ReactNode } from 'react';
import { Icon } from './Icon';

export interface PageProps {
  title: string;
  children: ReactNode;
  onBack?: () => void;
  /** Indic band under the masthead rule, as a station board stacks its scripts. */
  subtitle?: { hi: string; kn: string };
  /** What the register is current to — printed along the masthead's lower edge. */
  currency?: string;
}

/** One primary action per screen (docs/UX.md). The sheet only; entries live in children. */
export function Page({ title, children, onBack, subtitle, currency }: PageProps) {
  return (
    <main className="reg-sheet">
      {onBack ? (
        <button type="button" onClick={onBack} className="reg-back">
          <Icon name="back" size={18} />
          Back
        </button>
      ) : null}

      <header className={onBack ? 'reg-pagehead' : 'reg-masthead'}>
        <h1>{title}</h1>
        {subtitle ? (
          <p className="reg-masthead__indic">
            <span lang="hi">{subtitle.hi}</span>
            {' · '}
            <span lang="kn">{subtitle.kn}</span>
          </p>
        ) : null}
        {currency ? <p className="reg-masthead__currency">{currency}</p> : null}
      </header>

      {children}
    </main>
  );
}
