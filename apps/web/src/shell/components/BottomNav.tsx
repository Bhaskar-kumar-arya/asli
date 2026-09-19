import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'register' },
  { to: '/scan', label: 'Check a medicine', icon: 'entry' },
  { to: '/settings', label: 'Settings', icon: 'instructions' },
];

/** The register's thumb-index tabs. Labelled, never icon-only. */
export function BottomNav() {
  return (
    <nav className="reg-tabs" aria-label="Primary">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className="reg-tab">
          <Icon name={item.icon} size={22} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
