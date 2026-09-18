import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '../../../shell/components/Page';
import { Button } from '../../../shell/components/Button';
import { Card } from '../../../shell/components/Card';
import { ResultCard } from '../components/ResultCard';
import { SaveToCabinetDialog } from '../components/SaveToCabinetDialog';
import { useScanFlow } from '../lib/scanFlow';

/** Screen 6 (docs/UX.md): result card. */
export function ResultScreen() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { results, warnings } = useScanFlow();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const result = results[0];

  if (!result) {
    if (warnings.includes('NOT_A_MEDICINE')) {
      return (
        <Page title="We couldn't recognise this" onBack={() => navigate('/scan')}>
          <Card>
            <p>That photo doesn't look like a medicine strip, carton or bill.</p>
            <Button fullWidth onClick={() => navigate('/scan')} style={{ marginTop: '1rem' }}>
              Try another photo
            </Button>
          </Card>
        </Page>
      );
    }
    return (
      <Page title="We couldn't read this" onBack={() => navigate('/scan')}>
        <Card>
          <p>We couldn't read the details clearly from that photo.</p>
          <Button fullWidth onClick={() => navigate('/scan/manual')} style={{ marginTop: '1rem' }}>
            Type details instead
          </Button>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Result" onBack={() => navigate('/')}>
      <ResultCard
        result={result}
        lang={i18n.language}
        onSave={saved ? undefined : () => setSaving(true)}
        saveLabel={saved ? 'Saved' : 'Save to family medicines'}
      />
      {saving ? (
        <SaveToCabinetDialog
          identity={result.identity}
          onClose={() => setSaving(false)}
          onSaved={() => {
            setSaved(true);
            setSaving(false);
          }}
        />
      ) : null}
    </Page>
  );
}
