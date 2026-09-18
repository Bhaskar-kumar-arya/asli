import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MedicineIdentity } from '@asli/contracts';
import { Page } from '../../../../shell/components/Page';
import { MedicineIdentityForm, type MedicineIdentityFormValue } from '../../components/MedicineIdentityForm';
import { useScanFlow } from '../../lib/scanFlow';
import { api } from '../../../../api/endpoints';

/** Confirm step for the QR flow (K deliverable 3): prefilled from the decoded QR, source stays 'qr'. */
export function QrConfirmScreen() {
  const navigate = useNavigate();
  const { pendingConfirm, setResults } = useScanFlow();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!pendingConfirm) navigate('/scan/qr', { replace: true });
  }, [pendingConfirm, navigate]);

  if (!pendingConfirm) {
    return null;
  }

  async function handleSubmit(value: MedicineIdentityFormValue) {
    setSubmitting(true);
    setError(undefined);
    const identity: MedicineIdentity = {
      ...pendingConfirm!.identity,
      productName: value.productName || undefined,
      batchNumber: value.batchNumber,
      manufacturer: value.manufacturer || undefined,
      source: 'qr',
    };
    try {
      const response = await api.createCheck({ items: [identity] });
      setResults(response.results);
      navigate('/scan/result');
    } catch {
      setError('We could not check this batch right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page title="Confirm details" onBack={() => navigate('/scan/qr')}>
      <p style={{ color: 'var(--color-text-muted)' }}>
        This is what we read from the QR code. Please check it's correct before we look it up.
      </p>
      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
      <MedicineIdentityForm
        initial={pendingConfirm.identity}
        submitLabel={submitting ? 'Checking…' : 'Looks right'}
        onSubmit={(value) => void handleSubmit(value)}
      />
    </Page>
  );
}
