import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/scan', label: 'Check a medicine', icon: '➕' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function BottomNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
      }}
      aria-label="Primary"
    >
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.15rem',
            padding: '0.6rem 0',
            minHeight: 'var(--tap-target-min)',
            color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: isActive ? 700 : 500,
            textDecoration: 'none',
            fontSize: '0.85em',
          })}
        >
          <span aria-hidden="true" style={{ fontSize: '1.3em' }}>
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
