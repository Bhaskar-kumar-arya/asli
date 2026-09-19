import { useEffect, useState } from 'react';
import { getPublicMetrics } from '../api/metrics';
import type { DashboardMetrics } from '../types';

function fmtUsd(n: number | undefined): string {
  return n === undefined ? 'unknown (pricing not yet measured)' : `$${n.toFixed(4)}`;
}

function fmtPct(n: number | undefined): string {
  return n === undefined ? '—' : `${(n * 100).toFixed(1)}%`;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return 'never';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

/** Public "how well does this work, what does it cost" page (docs/UX.md, plan/tasks/J-dashboard.md).
 * No auth, no personal data - every number here is either a measured aggregate off CloudWatch or a
 * clearly stated assumption (docs/OBSERVABILITY_AND_COST.md "Cost model"). */
export function DashboardPage() {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicMetrics()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load metrics. Check your connection and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error)
    return (
      <main className="reg-sheet reg-sheet--wide">
        <p role="alert" className="reg-line reg-line--flagged" style={{ textTransform: 'none', marginTop: '1.5rem' }}>
          {error}
        </p>
      </main>
    );
  if (!data)
    return (
      <main className="reg-sheet reg-sheet--wide">
        <p className="reg-line" style={{ marginTop: '1.5rem' }}>
          <span className="reg-line__ellipsis">Compiling the return</span>
        </p>
      </main>
    );

  const { accuracyDetail, costDetail } = data;

  return (
    <main className="reg-sheet reg-sheet--wide">
      <header className="reg-masthead">
        <h1>Cost and accuracy</h1>
        <p className="reg-masthead__currency">
          Measured {fmtDate(costDetail.window.end)} · last 24h on this stage
        </p>
      </header>

      <section aria-labelledby="accuracy-heading">
        <div className="reg-head">
          <h2 id="accuracy-heading">Accuracy</h2>
        </div>
        {accuracyDetail ? (
          <>
            <dl className="reg-particulars" style={{ marginTop: '1rem' }}>
              <dt>Sample size</dt>
              <dd>{data.accuracy.sampleSize}</dd>
              <dt>Tier correctness</dt>
              <dd>{fmtPct(accuracyDetail.tierCorrectnessRate)}</dd>
              <dt>Measured</dt>
              <dd>{fmtDate(accuracyDetail.measuredAt)}</dd>
            </dl>

            <div className="reg-table-scroll">
              <table className="reg-table">
                <caption>Batch-exact read rate by capture method</caption>
                <thead>
                  <tr>
                    <th>Method</th>
                    <th data-num>Count</th>
                    <th data-num>Batch exact</th>
                  </tr>
                </thead>
                <tbody>
                  {accuracyDetail.byMethod.map((row) => (
                    <tr key={row.method}>
                      <td>{row.method}</td>
                      <td data-num>{row.count}</td>
                      <td data-num>{fmtPct(row.batchExactRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="reg-table-scroll" style={{ marginTop: '1.4rem' }}>
              <table className="reg-table">
                <caption>Batch-exact read rate by photo condition</caption>
                <thead>
                  <tr>
                    <th>Condition</th>
                    <th data-num>Count</th>
                    <th data-num>Batch exact</th>
                  </tr>
                </thead>
                <tbody>
                  {accuracyDetail.byCondition.map((row) => (
                    <tr key={`${row.condition}-${row.value}`}>
                      <td>
                        {row.condition}={row.value}
                      </td>
                      <td data-num>{row.count}</td>
                      <td data-num>{fmtPct(row.batchExactRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="reg-prose reg-prose--muted" style={{ marginTop: '1rem' }}>
            No accuracy run has been uploaded yet (see tools/accuracy).
          </p>
        )}
      </section>

      <section aria-labelledby="cost-heading">
        <div className="reg-head">
          <h2 id="cost-heading">Cost</h2>
        </div>

        <dl className="reg-particulars" style={{ marginTop: '1rem' }}>
          <dt>Scans in window</dt>
          <dd>{costDetail.scanCount}</dd>
          <dt>Per scan</dt>
          <dd>{fmtUsd(costDetail.perScanUsd.totalUsd)}</dd>
          <dt>Per 1,000 scans</dt>
          <dd>{fmtUsd(data.cost.costPer1000ScansUsd)}</dd>
          <dt>Per ingestion run</dt>
          <dd>
            {fmtUsd(costDetail.perIngestionRun.totalUsd)}
            {costDetail.perIngestionRun.rows > 0 ? ` · ${costDetail.perIngestionRun.rows} rows ingested` : ' · no run in this window'}
          </dd>
          <dt>10,000 families, monthly</dt>
          <dd>{fmtUsd(costDetail.tenThousandFamilyProjection.totalUsd)}</dd>
        </dl>

        <details className="reg-details" style={{ marginTop: '1.2rem' }}>
          <summary>Projection assumptions</summary>
          <dl className="reg-particulars">
            <dt>Medicines per family</dt>
            <dd>{costDetail.tenThousandFamilyProjection.assumptions.avgMedicinesPerFamily}</dd>
            <dt>Scans per family per month</dt>
            <dd>{costDetail.tenThousandFamilyProjection.assumptions.scansPerFamilyPerMonth}</dd>
            <dt>New-alert fan-outs per month</dt>
            <dd>{costDetail.tenThousandFamilyProjection.assumptions.newAlertFanoutsPerMonth}</dd>
            <dt>Families notified per fan-out</dt>
            <dd>{costDetail.tenThousandFamilyProjection.assumptions.familiesNotifiedPerFanout}</dd>
          </dl>
        </details>
      </section>
    </main>
  );
}
