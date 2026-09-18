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

  if (loadError) return <p role="alert">{loadError}</p>;
  if (!detail) return <p>Loading medicine…</p>;

  const medicine = detail.medicines.find((m) => m.medId === medId);
  if (!medicine) return <p role="alert">This medicine could not be found.</p>;

  const matches: MatchSummary[] = detail.matches
    .filter((m) => m.medId === medId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <section>
      <h2>{medicine.label ?? medicine.identity.productName ?? medicine.identity.batchNumber}</h2>
      <StatusChip status={medicine.latestTier} />

      <dl>
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

      <h3>Match history</h3>
      {matches.length === 0 ? (
        <p>No CDSCO alert list matches found for this batch.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
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
                <strong>
                  {match.category === 'SPURIOUS'
                    ? 'A batch with this label was reported as spurious'
                    : 'This batch is on a CDSCO alert list'}
                </strong>
                <span>CDSCO alert month: {formatMonth(match.alertMonth)}</span>
                {alert && (
                  <>
                    <span>Reporting source: {alert.reportingSource}</span>
                    {alert.reportingLab && <span>Lab: {alert.reportingLab}</span>}
                    <span>Reason: {reasonPlainText(alert.reasonCode)}</span>
                    <a href={alert.sourceUrl} target="_blank" rel="noreferrer">
                      View CDSCO source
                    </a>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" onClick={handleRemove} disabled={removing || removeDisabled} className="tap-target">
        Remove from family medicines
      </button>
      {removeError && <p role="alert">{removeError}</p>}
      <ReportProblemButton identity={medicine.identity} alertRef={matches[0]?.alertRef} />
    </section>
  );
}
