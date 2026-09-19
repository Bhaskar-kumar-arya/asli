import type { InputHTMLAttributes } from 'react';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  lowConfidence?: boolean;
  error?: string;
}

let idCounter = 0;

/** A rule you write on, with its printed legend above it. Never a box. */
export function Field({ label, hint, lowConfidence, error, id, className, ...props }: FieldProps) {
  const fieldId = id ?? `field-${(idCounter += 1)}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const noteId = lowConfidence && !error ? `${fieldId}-confidence` : undefined;
  const describedBy = [hintId, noteId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="reg-field">
      <label htmlFor={fieldId} className="reg-legend">
        {label}
        {props.required ? ' *' : ''}
      </label>
      <input
        {...props}
        id={fieldId}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error)}
        data-low-confidence={lowConfidence ? 'true' : undefined}
        className={['reg-field__input', className ?? ''].filter(Boolean).join(' ')}
      />
      {lowConfidence && !error ? (
        <p id={noteId} className="reg-note reg-note--verify">
          Please check this - we're not fully sure we read it right.
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className="reg-note">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="reg-note reg-note--flagged">
          {error}
        </p>
      ) : null}
    </div>
  );
}
