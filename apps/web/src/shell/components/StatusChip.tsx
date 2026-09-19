import type { MedicineStatus } from '@asli/contracts';
import { Verdict } from './Verdict';

export interface StatusChipProps {
  tier: MedicineStatus;
}

/** Status is never colour-alone: drawn mark + words + ink, per docs/UX.md. */
export function StatusChip({ tier }: StatusChipProps) {
  return <Verdict tier={tier} />;
}
