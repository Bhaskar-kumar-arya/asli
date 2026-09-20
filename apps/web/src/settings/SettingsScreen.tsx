import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Page } from '../shell/components/Page';
import { Button } from '../shell/components/Button';
import { RegisterIndex } from '../shell/components/RegisterIndex';
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
      <section>
        <div className="reg-head">
          <h2>{t('language')}</h2>
        </div>
        <div className="reg-stack">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <Button
              key={lang}
              variant={i18n.language === lang ? 'primary' : 'secondary'}
              onClick={() => setLanguage(lang)}
              aria-pressed={i18n.language === lang}
            >
              {LANGUAGE_LABEL[lang]}
            </Button>
          ))}
        </div>
      </section>

      <section>
        <div className="reg-head">
          <h2>{t('textSize')}</h2>
        </div>
        <div className="reg-stack">
          {(Object.keys(TEXT_SIZE_LABEL) as TextSize[]).map((size) => (
            <Button
              key={size}
              variant={textSize === size ? 'primary' : 'secondary'}
              onClick={() => handleTextSize(size)}
              aria-pressed={textSize === size}
            >
              {TEXT_SIZE_LABEL[size]}
            </Button>
          ))}
        </div>
      </section>

      <section>
        <div className="reg-head">
          <h2>{t('notifications')}</h2>
        </div>
        <div className="reg-stack">
          <Button
            variant={pushEnabled ? 'primary' : 'secondary'}
            onClick={() => void handleToggleNotifications()}
            aria-pressed={pushEnabled}
          >
            {pushEnabled ? 'Notifications on' : 'Turn on notifications'}
          </Button>
          <Button variant="secondary" onClick={() => void handleTestPush()}>
            Send test notification
          </Button>
        </div>
        {notice ? (
          <p role="status" className="reg-line" style={{ textTransform: 'none', marginTop: '1rem' }}>
            {notice}
          </p>
        ) : null}
      </section>

      <RegisterIndex
        title="Other returns"
        entries={[
          {
            to: '/insights',
            name: 'How common is this?',
            gloss: 'CDSCO alert counts by month and reason. Open to anyone.',
          },
          {
            to: '/dashboard',
            name: 'How well does Asli work?',
            gloss: 'Measured accuracy and running cost. Open to anyone.',
          },
          {
            to: '/pharmacy',
            name: 'Pharmacy mode',
            gloss: 'Check a whole invoice or stock list at once.',
          },
        ]}
      />

      <div style={{ marginTop: '2.2rem' }}>
        <Button variant="danger" fullWidth onClick={() => void handleSignOut()}>
          {t('signOut')}
        </Button>
      </div>
    </Page>
  );
}
