import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CabinetDetail, MedicineWithStatus } from '@asli/contracts';
import { getCabinet } from '../api/cabinets';
import { StatusChip } from '../components/StatusChip';
import { usePendingPoll } from '../hooks/usePendingPoll';
import '../cabinet.css';

const UNASSIGNED = 'Unassigned';

function groupByPerson(medicines: MedicineWithStatus[]): Map<string, MedicineWithStatus[]> {
  const groups = new Map<string, MedicineWithStatus[]>();
  for (const med of medicines) {
    const key = med.forPerson ?? UNASSIGNED;
    const list = groups.get(key) ?? [];
    list.push(med);
    groups.set(key, list);
  }
  return groups;
}

export function CabinetPage() {
  const { cabinetId } = useParams<{ cabinetId: string }>();
  const [detail, setDetail] = useState<CabinetDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cabinetId) return;
    try {
      const result = await getCabinet(cabinetId);
      setDetail(result);
      setError(null);
    } catch {
      setError("Couldn't load this cabinet. Check your connection and try again.");
    }
  }, [cabinetId]);

  useEffect(() => {
    void load();
  }, [load]);

  const anyPending = detail?.medicines.some((m) => m.latestTier === 'PENDING') ?? false;
  usePendingPoll(anyPending, load);

  const groups = useMemo(() => (detail ? groupByPerson(detail.medicines) : null), [detail]);

  if (error)
    return (
      <main className="reg-sheet">
        <p role="alert" className="reg-line reg-line--flagged" style={{ textTransform: 'none', marginTop: '1.5rem' }}>
          {error}
        </p>
      </main>
    );
  if (!detail || !groups)
    return (
      <main className="reg-sheet">
        <p className="reg-line" style={{ marginTop: '1.5rem' }}>
          <span className="reg-line__ellipsis">Opening the cabinet</span>
        </p>
      </main>
    );

  return (
    <main className="reg-sheet">
      <header className="reg-masthead">
        <h1>{detail.cabinet.name}</h1>
        <p className="reg-masthead__currency">
          {detail.medicines.length} entries · {detail.members.length} members
        </p>
      </header>

      {[...groups.entries()].map(([person, medicines]) => (
        <section key={person}>
          <div className="reg-head">
            <h2>{person}</h2>
          </div>
          <ul className="cabinet-list">
            {medicines.map((med, i) => (
              <li key={med.medId} className="cabinet-medicine-row">
                <span className="reg-no" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="reg-grow">
                  <Link to={`/cabinets/${detail.cabinet.cabinetId}/medicines/${med.medId}`} className="tap-target">
                    {med.label ?? med.identity.productName ?? med.identity.batchNumber}
                  </Link>
                  {med.identity.batchNumber ? (
                    <span className="reg-value" style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--text-2)' }}>
                      Batch {med.identity.batchNumber}
                    </span>
                  ) : null}
                </span>
                <StatusChip status={med.latestTier} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="reg-stack">
        <Link to={`/cabinets/${detail.cabinet.cabinetId}/add-medicine`} className="reg-btn reg-btn--primary">
          Add a medicine
        </Link>
        <Link to={`/cabinets/${detail.cabinet.cabinetId}/members`} className="reg-btn">
          Members ({detail.members.length})
        </Link>
      </div>
    </main>
  );
}
