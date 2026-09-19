import { useEffect, useState } from 'react';
import type { CabinetSummary, MedicineIdentity } from '@asli/contracts';
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
    <div className="reg-scrim">
      <div role="dialog" aria-label="Save to family medicines" aria-modal="true" className="reg-docket">
        <h2>Save to family medicines</h2>
        {error ? (
          <p role="alert" className="reg-note reg-note--flagged" style={{ margin: '0 0 1rem' }}>
            {error}
          </p>
        ) : null}
        {!cabinets ? (
          <p className="reg-line" style={{ borderBottom: 0 }}>
            <span className="reg-line__ellipsis">Loading your cabinets</span>
          </p>
        ) : cabinets.length === 0 ? (
          <p className="reg-prose reg-prose--muted">You don't have a family medicine cabinet yet.</p>
        ) : (
          <div className="reg-field">
            <label htmlFor="save-cabinet" className="reg-legend">
              Cabinet
            </label>
            <select
              id="save-cabinet"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="reg-select"
            >
              {cabinets.map((c) => (
                <option key={c.cabinetId} value={c.cabinetId}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="reg-stack">
          <Button onClick={() => void handleSave()} disabled={!selected || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
