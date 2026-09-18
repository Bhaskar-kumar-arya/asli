import type { ContentLang, NotificationKey } from '../keys';
import type { ContentTemplate } from '../types';

const REVIEWED_AT_EN = '2026-09-17T00:00:00.000Z';
const REVIEWED_BY_EN = 'lane-I (docs/ALERTS.md "Web push" source of truth)';

/**
 * docs/ALERTS.md "Web push": "FLAGGED: 'Batch alert for <label>'. VERIFY: 'Please check
 * <label> with your pharmacist'." Reused for the push payload title and the email subject
 * (docs/ALERTS.md "Email (SES)" doesn't specify a distinct subject line).
 */
export const NOTIFICATION_TEMPLATES: Record<NotificationKey, Partial<Record<ContentLang, ContentTemplate>>> = {
  'notification.flagged': {
    en: {
      key: 'notification.flagged',
      lang: 'en',
      title: 'Batch alert for {label}',
      body: 'CDSCO reported batch {batch} in {alertMonth}. Open the app for details.',
      steps: [],
      placeholders: ['label', 'batch', 'alertMonth'],
      reviewedBy: REVIEWED_BY_EN,
      reviewedAt: REVIEWED_AT_EN,
    },
    hi: {
      key: 'notification.flagged',
      lang: 'hi',
      title: '{label} के लिए बैच अलर्ट',
      body: 'CDSCO ने {alertMonth} में बैच {batch} की रिपोर्ट दी। विवरण के लिए ऐप खोलें।',
      steps: [],
      placeholders: ['label', 'batch', 'alertMonth'],
    },
    kn: {
      key: 'notification.flagged',
      lang: 'kn',
      title: '{label} ಗಾಗಿ ಬ್ಯಾಚ್ ಎಚ್ಚರಿಕೆ',
      body: 'CDSCO {alertMonth} ನಲ್ಲಿ ಬ್ಯಾಚ್ {batch} ಅನ್ನು ವರದಿ ಮಾಡಿದೆ. ವಿವರಗಳಿಗಾಗಿ ಆಪ್ ತೆರೆಯಿರಿ.',
      steps: [],
      placeholders: ['label', 'batch', 'alertMonth'],
    },
  },
  'notification.verify': {
    en: {
      key: 'notification.verify',
      lang: 'en',
      title: 'Please check {label} with your pharmacist',
      body: 'This looks similar to a batch on a CDSCO alert list. Open the app for details.',
      steps: [],
      placeholders: ['label'],
      reviewedBy: REVIEWED_BY_EN,
      reviewedAt: REVIEWED_AT_EN,
    },
    hi: {
      key: 'notification.verify',
      lang: 'hi',
      title: '{label} की जांच अपने फार्मासिस्ट से करवाएं',
      body: 'यह CDSCO अलर्ट सूची के किसी बैच जैसा दिखता है। विवरण के लिए ऐप खोलें।',
      steps: [],
      placeholders: ['label'],
    },
    kn: {
      key: 'notification.verify',
      lang: 'kn',
      title: '{label} ಅನ್ನು ನಿಮ್ಮ ಫಾರ್ಮಾಸಿಸ್ಟ್‌ನೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ',
      body: 'ಇದು CDSCO ಎಚ್ಚರಿಕೆ ಪಟ್ಟಿಯಲ್ಲಿರುವ ಬ್ಯಾಚ್‌ಗೆ ಹೋಲುತ್ತದೆ. ವಿವರಗಳಿಗಾಗಿ ಆಪ್ ತೆರೆಯಿರಿ.',
      steps: [],
      placeholders: ['label'],
    },
  },
};
