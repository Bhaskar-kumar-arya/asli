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
    <section>
      <h2>Join a family medicine cabinet</h2>
      <p>Invite code: {code}</p>
      <button type="button" className="tap-target" onClick={handleAccept} disabled={submitting}>
        Accept invite
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
