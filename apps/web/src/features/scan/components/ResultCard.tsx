import { useState } from 'react';
import type { CheckItemResult } from '@asli/contracts';
import { Button } from '../../../shell/components/Button';
import { Icon } from '../../../shell/components/Icon';
import { Verdict } from '../../../shell/components/Verdict';
import { ReportProblemButton } from '../../report';
import { getResultCopy } from '../lib/content';
import { playReadAloud } from '../lib/readAloud';
import { DemoLabel } from './DemoLabel';

const VERDICT_CLASS: Record<CheckItemResult['tier'], string> = {
  FLAGGED: 'reg-verdict reg-verdict--flagged',
  VERIFY: 'reg-verdict reg-verdict--verify',
  NO_ALERT_FOUND: 'reg-verdict',
};

export interface ResultCardProps {
  result: CheckItemResult;
  lang?: string;
  onSave?: () => void;
  saveLabel?: string;
}

/**
 * The entry as the register holds it: the batch is the largest ink on the sheet,
 * the stamp lands once, and every particular sits on the entry rather than
 * behind a disclosure.
 */
export function ResultCard({ result, lang = 'en', onSave, saveLabel = 'Save to family medicines' }: ResultCardProps) {
  const [reading, setReading] = useState(false);
  const copy = getResultCopy(result, lang);
  const match = result.matches[0];
  const batch = result.identity.batchNumber;

  async function handleReadAloud() {
    setReading(true);
    try {
      await playReadAloud(result.guidanceKey, lang, `${copy.title}. ${copy.body}`);
    } finally {
      setReading(false);
    }
  }

  return (
    <section className={VERDICT_CLASS[result.tier]}>
      {match?.demo ? <DemoLabel alertMonth={match.alertMonth} /> : null}

      <span className="reg-legend">Batch entered</span>
      <span className="reg-value--batch">{batch ?? '—'}</span>

      <div style={{ margin: '1.1rem 0 0.2rem' }}>
        <Verdict tier={result.tier} category={match?.category} large struck />
      </div>

      <h2 className="reg-verdict__title">{copy.title}</h2>
      <p className="reg-prose">{copy.body}</p>

      {match ? (
        <dl className="reg-particulars">
          <dt>Alert month</dt>
          <dd>{match.alertMonth}</dd>
          <dt>Reported by</dt>
          <dd>{match.reportingLab ?? match.reportingSource}</dd>
          <dt>Named on list</dt>
          <dd>{match.productName}</dd>
          <dt>Batch on list</dt>
          <dd>{match.batchRaw}</dd>
          <dt>Finding</dt>
          <dd>{match.reasonRaw}</dd>
          <dt>Source</dt>
          <dd>
            <a href={match.sourceUrl} target="_blank" rel="noreferrer">
              View CDSCO source <Icon name="source" size={15} />
            </a>
          </dd>
        </dl>
      ) : (
        <dl className="reg-particulars">
          <dt>Checked against</dt>
          <dd>
            {result.checkedAgainst.monthCount} CDSCO alert months, to {result.checkedAgainst.latestMonth}
          </dd>
        </dl>
      )}

      {copy.whatToDoNext.length > 0 ? (
        <div style={{ marginTop: '1.4rem' }}>
          <div className="reg-head" style={{ marginTop: 0 }}>
            <h3>What to do next</h3>
          </div>
          <ol className="reg-prose" style={{ margin: '0.7rem 0 0', paddingInlineStart: '1.3rem' }}>
            {copy.whatToDoNext.map((step) => (
              <li key={step} style={{ marginBottom: '0.45rem' }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="reg-stack">
        <Button variant="secondary" onClick={() => void handleReadAloud()} disabled={reading}>
          <Icon name="aloud" size={18} />
          {reading ? 'Reading…' : 'Read aloud'}
        </Button>
        {onSave ? (
          <Button variant="secondary" onClick={onSave}>
            {saveLabel}
          </Button>
        ) : null}
        <ReportProblemButton identity={result.identity} alertRef={match?.alertRef} />
      </div>
    </section>
  );
}
