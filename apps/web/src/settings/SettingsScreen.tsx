import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Page } from '../shell/components/Page';
import { Card } from '../shell/components/Card';
import { Button } from '../shell/components/Button';
import { SUPPORTED_LANGUAGES, setLanguage, type SupportedLanguage } from '../i18n';
import { applyTextSize, getStoredTextSize, type TextSize } from '../theme/textSize';
import { signOut } from '../auth/session';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../api/endpoints';
import { subscribeToPush, unsubscribeFromPush } from './push';

const LANGUAGE_LABEL: Record<SupportedLanguage, string> = { en: 'English', hi: 'हिन्दी', kn: 'ಕನ್ನಡ' };
const TEXT_SIZE_LABEL: Record<TextSize, string> = { normal: 'Normal', large: 'Large', 'extra-large': 'Extra large' };

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const [textSize, setTextSize] = useState<TextSize>(getStoredTextSize());
  const [notice, setNotice] = useState<string>();
  const [pushEnabled, setPushEnabled] = useState(false);
  const navigate = useNavigate();
  const { refresh } = useAuth();

  async function handleToggleNotifications() {
    setNotice(undefined);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const ok = await subscribeToPush();
        setPushEnabled(ok);
        if (!ok) setNotice('This device or browser does not support notifications.');
      }
    } catch {
      setNotice('Could not update notifications right now.');
    }
  }

  function handleTextSize(size: TextSize) {
    setTextSize(size);
    applyTextSize(size);
  }

  async function handleSignOut() {
    await signOut();
    refresh();
    navigate('/sign-in');
  }

  async function handleTestPush() {
    setNotice(undefined);
    try {
      await api.sendTestPush();
      setNotice('Test notification sent.');
    } catch {
      setNotice('Could not send a test notification right now.');
    }
  }

  return (
    <Page title={t('settings')} onBack={() => navigate(-1)}>
      <Card style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>{t('language')}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <Button
              key={lang}
              variant={i18n.language === lang ? 'primary' : 'secondary'}
              onClick={() => setLanguage(lang)}
            >
              {LANGUAGE_LABEL[lang]}
            </Button>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>{t('textSize')}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(Object.keys(TEXT_SIZE_LABEL) as TextSize[]).map((size) => (
            <Button key={size} variant={textSize === size ? 'primary' : 'secondary'} onClick={() => handleTextSize(size)}>
              {TEXT_SIZE_LABEL[size]}
            </Button>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>{t('notifications')}</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <Button variant={pushEnabled ? 'primary' : 'secondary'} onClick={() => void handleToggleNotifications()}>
            {pushEnabled ? 'Notifications on' : 'Turn on notifications'}
          </Button>
          <Button variant="secondary" onClick={() => void handleTestPush()}>
            Send test notification
          </Button>
        </div>
        {notice ? <p role="status">{notice}</p> : null}
      </Card>

      <Button variant="danger" fullWidth onClick={() => void handleSignOut()}>
        {t('signOut')}
      </Button>
    </Page>
  );
}
