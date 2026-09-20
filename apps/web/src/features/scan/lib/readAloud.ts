/**
 * docs/SAFETY_AND_CONTENT.md Read-aloud: pre-rendered Polly MP3s per language
 * (lane I's public bucket) for the static guidance text, falling back to
 * browser speechSynthesis (used for kn when Polly has no voice, or if the
 * MP3 is missing yet).
 *
 * The MP3s are uploaded to `asli-<stage>-public/audio/<lang>/<key>.mp3`
 * (scripts/content/audio.ts). That bucket blocks all public access
 * (infra/lib/shared-stack.ts `PublicBucket`) and nothing proxies it to the
 * app's own origin, so a same-origin request for `/audio/...` 404s on every
 * deploy today - confirmed live on 2026-09-20. `VITE_AUDIO_BASE_URL` is an
 * escape hatch for once that's fixed (a public route or a CloudFront
 * distribution in front of the bucket): set it to that origin and this
 * starts trying the MP3 first, with no code change. Left unset, this skips
 * straight to speechSynthesis instead of making a request guaranteed to fail.
 */
function audioBaseUrl(): string | undefined {
  const base = import.meta.env.VITE_AUDIO_BASE_URL as string | undefined;
  return base ? base.replace(/\/$/, '') : undefined;
}

/**
 * Real browsers can return an empty list from `getVoices()` on the very
 * first call, before the async `voiceschanged` event fires - a known
 * quirk this does not work around, so a true negative here can still
 * flip to a voice existing a moment later. Good enough for "hide the
 * button" (docs/SAFETY_AND_CONTENT.md), not a hard guarantee.
 */
export function hasSpeechVoice(lang: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
}

/**
 * docs/SAFETY_AND_CONTENT.md "otherwise hide the button": read-aloud is
 * only offered when it can actually do something - a configured audio
 * source, or a browser voice for this language.
 */
export function canReadAloud(lang: string): boolean {
  return Boolean(audioBaseUrl()) || hasSpeechVoice(lang);
}

function speak(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'kn' ? 'kn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    // Resolve either way: a synthesis error is not something the caller
    // should treat as read-aloud having failed outright, since there is
    // no further fallback left to try.
    utterance.addEventListener('end', () => resolve(), { once: true });
    utterance.addEventListener('error', () => resolve(), { once: true });
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Resolves once playback actually finishes, not once it merely starts, so
 * a caller's "Reading..." state covers the real duration. Only the
 * *start* of playback is time-boxed - a clip that is already playing is
 * left to run for as long as it takes, since a longer guidance text is
 * legitimately a longer clip, not a hang.
 */
function playAudioFile(url: string): Promise<void> {
  const audio = new Audio(url);
  return new Promise<void>((resolve, reject) => {
    let started = false;
    const onError = () => reject(new Error('audio missing'));
    audio.addEventListener('error', onError, { once: true });
    audio.addEventListener('ended', () => resolve(), { once: true });
    const startTimeout = setTimeout(() => {
      if (!started) reject(new Error('audio did not start in time'));
    }, 5000);
    void audio
      .play()
      .then(() => {
        started = true;
        clearTimeout(startTimeout);
      })
      .catch((err) => {
        clearTimeout(startTimeout);
        onError();
        void err;
      });
  });
}

export async function playReadAloud(key: string, lang: string, fallbackText: string): Promise<void> {
  const base = audioBaseUrl();
  if (!base) {
    await speak(fallbackText, lang);
    return;
  }
  try {
    await playAudioFile(`${base}/audio/${lang}/${key}.mp3`);
  } catch {
    await speak(fallbackText, lang);
  }
}
