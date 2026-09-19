import { useNavigate } from 'react-router-dom';
import { Page } from '../../../shell/components/Page';
import { Icon, type IconName } from '../../../shell/components/Icon';
import { features } from '../lib/features';

interface Method {
  to: string;
  icon: IconName;
  label: string;
  sub: string;
}

/** Screen 3 (docs/UX.md): choose method. Each way in is its own numbered line. */
export function MethodChooserScreen() {
  const navigate = useNavigate();

  const methods: Method[] = [
    { to: '/scan/capture/strip', icon: 'camera', label: 'Photo of strip', sub: 'Best if you have the medicine in hand' },
    { to: '/scan/capture/bill', icon: 'bill', label: 'Photo of pharmacy bill', sub: 'Checks every line on the bill at once' },
    ...(features.qr ? [{ to: '/scan/qr', icon: 'qr' as IconName, label: 'Scan QR code', sub: 'If the pack carries a code' }] : []),
    { to: '/scan/manual', icon: 'keyed', label: 'Type details', sub: 'Batch number and medicine name' },
  ];

  return (
    <Page title="Check a medicine" onBack={() => navigate('/')}>
      <p className="reg-prose reg-prose--muted">How would you like to give us the batch number?</p>

      <div>
        {methods.map((m, i) => (
          <button key={m.to} type="button" className="reg-choice" onClick={() => navigate(m.to)}>
            <span className="reg-no" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <Icon name={m.icon} size={26} />
            <span>
              {m.label}
              <span className="reg-choice__sub">{m.sub}</span>
            </span>
            <span className="reg-choice__next">
              <Icon name="next" size={20} />
            </span>
          </button>
        ))}
      </div>
    </Page>
  );
}
