import { useNavigate } from 'react-router-dom';
import { Page } from '../../../shell/components/Page';
import { Button } from '../../../shell/components/Button';
import { features } from '../lib/features';

/** Screen 3 (docs/UX.md): choose method. */
export function MethodChooserScreen() {
  const navigate = useNavigate();

  return (
    <Page title="Check a medicine" onBack={() => navigate('/')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Button fullWidth onClick={() => navigate('/scan/capture/strip')}>
          📷 Photo of strip
        </Button>
        <Button fullWidth onClick={() => navigate('/scan/capture/bill')}>
          🧾 Photo of pharmacy bill
        </Button>
        {features.qr ? (
          <Button fullWidth onClick={() => navigate('/scan/qr')}>
            🔲 Scan QR code
          </Button>
        ) : null}
        <Button fullWidth variant="secondary" onClick={() => navigate('/scan/manual')}>
          ⌨ Type details
        </Button>
      </div>
    </Page>
  );
}
