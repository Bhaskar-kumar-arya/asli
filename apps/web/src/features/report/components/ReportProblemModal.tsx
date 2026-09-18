import { useState } from 'react';
import type { MedicineIdentity, ProblemReportResponse } from '@asli/contracts';
import { Button } from '../../../shell/components/Button';
import { Card } from '../../../shell/components/Card';
import { postProblemReport } from '../api/reports';
import { formatBatchDetails } from '../lib/formatBatchDetails';
import { PROBLEM_TYPES, type ProblemTypeValue } from '../problemTypes';

export interface ReportProblemModalProps {
  identity: MedicineIdentity;
  alertRef?: string;
  onClose: () => void;
}

/**
 * "Report a problem with this medicine" (plan/tasks/L-pvpi-report.md). Asli only forwards the
 * user to the official PvPI channel - it never investigates reports and never affects tiers
 * (CLAUDE.md rule 1; docs/SAFETY_AND_CONTENT.md wording rules).
 */
export function ReportProblemModal({ identity, alertRef, onClose }: ReportProblemModalProps) {
  const [problemType, setProblemType] = useState<ProblemTypeValue>('side_effect');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [result, setResult] = useState<ProblemReportResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const batchDetails = formatBatchDetails(identity);

  async function handleSubmit() {
    setStatus('submitting');
    try {
      const res = await postProblemReport({ identity, alertRef, problemType, note: note || undefined });
      setResult(res);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(batchDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied by the browser - the text is still shown for manual copy.
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-problem-heading"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', borderRadius: '1rem 1rem 0 0' }}>
        <h2 id="report-problem-heading" style={{ marginTop: 0 }}>
          Report a problem with this medicine
        </h2>

        {result ? (
          <>
            <p>Thanks. Your report is saved privately - here's how to also tell PvPI, the official channel:</p>
            <p style={{ fontWeight: 600 }}>{result.pvpi.howToReport}</p>
            <ul>
              {result.pvpi.links.map((link) => (
                <li key={link}>
                  <a href={link} target="_blank" rel="noreferrer">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
            <Button onClick={onClose} fullWidth>
              Done
            </Button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Asli does not investigate reports. PvPI is the official channel.
            </p>

            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1rem' }}>
              <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>What kind of problem?</legend>
              {PROBLEM_TYPES.map((option) => (
                <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0' }}>
                  <input
                    type="radio"
                    name="problemType"
                    value={option.value}
                    checked={problemType === option.value}
                    onChange={() => setProblemType(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>

            <label htmlFor="report-note" style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
              Anything else? (optional)
            </label>
            <textarea
              id="report-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 280))}
              maxLength={280}
              rows={3}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '0.6rem',
                border: '2px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                marginBottom: '1rem',
              }}
            />

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Batch details, for the PvPI form</p>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.6rem',
                  padding: '0.6rem 0.75rem',
                  margin: '0 0 0.5rem',
                }}
              >
                {batchDetails}
              </pre>
              <Button variant="secondary" onClick={() => void handleCopy()} type="button">
                {copied ? 'Copied' : 'Copy batch details'}
              </Button>
            </div>

            {status === 'error' ? (
              <p role="alert" style={{ color: 'var(--color-danger)' }}>
                Couldn't save your report. Please try again.
              </p>
            ) : null}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="secondary" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={status === 'submitting'} fullWidth type="button">
                {status === 'submitting' ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
