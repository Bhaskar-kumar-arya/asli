import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MedicineIdentity } from '@asli/contracts';
import { Page } from '../../../shell/components/Page';
import { MedicineIdentityForm, type MedicineIdentityFormValue } from '../components/MedicineIdentityForm';
import { useScanFlow } from '../lib/scanFlow';
import { api } from '../../../api/endpoints';

/** Screen 5 (docs/UX.md): confirm details extracted from a strip photo. */
export function ConfirmDetailsScreen() {
  const navigate = useNavigate();
  const { results, setResults } = useScanFlow();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const pending = results[0];

  useEffect(() => {
    if (!pending) navigate('/scan', { replace: true });
  }, [pending, navigate]);

  if (!pending) {
    return null;
  }

  async function handleSubmit(value: MedicineIdentityFormValue, batchEdited: boolean) {
    setSubmitting(true);
    setError(undefined);
    const identity: MedicineIdentity = {
      ...pending!.identity,
      productName: value.productName || undefined,
      batchNumber: value.batchNumber,
      manufacturer: value.manufacturer || undefined,
    };
    try {
      const changed = batchEdited && identity.batchNumber !== pending!.identity.batchNumber;
      const response = changed
        ? // Metric BatchEditedByUser (docs/SCANNING.md) - see Handoff contract change
          // request: CheckRequest has no batchEdited field today, so this is
          // best-effort until that's added.
          await api.createCheck({ items: [identity] })
        : { results: [pending!] };
      setResults(response.results);
      navigate('/scan/result');
    } catch {
      setError('We could not check this batch right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page title="Confirm details" onBack={() => navigate(-1)}>
      <p style={{ color: 'var(--color-text-muted)' }}>
        Please check these details are correct before we look them up.
      </p>
      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
      <MedicineIdentityForm
        initial={pending.identity}
        submitLabel={submitting ? 'Checking…' : 'Looks right'}
        onSubmit={(value, batchEdited) => void handleSubmit(value, batchEdited)}
      />
    </Page>
  );
}
