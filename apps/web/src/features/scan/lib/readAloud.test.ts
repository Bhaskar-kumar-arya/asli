import { afterEach, describe, expect, it, vi } from 'vitest';
import { canReadAloud, hasSpeechVoice, playReadAloud } from './readAloud';

// jsdom implements neither piece of the Web Speech API at all (not even as
// an always-undefined global), so speechSynthesis.speak(new
// SpeechSynthesisUtterance(...)) throws ReferenceError in every test unless
// both are stubbed here.
class FakeUtterance extends EventTarget {
  lang = '';
  constructor(public text: string) {
    super();
  }
}

function stubVoices(langs: string[]) {
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => langs.map((lang) => ({ lang })),
      speak: vi.fn((utterance: FakeUtterance) => {
        // jsdom never fires real speech events; fire "end" ourselves so
        // callers awaiting playReadAloud settle instead of hanging.
        utterance.dispatchEvent(new Event('end'));
      }),
    },
  });
}

function removeVoices() {
  for (const prop of ['speechSynthesis', 'SpeechSynthesisUtterance'] as const) {
    Object.defineProperty(window, prop, { configurable: true, value: undefined });
    delete (window as unknown as Record<string, unknown>)[prop];
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  removeVoices();
  vi.restoreAllMocks();
});

describe('hasSpeechVoice', () => {
  it('is false with no speechSynthesis in the environment', () => {
    removeVoices();
    expect(hasSpeechVoice('en')).toBe(false);
  });

  it('matches a voice by language prefix, case-insensitively', () => {
    stubVoices(['hi-IN', 'EN-US']);
    expect(hasSpeechVoice('hi')).toBe(true);
    expect(hasSpeechVoice('en')).toBe(true);
    expect(hasSpeechVoice('kn')).toBe(false);
  });
});

describe('canReadAloud', () => {
  it('is false with neither a configured audio source nor a browser voice - the button should hide', () => {
    removeVoices();
    expect(canReadAloud('kn')).toBe(false);
  });

  it('is true when a browser voice exists for the language, even with no audio source configured', () => {
    stubVoices(['kn-IN']);
    expect(canReadAloud('kn')).toBe(true);
  });

  it('is true when an audio source is configured, even with no browser voice for the language', () => {
    removeVoices();
    vi.stubEnv('VITE_AUDIO_BASE_URL', 'https://cdn.example.com');
    expect(canReadAloud('kn')).toBe(true);
  });
});

describe('playReadAloud', () => {
  it('goes straight to speech when no audio source is configured, so it never issues a request known to 404', async () => {
    stubVoices(['en-IN']);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await playReadAloud('flagged', 'en', 'This batch is on a CDSCO alert list.');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
  });

  it('falls back to speech when the configured audio file fails to load', async () => {
    stubVoices(['en-IN']);
    vi.stubEnv('VITE_AUDIO_BASE_URL', 'https://cdn.example.com');
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      queueMicrotask(() => this.dispatchEvent(new Event('error')));
      return Promise.resolve();
    });

    await playReadAloud('flagged', 'en', 'This batch is on a CDSCO alert list.');

    expect(playSpy).toHaveBeenCalledOnce();
    expect(window.speechSynthesis.speak).toHaveBeenCalledOnce();
  });

  it('resolves once the audio file actually finishes playing, not merely once it starts', async () => {
    vi.stubEnv('VITE_AUDIO_BASE_URL', 'https://cdn.example.com');
    let audioEl: HTMLMediaElement | undefined;
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
      audioEl = this; // eslint-disable-line @typescript-eslint/no-this-alias -- capturing the element the mock was called on
      return Promise.resolve();
    });

    let resolved = false;
    const done = playReadAloud('flagged', 'en', 'fallback').then(() => {
      resolved = true;
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(resolved).toBe(false); // still "playing"
    audioEl?.dispatchEvent(new Event('ended'));
    await done;
    expect(resolved).toBe(true);
  });

  it('never throws even with no speechSynthesis and no audio source at all', async () => {
    removeVoices();
    await expect(playReadAloud('flagged', 'kn', 'fallback text')).resolves.toBeUndefined();
  });
});
