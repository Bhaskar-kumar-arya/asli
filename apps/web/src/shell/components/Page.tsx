import type { ReactNode } from 'react';

export interface PageProps {
  title: string;
  children: ReactNode;
  onBack?: () => void;
}

/** One primary action per screen (docs/UX.md). Layout shell only - actions live in children. */
export function Page({ title, children, onBack }: PageProps) {
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '1rem 1rem 6rem', minHeight: '100vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            style={{
              minHeight: 'var(--tap-target-min)',
              minWidth: 'var(--tap-target-min)',
              background: 'none',
              border: 'none',
              fontSize: '1.5em',
              cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            ←
          </button>
        ) : null}
        <h1 style={{ margin: 0 }}>{title}</h1>
      </header>
      {children}
    </main>
  );
}
