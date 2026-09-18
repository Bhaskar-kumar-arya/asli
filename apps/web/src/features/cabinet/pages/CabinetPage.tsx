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

  if (error) return <p role="alert">{error}</p>;
  if (!detail || !groups) return <p>Loading cabinet…</p>;

  return (
    <section>
      <h2>{detail.cabinet.name}</h2>
      <p>
        <Link to={`/cabinets/${detail.cabinet.cabinetId}/members`} className="tap-target">
          Members ({detail.members.length})
        </Link>
      </p>
      {[...groups.entries()].map(([person, medicines]) => (
        <div key={person}>
          <h3>{person}</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {medicines.map((med) => (
              <li key={med.medId} className="cabinet-medicine-row">
                <Link to={`/cabinets/${detail.cabinet.cabinetId}/medicines/${med.medId}`} className="tap-target">
                  {med.label ?? med.identity.productName ?? med.identity.batchNumber}
                </Link>
                <StatusChip status={med.latestTier} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Link to={`/cabinets/${detail.cabinet.cabinetId}/add-medicine`} className="tap-target">
        Add a medicine
      </Link>
    </section>
  );
}
