import { describe, expect, it } from 'vitest';
import { getResultCopy } from './content';
import { scanFixtures } from '../../../mocks/fixtures';

const BANNED_WORDS = [/\bsafe\b/i, /\bgenuine\b/i, /\bverified\b/i, /\bok\b/i];

describe('getResultCopy', () => {
  const resultsWithFixtures = scanFixtures
    .filter((f) => f.response.results.length > 0)
    .map((f) => [f.state, f.response.results[0]!] as const);

  it.each(resultsWithFixtures)('CLAUDE.md wording rules hold for %s', (_state, result) => {
    const copy = getResultCopy(result);
    const allText = [copy.title, copy.body, ...copy.whatToDoNext].join(' ');
    for (const banned of BANNED_WORDS) {
      expect(allText).not.toMatch(banned);
    }
    // CLAUDE.md rule 5: guidance must say not to stop without a doctor, never a bare instruction to stop.
    expect(allText).not.toMatch(/(?<!don't |do not )\bstop taking\b/i);
  });

  it('always refers to "this batch", never a brand or product being unsafe in general', () => {
    const result = scanFixtures.find((f) => f.state === 'FLAGGED_NSQ')!.response.results[0]!;
    const copy = getResultCopy(result);
    expect(copy.body).toMatch(/batch/i);
  });
});
