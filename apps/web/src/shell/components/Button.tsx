import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const variantStyle: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-primary)',
    color: 'var(--color-primary-text)',
    border: '1px solid var(--color-primary)',
  },
  secondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
  },
  danger: {
    background: 'var(--color-bg)',
    color: 'var(--color-danger)',
    border: '2px solid var(--color-danger)',
  },
};

export function Button({ variant = 'primary', fullWidth, style, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        minHeight: 'var(--tap-target-min)',
        minWidth: 'var(--tap-target-min)',
        padding: '0.75rem 1.25rem',
        borderRadius: '0.75rem',
        fontWeight: 600,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
        width: fullWidth ? '100%' : undefined,
        ...variantStyle[variant],
        ...style,
      }}
    />
  );
}
