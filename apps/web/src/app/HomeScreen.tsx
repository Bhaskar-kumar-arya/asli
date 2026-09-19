import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Page } from '../shell/components/Page';
import { HomeMedicineList } from '../features/cabinet/components/HomeMedicineList';

/** Screen 2 (docs/UX.md) shell. The "My family's medicines" list is D3's HomeMedicineList. */
export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Page title={t('appName')} subtitle="दवा के बैच की जाँच · ಔಷಧಿ ಬ್ಯಾಚ್ ಪರಿಶೀಲನೆ">
      {/* The next blank line of the register: the one primary action on this screen. */}
      <button type="button" className="reg-open-entry" onClick={() => navigate('/scan')}>
        <span>
          {t('checkAMedicine')}
          <span className="reg-caret" aria-hidden="true" />
        </span>
      </button>

      <HomeMedicineList />
    </Page>
  );
}
