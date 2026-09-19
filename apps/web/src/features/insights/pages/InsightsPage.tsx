import { useEffect, useState } from 'react';
import type { PublicStats } from '@asli/contracts';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../../../shell/components/Card';
import { getPublicInsights, getPublicStats } from '../api/insights';
import { reasonLabel } from '../lib/reasonLabels';
import type { InsightsDetail } from '../types';

function fmtDate(iso: string | undefined): string {
  if (!iso) return 'unknown date';
  return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  if (!year || !month) return yyyyMm;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
  });
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** "Source: CDSCO alerts, computed by Asli on <date>" (this task's Deliverable 2). */
function SourceLine({ generatedAt }: { generatedAt: string }) {
  return (
    <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.85rem', color: 'var(--text-2, #666)' }}>
      Source: CDSCO alerts, computed by Asli on {fmtDate(generatedAt)}
    </p>
  );
}

/** Public, no-login "how big is this problem" page (docs/UX.md screen 13, plan/tasks/M-insights.md).
 * Every number is an aggregate CDSCO alert count - never a manufacturer ranking or named-company
 * chart (docs/PRODUCT.md "Out"), and never implies a medicine is "safe" (docs/SAFETY_AND_CONTENT.md). */
export function InsightsPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [insights, setInsights] = useState<InsightsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPublicStats(), getPublicInsights()])
      .then(([statsRes, insightsRes]) => {
        if (cancelled) return;
        setStats(statsRes);
        setInsights(insightsRes);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load insights. Check your connection and try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!stats || !insights) return <p>Loading insights…</p>;

  const monthData = insights.byMonthCategory.map((m) => ({ ...m, monthLabel: fmtMonth(m.month) }));
  const reasonData = insights.topReasonCodes
    .slice(0, 8)
    .map((r) => ({ code: r.reasonCode, label: reasonLabel(r.reasonCode), count: r.count }));
  const sourceData = insights.byReportingSource.map((s) => ({ ...s, label: s.reportingSource }));
  const latestMonthEntry = monthData[monthData.length - 1];

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 1rem 3rem' }}>
      <h1 style={{ margin: '0 0 0.25rem' }}>CDSCO alerts, at a glance</h1>
      <p style={{ color: 'var(--text-2, #666)', marginTop: 0 }}>
        This does not certify any medicine as safe. It summarises batches CDSCO has already reported as Not of
        Standard Quality or spurious.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Card>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Flagged batches</h2>
          <p style={{ fontSize: '1.75rem', margin: 0 }}>{stats.totalFlaggedBatches}</p>
        </Card>
        <Card>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Months covered</h2>
          <p style={{ fontSize: '1.75rem', margin: 0 }}>{stats.monthsCovered}</p>
        </Card>
        <Card>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Latest CDSCO list</h2>
          <p style={{ fontSize: '1.75rem', margin: 0 }}>{fmtMonth(stats.latestMonth)}</p>
        </Card>
        <Card>
          <h2 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Families protected</h2>
          <p style={{ fontSize: '1.75rem', margin: 0 }}>{stats.cabinetsProtected}</p>
        </Card>
      </div>

      <section aria-labelledby="by-month-heading" style={{ marginBottom: '2rem' }}>
        <h2 id="by-month-heading">Flagged batches per month</h2>
        <p>
          {latestMonthEntry
            ? `In ${latestMonthEntry.monthLabel}, CDSCO reported ${latestMonthEntry.NSQ} Not-of-Standard-Quality and ${latestMonthEntry.SPURIOUS} spurious batches. Totals across all ${monthData.length} covered months are shown below.`
            : 'No months have been computed yet.'}
        </p>
        <div role="img" aria-label={`Bar chart of flagged batches per month, split by Not of Standard Quality and spurious, across ${monthData.length} months.`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="NSQ" name="Not of Standard Quality" stackId="a" fill="var(--chart-1)" />
              <Bar dataKey="SPURIOUS" name="Spurious" stackId="a" fill="var(--chart-2)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details>
          <summary>Table of month-by-month counts</summary>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Month</th>
                <th style={{ textAlign: 'right' }}>NSQ</th>
                <th style={{ textAlign: 'right' }}>Spurious</th>
              </tr>
            </thead>
            <tbody>
              {monthData.map((m) => (
                <tr key={m.month}>
                  <td>{m.monthLabel}</td>
                  <td style={{ textAlign: 'right' }}>{m.NSQ}</td>
                  <td style={{ textAlign: 'right' }}>{m.SPURIOUS}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
        <SourceLine generatedAt={insights.generatedAt} />
      </section>

      <section aria-labelledby="by-reason-heading" style={{ marginBottom: '2rem' }}>
        <h2 id="by-reason-heading">Most common reasons</h2>
        <p>
          {reasonData[0]
            ? `The most common reason was "${reasonData[0].label}" (${reasonData[0].count} batches).`
            : 'No reason codes have been computed yet.'}
        </p>
        <div role="img" aria-label="Bar chart of flagged batch counts by quality-failure reason.">
          <ResponsiveContainer width="100%" height={Math.max(200, reasonData.length * 40)}>
            <BarChart data={reasonData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="code" width={110} fontSize={12} />
              <Tooltip formatter={(value: number, _name, item) => [value, item.payload.label]} />
              <Bar dataKey="count" name="Batches" fill="var(--chart-1)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <SourceLine generatedAt={insights.generatedAt} />
      </section>

      <section aria-labelledby="by-source-heading" style={{ marginBottom: '2rem' }}>
        <h2 id="by-source-heading">Reporting labs</h2>
        <p>
          {sourceData.length > 0
            ? `${sourceData.length} labs have reported flagged batches. The busiest, ${sourceData[0]?.label}, reported ${sourceData[0]?.count}.`
            : 'No reporting-source data has been computed yet.'}
        </p>
        <div role="img" aria-label="Bar chart of flagged batch counts by reporting lab.">
          <ResponsiveContainer width="100%" height={Math.max(200, sourceData.length * 40)}>
            <BarChart data={sourceData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} fontSize={12} />
              <YAxis type="category" dataKey="label" width={140} fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" name="Batches" fill="var(--chart-2)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <SourceLine generatedAt={insights.generatedAt} />
      </section>

      <section aria-labelledby="lag-heading">
        <h2 id="lag-heading">Timing</h2>
        <p>
          {insights.withinExpiry.rows > 0
            ? `${fmtPct(insights.withinExpiry.withinExpiryShare)} of flagged batches were still within their expiry date when CDSCO reported them.`
            : 'No timing data has been computed yet.'}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <caption style={{ textAlign: 'left', marginBottom: '0.5rem' }}>
            Months from manufacture to alert, and months remaining from alert to expiry (median, 10th/90th
            percentile, and longest seen)
          </caption>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}></th>
              <th style={{ textAlign: 'right' }}>Median</th>
              <th style={{ textAlign: 'right' }}>10th pct.</th>
              <th style={{ textAlign: 'right' }}>90th pct.</th>
              <th style={{ textAlign: 'right' }}>Longest</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Manufacture → alert</td>
              <td style={{ textAlign: 'right' }}>{insights.mfgToAlertLagMonths.median}</td>
              <td style={{ textAlign: 'right' }}>{insights.mfgToAlertLagMonths.p10}</td>
              <td style={{ textAlign: 'right' }}>{insights.mfgToAlertLagMonths.p90}</td>
              <td style={{ textAlign: 'right' }}>{insights.mfgToAlertLagMonths.max}</td>
            </tr>
            <tr>
              <td>Alert → expiry remaining</td>
              <td style={{ textAlign: 'right' }}>{insights.alertToExpiryRemainingMonths.median}</td>
              <td style={{ textAlign: 'right' }}>{insights.alertToExpiryRemainingMonths.p10}</td>
              <td style={{ textAlign: 'right' }}>{insights.alertToExpiryRemainingMonths.p90}</td>
              <td style={{ textAlign: 'right' }}>{insights.alertToExpiryRemainingMonths.max}</td>
            </tr>
          </tbody>
        </table>
        <SourceLine generatedAt={insights.generatedAt} />
      </section>
    </main>
  );
}
