import type { MedicineStatus } from '@asli/contracts';
import { Verdict } from '../../../shell/components/Verdict';
import { tierCopy } from '../lib/tierCopy';

/** The register's mark, with the reviewed tier wording printed beneath it. */
export function StatusChip({ status }: { status: MedicineStatus }) {
  return <Verdict tier={status} note={tierCopy(status).label} role="status" />;
}
