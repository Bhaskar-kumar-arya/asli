export function isMockMode(): boolean {
  return import.meta.env.VITE_MOCK === '1';
}
