import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CabinetDetail, Invite, Role } from '@asli/contracts';
import { createInvite, getCabinet, removeMember, updateMember } from '../api/cabinets';
import { getCurrentUserId } from '../../../auth/session';
import '../cabinet.css';

const ROLES: Role[] = ['OWNER', 'EDITOR', 'VIEWER'];

async function shareInvite(invite: Invite, cabinetName: string) {
  const url = `${window.location.origin}/invite/${invite.code}`;
  const text = `Join "${cabinetName}" on Asli to help watch for medicine alerts. Invite code: ${invite.code}`;
  if (navigator.share) {
    await navigator.share({ title: 'Asli cabinet invite', text, url });
  } else {
    await navigator.clipboard?.writeText(url);
  }
}

export function MembersPage() {
  const { cabinetId } = useParams<{ cabinetId: string }>();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  const [detail, setDetail] = useState<CabinetDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [inviteRole, setInviteRole] = useState<Role>('VIEWER');

  const load = useCallback(async () => {
    if (!cabinetId) return;
    try {
      setDetail(await getCabinet(cabinetId));
      setError(null);
    } catch {
      setError("Couldn't load members. Check your connection and try again.");
    }
  }, [cabinetId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void getCurrentUserId().then(setCurrentUserId);
  }, []);

  async function handleCreateInvite() {
    if (!cabinetId) return;
    try {
      const created = await createInvite(cabinetId, { role: inviteRole });
      setInvite(created);
      setError(null);
    } catch {
      setError("Couldn't create an invite. You may not have permission to manage members.");
    }
  }

  async function handleShare() {
    if (!invite || !detail) return;
    await shareInvite(invite, detail.cabinet.name);
  }

  async function handleRoleChange(userId: string, role: Role) {
    if (!cabinetId) return;
    try {
      await updateMember(cabinetId, userId, { role });
      await load();
    } catch {
      setError("Couldn't change that member's role.");
    }
  }

  async function handleAlertsToggle(userId: string, alertsEnabled: boolean) {
    if (!cabinetId) return;
    try {
      await updateMember(cabinetId, userId, { alertsEnabled });
      await load();
    } catch {
      setError("Couldn't update alert settings.");
    }
  }

  async function handleLeave(userId: string) {
    if (!cabinetId) return;
    try {
      await removeMember(cabinetId, userId);
      navigate('/');
    } catch {
      setError("Couldn't leave this cabinet.");
    }
  }

  if (error)
    return (
      <main className="reg-sheet">
        <p role="alert" className="reg-line reg-line--flagged" style={{ textTransform: 'none', marginTop: '1.5rem' }}>
          {error}
        </p>
      </main>
    );
  if (!detail)
    return (
      <main className="reg-sheet">
        <p className="reg-line" style={{ marginTop: '1.5rem' }}>
          <span className="reg-line__ellipsis">Reading the signatures</span>
        </p>
      </main>
    );

  return (
    <main className="reg-sheet">
      <header className="reg-masthead">
        <h1>Members</h1>
        <p className="reg-masthead__currency">{detail.cabinet.name}</p>
      </header>

      <ul className="cabinet-list">
        {detail.members.map((member, i) => {
          const isSelf = member.userId === currentUserId;
          return (
            <li key={member.userId} className="cabinet-medicine-row">
              <span className="reg-no" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="reg-grow">
                <span style={{ display: 'block', fontWeight: 700 }}>
                  {isSelf ? 'You' : member.userId} — {member.role}
                </span>

                <span className="reg-field" style={{ display: 'block', margin: '0.7rem 0 0.4rem' }}>
                  <label htmlFor={`role-${member.userId}`} className="reg-legend">
                    Role
                  </label>
                  <select
                    id={`role-${member.userId}`}
                    className="reg-select"
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.userId, e.target.value as Role)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </span>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    minHeight: 'var(--tap-target-min)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={member.alertsEnabled}
                    onChange={(e) => handleAlertsToggle(member.userId, e.target.checked)}
                    style={{ accentColor: 'var(--margin)', width: 18, height: 18 }}
                  />
                  Receive alerts
                </label>

                {isSelf && (
                  <button type="button" className="reg-btn reg-btn--danger" onClick={() => handleLeave(member.userId)}>
                    Leave this cabinet
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="reg-head">
        <h2>Invite someone</h2>
      </div>

      <div className="reg-field" style={{ marginTop: '1rem' }}>
        <label htmlFor="invite-role" className="reg-legend">
          Role for new member
        </label>
        <select
          id="invite-role"
          className="reg-select"
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="reg-stack">
        <button type="button" className="reg-btn reg-btn--primary" onClick={handleCreateInvite}>
          Create invite
        </button>
      </div>

      {invite && (
        <>
          <dl className="reg-particulars" style={{ marginTop: '1.4rem' }}>
            <dt>Invite code</dt>
            <dd>{invite.code}</dd>
          </dl>
          <div className="reg-stack">
            <button type="button" className="reg-btn" onClick={handleShare}>
              Share invite link
            </button>
          </div>
        </>
      )}
    </main>
  );
}
