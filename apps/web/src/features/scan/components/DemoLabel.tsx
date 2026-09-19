function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/** An annotation pencilled onto the entry, disclosed as a replay. */
export function DemoLabel({ alertMonth }: { alertMonth: string }) {
  return <p className="reg-annotation">Demo replay of a real {monthLabel(alertMonth)} CDSCO alert</p>;
}
