import type { MedicineStatus } from '@asli/contracts';
import { tierCopy } from '../lib/tierCopy';

export function StatusChip({ status }: { status: MedicineStatus }) {
  const copy = tierCopy(status);
  return (
    <span className="status-chip" style={{ color: copy.colorVar }} role="status">
      <span aria-hidden="true">{copy.icon}</span>
      {copy.label}
    </span>
  );
}
