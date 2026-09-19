import type { CheckItemResult } from '@asli/contracts';
import { render, reasonPlainText, type ContentLang, type ContentVars } from '@asli/content';

/**
 * Renders result-card copy from lane I's `@asli/content` package (reviewed English,
 * hand-drafted hi/kn - `render()` falls back to English for any unreviewed draft, per
 * docs/SAFETY_AND_CONTENT.md "Languages"). `result.guidanceKey` already lines up with
 * `@asli/content`'s `GuidanceKey` enum (packages/content/src/keys.ts).
 */
function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-');
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export interface ResultCopy {
  title: string;
  body: string;
  whatToDoNext: string[];
}

function toContentLang(lang: string): ContentLang {
  return lang === 'hi' || lang === 'kn' ? lang : 'en';
}

export function getResultCopy(result: CheckItemResult, lang: string = 'en'): ResultCopy {
  const contentLang = toContentLang(lang);
  const match = result.matches[0];
  const product = result.identity.productName ?? 'this product';

  let vars: ContentVars;
  if (result.tier === 'FLAGGED' && match?.category === 'SPURIOUS') {
    vars = { batch: match.batchRaw, manufacturer: match.manufacturerRaw, alertMonth: monthLabel(match.alertMonth) };
  } else if (result.tier === 'FLAGGED' && match) {
    vars = {
      batch: match.batchRaw,
      product: match.productName,
      alertMonth: monthLabel(match.alertMonth),
      reportingLab: match.reportingLab ?? match.reportingSource,
      reasonPlain: reasonPlainText(match.reasonCode, contentLang),
    };
  } else {
    vars = {
      monthCount: result.checkedAgainst.monthCount,
      latestMonth: monthLabel(result.checkedAgainst.latestMonth),
      product,
    };
  }

  const rendered = render(result.guidanceKey, contentLang, vars);
  return { title: rendered.title, body: rendered.body, whatToDoNext: rendered.steps };
}
