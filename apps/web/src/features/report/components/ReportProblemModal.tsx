import { Fragment, useState } from 'react';
import type { MedicineIdentity, ProblemReportResponse } from '@asli/contracts';
import { Button } from '../../../shell/components/Button';
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
    <div className="reg-scrim" style={{ alignItems: 'flex-end', padding: 0 }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-problem-heading"
        className="reg-docket"
        style={{ maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h2 id="report-problem-heading">Report a problem with this medicine</h2>

        {result ? (
          <>
            <p className="reg-prose">
              Thanks. Your report is saved privately - here's how to also tell PvPI, the official channel:
            </p>
            <dl className="reg-particulars">
              <dt>How to report</dt>
              <dd>{result.pvpi.howToReport}</dd>
              {result.pvpi.links.map((link) => (
                <Fragment key={link}>
                  <dt>Link</dt>
                  <dd>
                    <a href={link} target="_blank" rel="noreferrer">
                      {link}
                    </a>
                  </dd>
                </Fragment>
              ))}
            </dl>
            <div className="reg-stack">
              <Button onClick={onClose} fullWidth>
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="reg-prose reg-prose--muted">
              Asli does not investigate reports. PvPI is the official channel.
            </p>

            <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.4rem' }}>
              <legend className="reg-legend">What kind of problem?</legend>
              {PROBLEM_TYPES.map((option) => (
                <label
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                    minHeight: 'var(--tap-target-min)',
                    borderBottom: '1px solid var(--rule)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="problemType"
                    value={option.value}
                    checked={problemType === option.value}
                    onChange={() => setProblemType(option.value)}
                    style={{ accentColor: 'var(--margin)', width: 18, height: 18 }}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>

            <div className="reg-field">
              <label htmlFor="report-note" className="reg-legend">
                Anything else? (optional)
              </label>
              <textarea
                id="report-note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 280))}
                maxLength={280}
                rows={3}
                className="reg-field__input"
                style={{ resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>

            <div style={{ marginBottom: '1.2rem' }}>
              <p className="reg-legend">Batch details, for the PvPI form</p>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  background: 'var(--sheet-sunk)',
                  borderTop: '1px solid var(--rule-strong)',
                  borderBottom: '1px solid var(--rule-strong)',
                  padding: '0.7rem 0.75rem',
                  margin: '0 0 0.7rem',
                  fontFamily: 'var(--face-record)',
                  fontSize: 'var(--step-small)',
                }}
              >
                {batchDetails}
              </pre>
              <Button variant="secondary" onClick={() => void handleCopy()} type="button">
                {copied ? 'Copied' : 'Copy batch details'}
              </Button>
            </div>

            {status === 'error' ? (
              <p role="alert" className="reg-note reg-note--flagged">
                Couldn't save your report. Please try again.
              </p>
            ) : null}

            <div className="reg-stack">
              <Button onClick={() => void handleSubmit()} disabled={status === 'submitting'} type="button">
                {status === 'submitting' ? 'Submitting…' : 'Submit'}
              </Button>
              <Button variant="secondary" onClick={onClose} type="button">
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
