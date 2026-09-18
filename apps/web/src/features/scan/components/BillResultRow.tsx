import type { CheckItemResult } from '@asli/contracts';
import { StatusChip } from '../../../shell/components/StatusChip';
import { Card } from '../../../shell/components/Card';
import { Button } from '../../../shell/components/Button';

export interface BillResultRowProps {
  result: CheckItemResult;
  onOpen: () => void;
}

export function BillResultRow({ result, onOpen }: BillResultRowProps) {
  return (
    <Card style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
      <div>
        <p style={{ margin: '0 0 0.35rem', fontWeight: 600 }}>{result.identity.productName ?? 'Unnamed item'}</p>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9em' }}>
          Batch {result.identity.batchNumber}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <StatusChip tier={result.tier} />
        <Button variant="secondary" onClick={onOpen}>
          View
        </Button>
      </div>
    </Card>
  );
}
