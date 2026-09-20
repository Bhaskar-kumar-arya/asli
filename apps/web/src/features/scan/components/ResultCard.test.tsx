import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResultCard } from './ResultCard';
import { scanFixtures } from '../../../mocks/fixtures';

// jsdom implements neither piece of the Web Speech API at all - see the
// matching comment in lib/readAloud.test.ts.
class FakeUtterance extends EventTarget {
  lang = '';
  constructor(public text: string) {
    super();
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const prop of ['speechSynthesis', 'SpeechSynthesisUtterance'] as const) {
    Object.defineProperty(window, prop, { configurable: true, value: undefined });
    delete (window as unknown as Record<string, unknown>)[prop];
  }
});

const BANNED_WORDS = [/\bsafe\b/i, /\bgenuine\b/i, /\bverified\b/i];

describe('ResultCard', () => {
  const statesWithResults = scanFixtures.filter((f) => f.response.results.length > 0);

  it.each(statesWithResults.map((f) => [f.state, f.response.results[0]!] as const))(
    'renders %s without banned words',
    (state, result) => {
      const { container } = render(<ResultCard result={result} />);
      const text = container.textContent ?? '';
      for (const banned of BANNED_WORDS) {
        expect(text).not.toMatch(banned);
      }
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    },
  );

  it('shows the FLAGGED NSQ title and CDSCO source link', () => {
    const result = scanFixtures.find((f) => f.state === 'FLAGGED_NSQ')!.response.results[0]!;
    render(<ResultCard result={result} />);
    expect(screen.getByText(/this batch is on a cdsco alert list/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view cdsco source/i })).toHaveAttribute('href', result.matches[0]!.sourceUrl);
  });

  it('shows spurious-specific wording, never blaming the manufacturer directly', () => {
    const result = scanFixtures.find((f) => f.state === 'FLAGGED_SPURIOUS')!.response.results[0]!;
    render(<ResultCard result={result} />);
    expect(screen.getByText(/reported as spurious/i)).toBeInTheDocument();
    expect(screen.queryByText(/made fake medicine/i)).not.toBeInTheDocument();
  });

  it('shows "No alert found for this batch" for NO_ALERT_FOUND, never a positive safety claim', () => {
    const result = scanFixtures.find((f) => f.state === 'NO_ALERT_FOUND')!.response.results[0]!;
    render(<ResultCard result={result} />);
    expect(screen.getByText(/no alert found for this batch/i)).toBeInTheDocument();
  });

  it('shows a demo label when the match is a demo replay', () => {
    const result = scanFixtures.find((f) => f.state === 'FLAGGED_NSQ')!.response.results[0]!;
    const demoResult = { ...result, matches: [{ ...result.matches[0]!, demo: true }] };
    render(<ResultCard result={demoResult} />);
    expect(screen.getByText(/demo replay of a real/i)).toBeInTheDocument();
  });

  it('offers "What to do next" steps that never say to stop the medicine', () => {
    const result = scanFixtures.find((f) => f.state === 'FLAGGED_NSQ')!.response.results[0]!;
    render(<ResultCard result={result} />);
    expect(screen.getByText(/talk to your doctor first/i)).toBeInTheDocument();
    expect(screen.queryByText(/^stop taking/i)).not.toBeInTheDocument();
  });

  it('calls onSave when "Save to family medicines" is pressed', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const result = scanFixtures.find((f) => f.state === 'NO_ALERT_FOUND')!.response.results[0]!;
    let saved = false;
    render(<ResultCard result={result} onSave={() => (saved = true)} />);
    await userEvent.click(screen.getByRole('button', { name: /save to family medicines/i }));
    expect(saved).toBe(true);
  });

  describe('Read aloud', () => {
    const result = scanFixtures.find((f) => f.state === 'NO_ALERT_FOUND')!.response.results[0]!;

    it('is hidden for a language with neither a configured audio source nor a browser voice (docs/SAFETY_AND_CONTENT.md)', () => {
      render(<ResultCard result={result} lang="kn" />);
      expect(screen.queryByRole('button', { name: /read aloud/i })).not.toBeInTheDocument();
    });

    it('is offered, and speaks the result, once a browser voice exists for the language', async () => {
      const { default: userEvent } = await import('@testing-library/user-event');
      const speak = vi.fn((utterance: FakeUtterance) => utterance.dispatchEvent(new Event('end')));
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: { getVoices: () => [{ lang: 'en-IN' }], speak },
      });

      render(<ResultCard result={result} lang="en" />);
      await userEvent.click(screen.getByRole('button', { name: /read aloud/i }));

      expect(speak).toHaveBeenCalledOnce();
      expect(await screen.findByRole('button', { name: /read aloud/i })).toBeInTheDocument();
    });
  });
});
