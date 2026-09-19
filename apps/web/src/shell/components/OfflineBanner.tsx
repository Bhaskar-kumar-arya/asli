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

  /* A state prints itself into the record. It is not a floating banner. */
  return (
    <div
      role="status"
      className="reg-line reg-line--flagged"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        maxWidth: 'var(--sheet-max)',
        margin: '0 auto',
        padding: '0.7rem 1rem',
        background: 'var(--sheet)',
        borderBottom: '2px solid currentColor',
        textTransform: 'none',
      }}
    >
      You're offline. Some things - like checking a new medicine - need the internet.
    </div>
  );
}
