import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '../../../shell/components/Page';
import { Card } from '../../../shell/components/Card';
import { Button } from '../../../shell/components/Button';
import { BillResultRow } from '../components/BillResultRow';
import { ResultCard } from '../components/ResultCard';
import { useScanFlow } from '../lib/scanFlow';

/** Screen 7 (docs/UX.md): bill results list. */
export function BillResultsScreen() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { results, warnings } = useScanFlow();
  const [openIndex, setOpenIndex] = useState<number>();

  useEffect(() => {
    if (results.length === 0) navigate('/scan', { replace: true });
  }, [results, navigate]);

  if (results.length === 0) {
    return null;
  }

  const open = openIndex !== undefined ? results[openIndex] : undefined;

  if (open) {
    return (
      <Page title="Line result" onBack={() => setOpenIndex(undefined)}>
        <ResultCard result={open} lang={i18n.language} />
      </Page>
    );
  }

  return (
    <Page title="Bill results" onBack={() => navigate('/')}>
      {warnings.includes('NO_BATCH_ON_LINE') ? (
        <Card style={{ marginBottom: '1rem' }}>
          <p style={{ margin: 0 }}>
            Some lines on this bill didn't show a batch number.{' '}
            <Button variant="secondary" onClick={() => navigate('/scan/capture/strip')} style={{ marginTop: '0.5rem' }}>
              Add strip photo
            </Button>
          </p>
        </Card>
      ) : null}
      {results.map((result, index) => (
        <BillResultRow key={`${result.identity.batchNumber}-${index}`} result={result} onOpen={() => setOpenIndex(index)} />
      ))}
    </Page>
  );
}
