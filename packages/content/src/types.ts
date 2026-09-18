import type { ContentLang } from './keys';

/**
 * `packages/content` template. Shape per the task spec: `{ key, lang, title, body, steps[],
 * placeholders[], reviewedBy, reviewedAt }`. `title`/`body`/`steps` may contain `{placeholder}`
 * tokens listed in `placeholders`, filled in by `render()`. Unreviewed templates (`reviewedBy`
 * unset) are still returned by the API but flagged - see docs/SAFETY_AND_CONTENT.md.
 */
export interface ContentTemplate {
  key: string;
  lang: ContentLang;
  title: string;
  body: string;
  steps: string[];
  placeholders: string[];
  reviewedBy?: string;
  reviewedAt?: string;
}

export type ContentVars = Record<string, string | number>;
