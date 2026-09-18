import type { InputHTMLAttributes } from 'react';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  lowConfidence?: boolean;
  error?: string;
}

let idCounter = 0;

export function Field({ label, hint, lowConfidence, error, id, ...props }: FieldProps) {
  const fieldId = id ?? `field-${(idCounter += 1)}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor={fieldId} style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
        {label}
        {props.required ? ' *' : ''}
      </label>
      <input
        {...props}
        id={fieldId}
        aria-describedby={hintId}
        aria-invalid={Boolean(error)}
        style={{
          width: '100%',
          minHeight: 'var(--tap-target-min)',
          padding: '0.6rem 0.75rem',
          borderRadius: '0.6rem',
          border: `2px solid ${error ? 'var(--color-danger)' : lowConfidence ? 'var(--color-verify-border)' : 'var(--color-border)'}`,
          background: lowConfidence ? 'var(--color-verify-bg)' : 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      />
      {lowConfidence && !error ? (
        <p style={{ color: 'var(--color-verify-text)', margin: '0.35rem 0 0', fontSize: '0.9em' }}>
          Please check this - we're not fully sure we read it right.
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} style={{ color: 'var(--color-text-muted)', margin: '0.35rem 0 0', fontSize: '0.9em' }}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)', margin: '0.35rem 0 0', fontSize: '0.9em' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
