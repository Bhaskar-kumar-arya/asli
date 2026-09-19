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

  /* States print themselves into the record; there are no toasts or spinners. */
  if (error)
    return (
      <p role="alert" className="reg-line reg-line--flagged" style={{ textTransform: 'none' }}>
        {error}
      </p>
    );
  if (rows === null)
    return (
      <p className="reg-line">
        <span className="reg-line__ellipsis">Loading your family's medicines</span>
      </p>
    );

  return (
    <section aria-labelledby="home-medicines-heading">
      <div className="reg-head">
        <h2 id="home-medicines-heading">My family's medicines</h2>
        {lastUpdate && <span className="reg-masthead__currency">Last CDSCO update: {formatMonth(lastUpdate)}</span>}
      </div>

      {rows.length === 0 ? (
        <div className="reg-empty">
          <p className="reg-prose reg-prose--muted" style={{ margin: 0 }}>
            No medicines saved yet. Check one and it will be entered here, then re-checked against every new CDSCO list.
          </p>
        </div>
      ) : (
        <ul className="cabinet-list">
          {rows.map(({ cabinet, medicine }, i) => (
            <li key={medicine.medId} className="cabinet-medicine-row">
              <span className="reg-no" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="reg-grow">
                <Link to={`/cabinets/${cabinet.cabinetId}/medicines/${medicine.medId}`} className="tap-target">
                  {medicine.label ?? medicine.identity.productName ?? medicine.identity.batchNumber}
                  {medicine.forPerson ? ` — ${medicine.forPerson}` : ''}
                </Link>
                {medicine.identity.batchNumber ? (
                  <span className="reg-value" style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--text-2)' }}>
                    Batch {medicine.identity.batchNumber}
                  </span>
                ) : null}
              </span>
              <StatusChip status={medicine.latestTier} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
