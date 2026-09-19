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

  if (error) return <p role="alert">{error}</p>;
  if (!detail) return <p>Loading members…</p>;

  return (
    <section>
      <h2>Members of {detail.cabinet.name}</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {detail.members.map((member) => {
          const isSelf = member.userId === currentUserId;
          return (
            <li key={member.userId} className="cabinet-medicine-row">
              <span>
                {isSelf ? 'You' : member.userId} — {member.role}
              </span>
              <label>
                Role
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.userId, e.target.value as Role)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={member.alertsEnabled}
                  onChange={(e) => handleAlertsToggle(member.userId, e.target.checked)}
                />
                Receive alerts
              </label>
              {isSelf && (
                <button type="button" className="tap-target" onClick={() => handleLeave(member.userId)}>
                  Leave this cabinet
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <h3>Invite someone</h3>
      <label>
        Role for new member
        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="tap-target" onClick={handleCreateInvite}>
        Create invite
      </button>
      {invite && (
        <div>
          <p>
            Invite code: <strong>{invite.code}</strong>
          </p>
          <button type="button" className="tap-target" onClick={handleShare}>
            Share invite link
          </button>
        </div>
      )}
    </section>
  );
}
