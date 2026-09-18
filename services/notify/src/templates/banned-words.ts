/**
 * docs/SAFETY_AND_CONTENT.md wording rules, enforced at render time (not just reviewed by eye) -
 * CLAUDE.md rule 2 ("never say safe") and rule 5 (never advise stopping a medicine) are
 * non-negotiable, so every rendered notification/email is checked before it's sent.
 */
const BANNED_PATTERNS: RegExp[] = [
  /\bsafe\b/i,
  /\bgenuine\b/i,
  /\bverified\b/i,
  /\bunsafe\b/i,
  /\bfake\b/i,
  // "Don't/do not stop taking..." is the reviewed safety instruction (rule 5) - only ban
  // "stop taking" when it isn't qualified by that negation, e.g. generated advice to stop.
  /(?<!don't )(?<!do not )\bstop taking\b/i,
  /we detected/i,
  /is bad\b/i,
];

export function findBannedWording(text: string): string[] {
  return BANNED_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

/** Throws if `text` contains any banned wording. Call on every rendered template before sending. */
export function assertNoBannedWording(text: string): void {
  const hits = findBannedWording(text);
  if (hits.length > 0) {
    throw new Error(`Banned wording found (${hits.join(', ')}) in: ${text}`);
  }
}
