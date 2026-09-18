import { useEffect, useState } from 'react';
import { Card } from '../../../shell/components/Card';
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

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p>Loading dashboard…</p>;

  const { accuracyDetail, costDetail } = data;

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '1rem 1rem 3rem' }}>
      <h1 style={{ margin: '0 0 0.25rem' }}>Cost and accuracy dashboard</h1>
      <p style={{ color: 'var(--color-text-muted, #666)', marginTop: 0 }}>
        Measured on {fmtDate(costDetail.window.end)} · last 24h on this stage
      </p>

      <section aria-labelledby="accuracy-heading" style={{ marginBottom: '1.5rem' }}>
        <h2 id="accuracy-heading">Accuracy</h2>
        {accuracyDetail ? (
          <>
            <p>
              Sample size: {data.accuracy.sampleSize} · Tier correctness: {fmtPct(accuracyDetail.tierCorrectnessRate)} ·
              measured {fmtDate(accuracyDetail.measuredAt)}
            </p>
            <h3>By method</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Method</th>
                  <th style={{ textAlign: 'right' }}>Count</th>
                  <th style={{ textAlign: 'right' }}>Batch exact</th>
                </tr>
              </thead>
              <tbody>
                {accuracyDetail.byMethod.map((row) => (
                  <tr key={row.method}>
                    <td>{row.method}</td>
                    <td style={{ textAlign: 'right' }}>{row.count}</td>
                    <td style={{ textAlign: 'right' }}>{fmtPct(row.batchExactRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>By condition</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Condition</th>
                  <th style={{ textAlign: 'right' }}>Count</th>
                  <th style={{ textAlign: 'right' }}>Batch exact</th>
                </tr>
              </thead>
              <tbody>
                {accuracyDetail.byCondition.map((row) => (
                  <tr key={`${row.condition}-${row.value}`}>
                    <td>
                      {row.condition}={row.value}
                    </td>
                    <td style={{ textAlign: 'right' }}>{row.count}</td>
                    <td style={{ textAlign: 'right' }}>{fmtPct(row.batchExactRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p>No accuracy run has been uploaded yet (see tools/accuracy).</p>
        )}
      </section>

      <section aria-labelledby="cost-heading">
        <h2 id="cost-heading">Cost</h2>
        <p>Scans measured in this window: {costDetail.scanCount}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <Card>
            <h3 style={{ marginTop: 0 }}>Per scan</h3>
            <p style={{ fontSize: '1.5rem', margin: 0 }}>{fmtUsd(costDetail.perScanUsd.totalUsd)}</p>
          </Card>
          <Card>
            <h3 style={{ marginTop: 0 }}>Per 1,000 scans</h3>
            <p style={{ fontSize: '1.5rem', margin: 0 }}>{fmtUsd(data.cost.costPer1000ScansUsd)}</p>
          </Card>
          <Card>
            <h3 style={{ marginTop: 0 }}>Per ingestion run</h3>
            <p style={{ fontSize: '1.5rem', margin: 0 }}>{fmtUsd(costDetail.perIngestionRun.totalUsd)}</p>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              {costDetail.perIngestionRun.rows > 0 ? `${costDetail.perIngestionRun.rows} rows ingested` : 'no run in this window'}
            </p>
          </Card>
          <Card>
            <h3 style={{ marginTop: 0 }}>10,000-family projection (monthly)</h3>
            <p style={{ fontSize: '1.5rem', margin: 0 }}>{fmtUsd(costDetail.tenThousandFamilyProjection.totalUsd)}</p>
          </Card>
        </div>

        <details style={{ marginTop: '1rem' }}>
          <summary>Projection assumptions</summary>
          <ul>
            <li>{costDetail.tenThousandFamilyProjection.assumptions.avgMedicinesPerFamily} medicines per family</li>
            <li>{costDetail.tenThousandFamilyProjection.assumptions.scansPerFamilyPerMonth} scans per family per month</li>
            <li>{costDetail.tenThousandFamilyProjection.assumptions.newAlertFanoutsPerMonth} new-alert fan-outs per month</li>
            <li>{costDetail.tenThousandFamilyProjection.assumptions.familiesNotifiedPerFanout} families notified per fan-out</li>
          </ul>
        </details>
      </section>
    </main>
  );
}
