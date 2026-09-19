import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Page } from '../shell/components/Page';
import { HomeMedicineList } from '../features/cabinet/components/HomeMedicineList';
import { formatMonth } from '../features/cabinet/lib/tierCopy';

interface Summary {
  entryCount: number;
  latestAlertMonth?: string;
}

/** Screen 2 (docs/UX.md) shell. The "My family's medicines" list is D3's HomeMedicineList. */
export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);

  const handleSummary = useCallback((next: Summary) => setSummary(next), []);

  const currency = summary
    ? [
        summary.latestAlertMonth ? `CDSCO list to ${formatMonth(summary.latestAlertMonth)}` : 'No CDSCO match on record',
        `${summary.entryCount} ${summary.entryCount === 1 ? 'entry' : 'entries'}`,
      ].join(' · ')
    : undefined;

  return (
    <Page
      title={t('appName')}
      subtitle={{ hi: 'दवा के बैच की जाँच', kn: 'ಔಷಧಿ ಬ್ಯಾಚ್ ಪರಿಶೀಲನೆ' }}
      currency={currency}
    >
      {/* The next blank line of the register: the one primary action on this screen. */}
      <button type="button" className="reg-open-entry" onClick={() => navigate('/scan')}>
        <span className="reg-no" aria-hidden="true">
          {summary ? String(summary.entryCount + 1).padStart(2, '0') : '--'}
        </span>
        <span>
          {t('checkAMedicine')}
          <span className="reg-caret" aria-hidden="true" />
        </span>
      </button>

      <HomeMedicineList onSummary={handleSummary} />
    </Page>
  );
}
