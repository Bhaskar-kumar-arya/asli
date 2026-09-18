import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CabinetDetail, CabinetSummary, MedicineWithStatus } from '@asli/contracts';
import { getCabinet, listCabinets } from '../api/cabinets';
import { StatusChip } from './StatusChip';
import { formatMonth } from '../lib/tierCopy';
import { usePendingPoll } from '../hooks/usePendingPoll';
import '../cabinet.css';

interface Row {
  cabinet: CabinetSummary;
  medicine: MedicineWithStatus;
}

function latestAlertMonth(detail: CabinetDetail): string | undefined {
  return detail.matches
    .map((m) => m.alertMonth)
    .sort()
    .at(-1);
}

export function HomeMedicineList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { cabinets } = await listCabinets();
      const details = await Promise.all(cabinets.map((c) => getCabinet(c.cabinetId)));
      const nextRows: Row[] = [];
      let newest: string | undefined;
      cabinets.forEach((cabinet, i) => {
        const detail = details[i];
        if (!detail) return;
        for (const medicine of detail.medicines) {
          nextRows.push({ cabinet, medicine });
        }
        const month = latestAlertMonth(detail);
        if (month && (!newest || month > newest)) newest = month;
      });
      setRows(nextRows);
      setLastUpdate(newest);
      setError(null);
    } catch {
      setError("Couldn't load your family's medicines. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const anyPending = rows?.some((r) => r.medicine.latestTier === 'PENDING') ?? false;
  usePendingPoll(anyPending, load);

  if (error) return <p role="alert">{error}</p>;
  if (rows === null) return <p>Loading your family's medicines…</p>;

  return (
    <section aria-labelledby="home-medicines-heading">
      <h2 id="home-medicines-heading">My family's medicines</h2>
      {lastUpdate && <p>Last CDSCO update: {formatMonth(lastUpdate)}</p>}
      {rows.length === 0 ? (
        <p>No medicines saved yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {rows.map(({ cabinet, medicine }) => (
            <li key={medicine.medId} className="cabinet-medicine-row">
              <Link to={`/cabinets/${cabinet.cabinetId}/medicines/${medicine.medId}`} className="tap-target">
                {medicine.label ?? medicine.identity.productName ?? medicine.identity.batchNumber}
                {medicine.forPerson ? ` — ${medicine.forPerson}` : ''}
              </Link>
              <StatusChip status={medicine.latestTier} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
