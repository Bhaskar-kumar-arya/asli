import { useEffect, useState } from 'react';
import type { CabinetSummary, MedicineIdentity } from '@asli/contracts';
import { Card } from '../../../shell/components/Card';
import { Button } from '../../../shell/components/Button';
import { api } from '../../../api/endpoints';

export interface SaveToCabinetDialogProps {
  identity: MedicineIdentity;
  onClose: () => void;
  onSaved: () => void;
}

/** "Save to family medicines" (docs/UX.md screen 6) - calls F's cabinet API. */
export function SaveToCabinetDialog({ identity, onClose, onSaved }: SaveToCabinetDialogProps) {
  const [cabinets, setCabinets] = useState<CabinetSummary[]>();
  const [selected, setSelected] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void api
      .getCabinets()
      .then((res) => {
        setCabinets(res.cabinets);
        setSelected(res.cabinets[0]?.cabinetId);
      })
      .catch(() => setError('Could not load your family medicine cabinets.'));
  }, []);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(undefined);
    try {
      await api.addMedicine(selected, { identity });
      onSaved();
    } catch {
      setError('Could not save this medicine right now.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Save to family medicines"
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 20 }}
    >
      <Card style={{ maxWidth: 400, width: '100%' }}>
        <h2 style={{ marginTop: 0 }}>Save to family medicines</h2>
        {error ? (
          <p role="alert" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}
        {!cabinets ? (
          <p>Loading your cabinets…</p>
        ) : cabinets.length === 0 ? (
          <p>You don't have a family medicine cabinet yet.</p>
        ) : (
          <label style={{ display: 'block', marginBottom: '1rem' }}>
            Cabinet
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={{ width: '100%', minHeight: 'var(--tap-target-min)', padding: '0.5rem', marginTop: '0.35rem' }}
            >
              {cabinets.map((c) => (
                <option key={c.cabinetId} value={c.cabinetId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!selected || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
