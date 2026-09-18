export type TextSize = 'normal' | 'large' | 'extra-large';

const STORAGE_KEY = 'asli.textSize';

export function getStoredTextSize(): TextSize {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'large' || value === 'extra-large' || value === 'normal') return value;
  } catch {
    /* localStorage unavailable (private mode) - fall back silently */
  }
  return 'normal';
}

export function applyTextSize(size: TextSize): void {
  if (size === 'normal') {
    document.documentElement.removeAttribute('data-text-size');
  } else {
    document.documentElement.setAttribute('data-text-size', size);
  }
  try {
    localStorage.setItem(STORAGE_KEY, size);
  } catch {
    /* ignore */
  }
}
