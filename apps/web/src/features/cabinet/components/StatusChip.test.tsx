import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusChip } from './StatusChip';

describe('StatusChip', () => {
  it('never renders "safe"-style wording for NO_ALERT_FOUND', () => {
    render(<StatusChip status="NO_ALERT_FOUND" />);
    const chip = screen.getByRole('status');
    expect(chip.textContent).toMatch(/no alert found/i);
    expect(chip.textContent?.toLowerCase()).not.toMatch(/safe|genuine|verified/);
  });

  it('shows a pending state for PENDING', () => {
    render(<StatusChip status="PENDING" />);
    expect(screen.getByRole('status').textContent).toMatch(/checking/i);
  });

  it('shows the alert-list wording for FLAGGED', () => {
    render(<StatusChip status="FLAGGED" />);
    expect(screen.getByRole('status').textContent).toMatch(/cdsco alert list/i);
  });
});
