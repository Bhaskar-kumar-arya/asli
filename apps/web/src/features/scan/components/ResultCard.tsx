import { useState } from 'react';
import type { CheckItemResult } from '@asli/contracts';
import { Button } from '../../../shell/components/Button';
import { getResultCopy } from '../lib/content';
import { playReadAloud } from '../lib/readAloud';
import { DemoLabel } from './DemoLabel';

const TIER_STYLE: Record<CheckItemResult['tier'], { bg: string; text: string; border: string; icon: string }> = {
  FLAGGED: { bg: 'var(--color-flagged-bg)', text: 'var(--color-flagged-text)', border: 'var(--color-flagged-border)', icon: '⚠' },
  VERIFY: { bg: 'var(--color-verify-bg)', text: 'var(--color-verify-text)', border: 'var(--color-verify-border)', icon: '❓' },
  NO_ALERT_FOUND: { bg: 'var(--color-no-alert-bg)', text: 'var(--color-no-alert-text)', border: 'var(--color-no-alert-border)', icon: '🔍' },
};

export interface ResultCardProps {
  result: CheckItemResult;
  lang?: string;
  onSave?: () => void;
  saveLabel?: string;
}

export function ResultCard({ result, lang = 'en', onSave, saveLabel = 'Save to family medicines' }: ResultCardProps) {
  const [reading, setReading] = useState(false);
  const copy = getResultCopy(result);
  const style = TIER_STYLE[result.tier];
  const match = result.matches[0];

  async function handleReadAloud() {
    setReading(true);
    try {
      await playReadAloud(result.guidanceKey, lang, `${copy.title}. ${copy.body}`);
    } finally {
      setReading(false);
    }
  }

  return (
    <section
      style={{
        background: style.bg,
        color: style.text,
        border: `2px solid ${style.border}`,
        borderRadius: '1rem',
        padding: '1.25rem',
        animation: 'asli-result-in 250ms ease-out',
      }}
    >
      {match?.demo ? <DemoLabel alertMonth={match.alertMonth} /> : null}
      <h2 style={{ margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span aria-hidden="true">{style.icon}</span>
        {copy.title}
      </h2>
      <p style={{ margin: '0 0 1rem' }}>{copy.body}</p>

      {match ? (
        <p style={{ fontSize: '0.9em', margin: '0 0 1rem' }}>
          Source: CDSCO, {match.reportingLab ?? match.reportingSource}.{' '}
          <a href={match.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
            View CDSCO source
          </a>
        </p>
      ) : null}

      {copy.whatToDoNext.length > 0 ? (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.4rem' }}>What to do next</h3>
          <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {copy.whatToDoNext.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={() => void handleReadAloud()} disabled={reading} style={{ color: 'inherit', borderColor: 'currentcolor' }}>
          {reading ? 'Reading…' : '🔊 Read aloud'}
        </Button>
        {onSave ? (
          <Button variant="secondary" onClick={onSave} style={{ color: 'inherit', borderColor: 'currentcolor' }}>
            {saveLabel}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
