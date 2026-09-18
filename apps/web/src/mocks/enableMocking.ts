import { isMockMode } from './isMockMode';

/** Starts the MSW worker when VITE_MOCK=1, before the app renders. */
export async function enableMocking(): Promise<void> {
  if (!isMockMode()) return;
  const { worker } = await import('./browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
