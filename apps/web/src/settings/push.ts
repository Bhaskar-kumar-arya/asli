import { api } from '../api/endpoints';

/**
 * navigator.serviceWorker.ready never settles when no worker is registered,
 * and vite-plugin-pwa registers none in dev (vite.config.ts devOptions), so
 * waiting on it unguarded leaves the notification buttons hanging forever.
 */
const SERVICE_WORKER_READY_TIMEOUT_MS = 3000;

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))).buffer;
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

async function readyRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!pushSupported()) return undefined;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<undefined>((resolve) => {
      setTimeout(() => resolve(undefined), SERVICE_WORKER_READY_TIMEOUT_MS);
    }),
  ]);
}

/** True when this browser already holds a push subscription for the app. */
export async function isSubscribedToPush(): Promise<boolean> {
  const registration = await readyRegistration();
  if (!registration) return false;
  return (await registration.pushManager.getSubscription()) !== null;
}

export async function subscribeToPush(): Promise<boolean> {
  const registration = await readyRegistration();
  if (!registration) return false;
  const { publicKey } = await api.getVapidPublicKey();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToArrayBuffer(publicKey),
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false;
  await api.subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    userAgent: navigator.userAgent,
  });
  return true;
}

export async function unsubscribeFromPush(): Promise<void> {
  const registration = await readyRegistration();
  if (!registration) return;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await api.unsubscribePush(subscription.endpoint);
  await subscription.unsubscribe();
}
