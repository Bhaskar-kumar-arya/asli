import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'reg-btn reg-btn--primary',
  secondary: 'reg-btn',
  danger: 'reg-btn reg-btn--danger',
};

/** A struck rectangle. Printed matter, so no radius and no shadow. */
export function Button({ variant = 'primary', fullWidth, className, ...props }: ButtonProps) {
  const cls = [VARIANT_CLASS[variant], fullWidth ? 'reg-btn--wide' : '', className ?? ''].filter(Boolean).join(' ');
  return <button {...props} className={cls} />;
}
