import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { acceptInvite } from '../api/cabinets';

export function InviteAcceptPage() {
  const { code } = useParams<{ code: string }>();
  const [cabinetId, setCabinetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAccept() {
    if (!code) return;
    setSubmitting(true);
    setError(null);
    try {
      const cabinet = await acceptInvite(code);
      setCabinetId(cabinet.cabinetId);
    } catch {
      setError('This invite code is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  }

  if (cabinetId) {
    return <Navigate to={`/cabinets/${cabinetId}`} replace />;
  }

  return (
    <main className="reg-sheet">
      <header className="reg-masthead">
        <h1>Join a family medicine cabinet</h1>
      </header>

      <dl className="reg-particulars" style={{ marginTop: '1.4rem' }}>
        <dt>Invite code</dt>
        <dd>{code}</dd>
      </dl>

      <div className="reg-stack">
        <button
          type="button"
          className="reg-btn reg-btn--primary reg-btn--wide"
          onClick={handleAccept}
          disabled={submitting}
        >
          Accept invite
        </button>
      </div>
      {error && (
        <p role="alert" className="reg-note reg-note--flagged">
          {error}
        </p>
      )}
    </main>
  );
}
