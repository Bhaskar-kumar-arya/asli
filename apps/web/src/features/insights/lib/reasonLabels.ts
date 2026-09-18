import { reasonPlainText } from '@asli/content';
import type { ReasonCode } from '@asli/contracts';

/** Short label for chart axes/legends - the reason code itself is jargon (docs/UX.md
 * "Plain words, no jargon"), so pair it with the reviewed plain-language text as a tooltip. */
export function reasonLabel(code: ReasonCode): string {
  return reasonPlainText(code, 'en');
}
