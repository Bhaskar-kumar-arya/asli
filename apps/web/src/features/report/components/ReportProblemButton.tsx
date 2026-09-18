import { useState } from 'react';
import type { MedicineIdentity } from '@asli/contracts';
import { Button } from '../../../shell/components/Button';
import { ReportProblemModal } from './ReportProblemModal';

export interface ReportProblemButtonProps {
  identity: MedicineIdentity;
  alertRef?: string;
}

/**
 * Drop-in "Report a problem with this medicine" entry point (plan/tasks/L-pvpi-report.md
 * deliverable 2) for the result screen (apps/web/src/features/scan) and medicine detail screen
 * (apps/web/src/features/cabinet). Lane L owns only apps/web/src/features/report/**, so those
 * screens import this component rather than lane L editing files it doesn't own.
 */
export function ReportProblemButton({ identity, alertRef }: ReportProblemButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} type="button">
        Report a problem
      </Button>
      {open ? <ReportProblemModal identity={identity} alertRef={alertRef} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
