function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function DemoLabel({ alertMonth }: { alertMonth: string }) {
  return (
    <p
      style={{
        display: 'inline-block',
        background: 'var(--color-surface)',
        border: '1px dashed var(--color-border)',
        borderRadius: '0.5rem',
        padding: '0.25rem 0.6rem',
        fontSize: '0.85em',
        color: 'var(--color-text-muted)',
        margin: '0 0 0.75rem',
      }}
    >
      Demo replay of a real {monthLabel(alertMonth)} CDSCO alert
    </p>
  );
}
