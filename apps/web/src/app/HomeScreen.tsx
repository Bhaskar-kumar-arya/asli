import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Page } from '../shell/components/Page';
import { Button } from '../shell/components/Button';
import { HomeMedicineList } from '../features/cabinet/components/HomeMedicineList';

/** Screen 2 (docs/UX.md) shell. The "My family's medicines" list is D3's HomeMedicineList. */
export function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Page title={t('appName')}>
      <Button fullWidth onClick={() => navigate('/scan')} style={{ marginBottom: '1.5rem', fontSize: '1.2em' }}>
        {t('checkAMedicine')}
      </Button>
      <HomeMedicineList />
    </Page>
  );
}
