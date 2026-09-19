import type { CheckItemResult } from '@asli/contracts';
import { Verdict } from '../../../shell/components/Verdict';
import { Button } from '../../../shell/components/Button';

export interface BillResultRowProps {
  result: CheckItemResult;
  onOpen: () => void;
}

/** One line of the bill, entered on its own rule. */
export function BillResultRow({ result, onOpen }: BillResultRowProps) {
  return (
    <div className="cabinet-medicine-row">
      <span className="reg-grow">
        <span style={{ display: 'block', fontWeight: 700, fontSize: 'var(--step-body)' }}>
          {result.identity.productName ?? 'Unnamed item'}
        </span>
        <span className="reg-value" style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--text-2)' }}>
          Batch {result.identity.batchNumber}
        </span>
      </span>
      <span style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Verdict tier={result.tier} category={result.matches[0]?.category} />
        <Button variant="secondary" onClick={onOpen}>
          View
        </Button>
      </span>
    </div>
  );
}
