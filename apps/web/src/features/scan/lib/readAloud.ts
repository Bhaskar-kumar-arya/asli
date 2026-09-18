/**
 * docs/SAFETY_AND_CONTENT.md Read-aloud: pre-rendered Polly MP3s per language
 * (lane I's public bucket) for the static guidance text, falling back to
 * browser speechSynthesis (used for kn when Polly has no voice, or if the
 * MP3 is missing yet).
 */
export function hasSpeechVoice(lang: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
}

export async function playReadAloud(key: string, lang: string, fallbackText: string): Promise<void> {
  const audio = new Audio(`/audio/${lang}/${key}.mp3`);
  try {
    await new Promise<void>((resolve, reject) => {
      audio.addEventListener('canplaythrough', () => resolve(), { once: true });
      audio.addEventListener('error', () => reject(new Error('audio missing')), { once: true });
      void audio.play().catch(reject);
    });
    return;
  } catch {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(fallbackText);
    utterance.lang = lang === 'kn' ? 'kn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
    window.speechSynthesis.speak(utterance);
  }
}
