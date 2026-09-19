import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { AlertDetail, CabinetDetail, MatchSummary } from '@asli/contracts';
import { getCabinet, removeMedicine } from '../api/cabinets';
import { getAlertDetail } from '../api/alerts';
import { ApiRequestError } from '../api/client';
import { StatusChip } from '../components/StatusChip';
import { formatMonth } from '../lib/tierCopy';
import { reasonPlainText } from '../lib/reasonCopy';
import { ReportProblemButton } from '../../report';
import '../cabinet.css';

export function MedicineDetailPage() {
  const { cabinetId, medId } = useParams<{ cabinetId: string; medId: string }>();
  const [searchParams] = useSearchParams();
  const highlightedAlertId = searchParams.get('match');
  const navigate = useNavigate();

  const [detail, setDetail] = useState<CabinetDetail | null>(null);
  const [alertDetails, setAlertDetails] = useState<Record<string, AlertDetail>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeDisabled, setRemoveDisabled] = useState(false);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    if (!cabinetId) return;
    try {
      const result = await getCabinet(cabinetId);
      setDetail(result);
      setLoadError(null);
      const matches = result.matches.filter((m) => m.medId === medId);
      const details = await Promise.all(
        matches.map(async (m) => [m.alertRef, await getAlertDetail(m.alertRef)] as const),
      );
      setAlertDetails(Object.fromEntries(details));
    } catch {
      setLoadError("Couldn't load this medicine. Check your connection and try again.");
    }
  }, [cabinetId, medId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRemove() {
    if (!cabinetId || !medId) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await removeMedicine(cabinetId, medId);
      navigate(`/cabinets/${cabinetId}`);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 403) {
        setRemoveError(err.message);
        setRemoveDisabled(true);
      } else {
        setRemoveError("Couldn't remove this medicine. Check your connection and try again.");
      }
    } finally {
      setRemoving(false);
    }
  }

  if (loadError)
    return (
      <main className="reg-sheet">
        <p role="alert" className="reg-line reg-line--flagged" style={{ textTransform: 'none', marginTop: '1.5rem' }}>
          {loadError}
        </p>
      </main>
    );
  if (!detail)
    return (
      <main className="reg-sheet">
        <p className="reg-line" style={{ marginTop: '1.5rem' }}>
          <span className="reg-line__ellipsis">Fetching the entry</span>
        </p>
      </main>
    );

  const medicine = detail.medicines.find((m) => m.medId === medId);
  if (!medicine)
    return (
      <main className="reg-sheet">
        <p role="alert" className="reg-line reg-line--flagged" style={{ textTransform: 'none', marginTop: '1.5rem' }}>
          This medicine could not be found.
        </p>
      </main>
    );

  const matches: MatchSummary[] = detail.matches
    .filter((m) => m.medId === medId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <main className="reg-sheet">
      <header className="reg-masthead">
        <h1>{medicine.label ?? medicine.identity.productName ?? medicine.identity.batchNumber}</h1>
      </header>

      <span className="reg-legend" style={{ marginTop: '1.2rem' }}>
        Batch entered
      </span>
      <span className="reg-value--batch">{medicine.identity.batchNumber}</span>

      <div style={{ margin: '1.1rem 0 1.4rem' }}>
        <StatusChip status={medicine.latestTier} />
      </div>

      <dl className="reg-particulars">
        {medicine.identity.productName && (
          <>
            <dt>Medicine name</dt>
            <dd>{medicine.identity.productName}</dd>
          </>
        )}
        <dt>Batch number</dt>
        <dd>{medicine.identity.batchNumber}</dd>
        {medicine.identity.manufacturer && (
          <>
            <dt>Manufacturer</dt>
            <dd>{medicine.identity.manufacturer}</dd>
          </>
        )}
        {medicine.forPerson && (
          <>
            <dt>For</dt>
            <dd>{medicine.forPerson}</dd>
          </>
        )}
        {medicine.lastCheckedAt && (
          <>
            <dt>Last checked</dt>
            <dd>{new Date(medicine.lastCheckedAt).toLocaleString('en-IN')}</dd>
          </>
        )}
      </dl>

      <div className="reg-head">
        <h3>Match history</h3>
      </div>
      {matches.length === 0 ? (
        <div className="reg-empty">
          <p className="reg-prose reg-prose--muted" style={{ margin: 0 }}>
            No CDSCO alert list matches found for this batch.
          </p>
        </div>
      ) : (
        <ul className="cabinet-list">
          {matches.map((match) => {
            const alert = alertDetails[match.alertRef];
            const isHighlighted = match.alertRef === highlightedAlertId;
            return (
              <li
                key={match.alertRef}
                className="cabinet-medicine-row"
                data-highlighted={isHighlighted}
                aria-current={isHighlighted ? 'true' : undefined}
              >
                <span className="reg-grow">
                  <strong style={{ display: 'block', marginBottom: '0.55rem' }}>
                    {match.category === 'SPURIOUS'
                      ? 'A batch with this label was reported as spurious'
                      : 'This batch is on a CDSCO alert list'}
                  </strong>
                  <dl className="reg-particulars" style={{ marginTop: 0 }}>
                    <dt>Alert month</dt>
                    <dd>{formatMonth(match.alertMonth)}</dd>
                    {alert && (
                      <>
                        <dt>Reporting source</dt>
                        <dd>{alert.reportingSource}</dd>
                        {alert.reportingLab && (
                          <>
                            <dt>Lab</dt>
                            <dd>{alert.reportingLab}</dd>
                          </>
                        )}
                        <dt>Reason</dt>
                        <dd>{reasonPlainText(alert.reasonCode)}</dd>
                        <dt>Source</dt>
                        <dd>
                          <a href={alert.sourceUrl} target="_blank" rel="noreferrer">
                            View CDSCO source
                          </a>
                        </dd>
                      </>
                    )}
                  </dl>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="reg-stack">
        <ReportProblemButton identity={medicine.identity} alertRef={matches[0]?.alertRef} />
        <button
          type="button"
          onClick={handleRemove}
          disabled={removing || removeDisabled}
          className="reg-btn reg-btn--danger"
        >
          Remove from family medicines
        </button>
      </div>
      {removeError && (
        <p role="alert" className="reg-note reg-note--flagged">
          {removeError}
        </p>
      )}
    </main>
  );
}
