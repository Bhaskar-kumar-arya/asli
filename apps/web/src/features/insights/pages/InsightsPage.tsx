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
  return <p className="reg-annotation">Source: CDSCO alerts, computed by Asli on {fmtDate(generatedAt)}</p>;
}

const AXIS = { fill: 'var(--text-2)', fontFamily: 'var(--face-record)' } as const;

const TOOLTIP = {
  background: 'var(--sheet)',
  border: '1px solid var(--text)',
  borderRadius: 0,
  fontFamily: 'var(--face-record)',
  fontSize: '0.85rem',
  color: 'var(--text)',
} as const;

const LEGEND = { fontFamily: 'var(--face-print)', fontSize: '0.8rem' } as const;

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

  if (error)
    return (
      <main className="reg-sheet reg-sheet--wide">
        <p role="alert" className="reg-line reg-line--flagged" style={{ textTransform: 'none', marginTop: '1.5rem' }}>
          {error}
        </p>
      </main>
    );
  if (!stats || !insights)
    return (
      <main className="reg-sheet reg-sheet--wide">
        <p className="reg-line" style={{ marginTop: '1.5rem' }}>
          <span className="reg-line__ellipsis">Compiling the return</span>
        </p>
      </main>
    );

  const monthData = insights.byMonthCategory.map((m) => ({ ...m, monthLabel: fmtMonth(m.month) }));
  const reasonData = insights.topReasonCodes
    .slice(0, 8)
    .map((r) => ({ code: r.reasonCode, label: reasonLabel(r.reasonCode), count: r.count }));
  const sourceData = insights.byReportingSource.map((s) => ({ ...s, label: s.reportingSource }));
  const latestMonthEntry = monthData[monthData.length - 1];

  return (
    <main className="reg-sheet reg-sheet--wide">
      <header className="reg-masthead">
        <h1>CDSCO alerts, at a glance</h1>
        <p className="reg-masthead__currency">Summary of record · {fmtMonth(stats.latestMonth)}</p>
      </header>

      <p className="reg-prose">
        This does not certify any medicine as safe. It summarises batches CDSCO has already reported as Not of
        Standard Quality or spurious.
      </p>

      <dl className="reg-particulars" style={{ marginTop: '1.4rem' }}>
        <dt>Flagged batches</dt>
        <dd>{stats.totalFlaggedBatches}</dd>
        <dt>Months covered</dt>
        <dd>{stats.monthsCovered}</dd>
        <dt>Latest CDSCO list</dt>
        <dd>{fmtMonth(stats.latestMonth)}</dd>
        <dt>Families protected</dt>
        <dd>{stats.cabinetsProtected}</dd>
      </dl>

      <section aria-labelledby="by-month-heading">
        <div className="reg-head">
          <h2 id="by-month-heading">Flagged batches per month</h2>
        </div>
        <p className="reg-prose" style={{ marginTop: '0.8rem' }}>
          {latestMonthEntry
            ? `In ${latestMonthEntry.monthLabel}, CDSCO reported ${latestMonthEntry.NSQ} Not-of-Standard-Quality and ${latestMonthEntry.SPURIOUS} spurious batches. Totals across all ${monthData.length} covered months are shown below.`
            : 'No months have been computed yet.'}
        </p>
        <div role="img" aria-label={`Bar chart of flagged batches per month, split by Not of Standard Quality and spurious, across ${monthData.length} months.`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="monthLabel" fontSize={11} tick={AXIS} stroke="var(--rule-strong)" />
              <YAxis allowDecimals={false} fontSize={11} tick={AXIS} stroke="var(--rule-strong)" />
              <Tooltip contentStyle={TOOLTIP} />
              <Legend wrapperStyle={LEGEND} />
              <Bar dataKey="NSQ" name="Not of Standard Quality" stackId="a" fill="var(--chart-1)" />
              <Bar dataKey="SPURIOUS" name="Spurious" stackId="a" fill="var(--chart-2)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="reg-details">
          <summary>Table of month-by-month counts</summary>
          <div className="reg-table-scroll">
            <table className="reg-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th data-num>NSQ</th>
                  <th data-num>Spurious</th>
                </tr>
              </thead>
              <tbody>
                {monthData.map((m) => (
                  <tr key={m.month}>
                    <td>{m.monthLabel}</td>
                    <td data-num>{m.NSQ}</td>
                    <td data-num>{m.SPURIOUS}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <SourceLine generatedAt={insights.generatedAt} />
      </section>

      <section aria-labelledby="by-reason-heading">
        <div className="reg-head">
          <h2 id="by-reason-heading">Most common reasons</h2>
        </div>
        <p className="reg-prose" style={{ marginTop: '0.8rem' }}>
          {reasonData[0]
            ? `The most common reason was "${reasonData[0].label}" (${reasonData[0].count} batches).`
            : 'No reason codes have been computed yet.'}
        </p>
        <div role="img" aria-label="Bar chart of flagged batch counts by quality-failure reason.">
          <ResponsiveContainer width="100%" height={Math.max(200, reasonData.length * 40)}>
            <BarChart data={reasonData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 4" horizontal={false} />
              <XAxis type="number" allowDecimals={false} fontSize={11} tick={AXIS} stroke="var(--rule-strong)" />
              <YAxis type="category" dataKey="code" width={110} fontSize={11} tick={AXIS} stroke="var(--rule-strong)" />
              <Tooltip contentStyle={TOOLTIP} formatter={(value: number, _name, item) => [value, item.payload.label]} />
              <Bar dataKey="count" name="Batches" fill="var(--chart-1)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <SourceLine generatedAt={insights.generatedAt} />
      </section>

      <section aria-labelledby="by-source-heading">
        <div className="reg-head">
          <h2 id="by-source-heading">Reporting labs</h2>
        </div>
        <p className="reg-prose" style={{ marginTop: '0.8rem' }}>
          {sourceData.length > 0
            ? `${sourceData.length} labs have reported flagged batches. The busiest, ${sourceData[0]?.label}, reported ${sourceData[0]?.count}.`
            : 'No reporting-source data has been computed yet.'}
        </p>
        <div role="img" aria-label="Bar chart of flagged batch counts by reporting lab.">
          <ResponsiveContainer width="100%" height={Math.max(200, sourceData.length * 40)}>
            <BarChart data={sourceData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 4" horizontal={false} />
              <XAxis type="number" allowDecimals={false} fontSize={11} tick={AXIS} stroke="var(--rule-strong)" />
              <YAxis type="category" dataKey="label" width={140} fontSize={11} tick={AXIS} stroke="var(--rule-strong)" />
              <Tooltip contentStyle={TOOLTIP} />
              <Bar dataKey="count" name="Batches" fill="var(--chart-2)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <SourceLine generatedAt={insights.generatedAt} />
      </section>

      <section aria-labelledby="lag-heading">
        <div className="reg-head">
          <h2 id="lag-heading">Timing</h2>
        </div>
        <p className="reg-prose" style={{ marginTop: '0.8rem' }}>
          {insights.withinExpiry.rows > 0
            ? `${fmtPct(insights.withinExpiry.withinExpiryShare)} of flagged batches were still within their expiry date when CDSCO reported them.`
            : 'No timing data has been computed yet.'}
        </p>
        <div className="reg-table-scroll">
          <table className="reg-table">
            <caption>
              Months from manufacture to alert, and months remaining from alert to expiry (median, 10th/90th
              percentile, and longest seen)
            </caption>
            <thead>
              <tr>
                <th></th>
                <th data-num>Median</th>
                <th data-num>10th pct.</th>
                <th data-num>90th pct.</th>
                <th data-num>Longest</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Manufacture → alert</td>
                <td data-num>{insights.mfgToAlertLagMonths.median}</td>
                <td data-num>{insights.mfgToAlertLagMonths.p10}</td>
                <td data-num>{insights.mfgToAlertLagMonths.p90}</td>
                <td data-num>{insights.mfgToAlertLagMonths.max}</td>
              </tr>
              <tr>
                <td>Alert → expiry remaining</td>
                <td data-num>{insights.alertToExpiryRemainingMonths.median}</td>
                <td data-num>{insights.alertToExpiryRemainingMonths.p10}</td>
                <td data-num>{insights.alertToExpiryRemainingMonths.p90}</td>
                <td data-num>{insights.alertToExpiryRemainingMonths.max}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <SourceLine generatedAt={insights.generatedAt} />
      </section>
    </main>
  );
}
