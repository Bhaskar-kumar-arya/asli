import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const setOnlineTrue = () => setOnline(true);
    const setOnlineFalse = () => setOnline(false);
    window.addEventListener('online', setOnlineTrue);
    window.addEventListener('offline', setOnlineFalse);
    return () => {
      window.removeEventListener('online', setOnlineTrue);
      window.removeEventListener('offline', setOnlineFalse);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--color-verify-bg)',
        color: 'var(--color-verify-text)',
        padding: '0.6rem 1rem',
        textAlign: 'center',
        fontWeight: 600,
      }}
    >
      You're offline. Some things - like checking a new medicine - need the internet.
    </div>
  );
}
