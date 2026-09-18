import type { GuidanceTemplate } from '@asli/contracts';
import { getTemplate } from './render';
import type { ContentLang } from './keys';

/**
 * Shapes a template into the `GuidanceTemplate` wire contract (packages/contracts) for
 * `GET /v1/content/guidance/{key}?lang=`: raw `{placeholder}` tokens, not interpolated - the
 * caller (D2/D3/G1) fills them in from its own `CheckItemResult`/`AlertEvent` data.
 */
export function toGuidanceTemplate(key: string, lang: ContentLang): GuidanceTemplate | undefined {
  const template = getTemplate(key, lang);
  if (!template) return undefined;
  return {
    key,
    lang: template.lang,
    title: template.title,
    body: template.body,
    whatToDoNext: template.steps,
    reviewedBy: template.reviewedBy,
    reviewedAt: template.reviewedAt,
  };
}
