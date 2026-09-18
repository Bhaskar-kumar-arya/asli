import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MedicineIdentity } from '@asli/contracts';
import { Page } from '../../../shell/components/Page';
import { MedicineIdentityForm, type MedicineIdentityFormValue } from '../components/MedicineIdentityForm';
import { useScanFlow } from '../lib/scanFlow';
import { api } from '../../../api/endpoints';

interface LocationState {
  extractionFailed?: boolean;
}

/** Screen 4 fallback (docs/UX.md): manual entry, empty and always available. */
export function ManualEntryScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setResults } = useScanFlow();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const extractionFailed = (location.state as LocationState | null)?.extractionFailed ?? false;

  async function handleSubmit(value: MedicineIdentityFormValue) {
    setSubmitting(true);
    setError(undefined);
    const identity: MedicineIdentity = {
      productName: value.productName || undefined,
      batchNumber: value.batchNumber,
      manufacturer: value.manufacturer || undefined,
      source: 'manual',
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
    <Page title="Type details" onBack={() => navigate('/scan')}>
      {extractionFailed ? (
        <p style={{ color: 'var(--color-text-muted)' }}>
          We couldn't read the photo clearly. Please type the details from the strip or bill instead.
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
      <MedicineIdentityForm
        submitLabel={submitting ? 'Checking…' : 'Check this medicine'}
        onSubmit={(value) => void handleSubmit(value)}
      />
    </Page>
  );
}
