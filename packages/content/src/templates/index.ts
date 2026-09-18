import type { ContentLang } from '../keys';
import type { ContentTemplate } from '../types';
import { GUIDANCE_TEMPLATES } from './guidance';
import { NOTIFICATION_TEMPLATES } from './notifications';

/** Every template this package ships, keyed by content key then language. */
export const ALL_TEMPLATES: Record<string, Partial<Record<ContentLang, ContentTemplate>>> = {
  ...GUIDANCE_TEMPLATES,
  ...NOTIFICATION_TEMPLATES,
};

export { GUIDANCE_TEMPLATES, NOTIFICATION_TEMPLATES };
