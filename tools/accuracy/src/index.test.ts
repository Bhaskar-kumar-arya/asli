import { describe, expect, it } from 'vitest';
import { LabelSchema } from './index';

describe('accuracy harness public exports', () => {
  it('re-exports the label schema', () => {
    const label = LabelSchema.parse({
      kind: 'strip',
      truth: { batchNumber: 'GTL1258' },
      conditions: { foil: true, lighting: 'good', angle: 'flat', blur: false },
    });
    expect(label.kind).toBe('strip');
  });
});
