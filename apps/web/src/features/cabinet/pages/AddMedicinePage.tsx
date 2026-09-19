import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Field } from '../../../shell/components/Field';
import { addMedicine } from '../api/cabinets';

// D2 (docs/UX.md screen 3-6) owns the scan/photo flow; its result card's "Save to family medicines"
// button should link to `/scan?saveToCabinet=<cabinetId>` once that lane exists. Until then this
// page only offers the manual-entry fallback.
export function AddMedicinePage() {
  const { cabinetId } = useParams<{ cabinetId: string }>();
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [forPerson, setForPerson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cabinetId || !batchNumber.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const medicine = await addMedicine(cabinetId, {
        identity: {
          batchNumber: batchNumber.trim(),
          productName: productName.trim() || undefined,
          manufacturer: manufacturer.trim() || undefined,
          source: 'manual',
        },
        forPerson: forPerson.trim() || undefined,
      });
      navigate(`/cabinets/${cabinetId}/medicines/${medicine.medId}`);
    } catch {
      setError("Couldn't add this medicine. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="reg-sheet">
      <header className="reg-masthead">
        <h1>Add a medicine</h1>
      </header>
      <p className="reg-prose">
        Have a strip or bill photo? <Link to={`/scan?saveToCabinet=${cabinetId ?? ''}`}>Scan it instead.</Link>
      </p>
      <form onSubmit={handleSubmit} style={{ marginTop: '1.4rem' }}>
        <Field
          label="Batch number (on the strip or carton)"
          value={batchNumber}
          onChange={(e) => setBatchNumber(e.target.value)}
          required
        />
        <Field
          label="Medicine name (optional)"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />
        <Field
          label="Manufacturer (optional)"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
        />
        <Field
          label="Whose medicine is this? (optional)"
          value={forPerson}
          onChange={(e) => setForPerson(e.target.value)}
        />
        {error && (
          <p role="alert" className="reg-note reg-note--flagged" style={{ margin: '0 0 1rem' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || !batchNumber.trim()}
          className="reg-btn reg-btn--primary reg-btn--wide"
        >
          Save to family medicines
        </button>
      </form>
    </main>
  );
}
