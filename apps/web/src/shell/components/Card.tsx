import type { HTMLAttributes } from 'react';

/** A ruled block of the register, not a card: no radius, no shadow, no fill. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={['reg-block', className ?? ''].filter(Boolean).join(' ')} />;
}
