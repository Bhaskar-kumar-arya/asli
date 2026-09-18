import { ALL_TEMPLATES } from './templates';
import type { ContentLang } from './keys';
import type { ContentTemplate, ContentVars } from './types';

/**
 * Looks up a template, falling back to `en` when `lang` has no template or the template is
 * unreviewed (docs/SAFETY_AND_CONTENT.md "Languages": "unreviewed templates fall back to
 * English with a note"). Returns `undefined` if `key` doesn't exist at all.
 */
export function getTemplate(key: string, lang: ContentLang): ContentTemplate | undefined {
  const byLang = ALL_TEMPLATES[key];
  if (!byLang) return undefined;
  const wanted = byLang[lang];
  if (wanted?.reviewedBy) return wanted;
  return byLang.en ?? wanted;
}

function interpolate(text: string, vars: ContentVars): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

export interface RenderedContent {
  key: string;
  lang: ContentLang;
  title: string;
  body: string;
  steps: string[];
  reviewed: boolean;
}

/** Looks up `key`/`lang` (falling back to `en`) and interpolates `{placeholder}` tokens from `vars`. */
export function render(key: string, lang: ContentLang, vars: ContentVars = {}): RenderedContent {
  const template = getTemplate(key, lang);
  if (!template) {
    throw new Error(`Unknown content key: ${key}`);
  }
  return {
    key,
    lang: template.lang,
    title: interpolate(template.title, vars),
    body: interpolate(template.body, vars),
    steps: template.steps.map((step) => interpolate(step, vars)),
    reviewed: Boolean(template.reviewedBy),
  };
}
