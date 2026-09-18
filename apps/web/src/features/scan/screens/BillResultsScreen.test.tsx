import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BillResultsScreen } from './BillResultsScreen';
import { ScanFlowProvider, useScanFlow } from '../lib/scanFlow';
import { scanFixtures } from '../../../mocks/fixtures';

const nsq = scanFixtures.find((f) => f.state === 'FLAGGED_NSQ')!.response.results[0]!;
const noAlert = scanFixtures.find((f) => f.state === 'NO_ALERT_FOUND')!.response.results[0]!;

function Harness() {
  const { setResults } = useScanFlow();
  useEffect(() => {
    setResults([nsq, noAlert], ['NO_BATCH_ON_LINE'], true);
  }, [setResults]);
  return <BillResultsScreen />;
}

describe('BillResultsScreen', () => {
  it('lists every line with a status chip and offers to add a strip photo for unread lines', async () => {
    render(
      <MemoryRouter>
        <ScanFlowProvider>
          <Harness />
        </ScanFlowProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText(nsq.identity.productName!)).toBeInTheDocument();
    expect(screen.getByText(noAlert.identity.productName!)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add strip photo/i })).toBeInTheDocument();
  });

  it('opens a single line result and shows its guidance', async () => {
    render(
      <MemoryRouter>
        <ScanFlowProvider>
          <Harness />
        </ScanFlowProvider>
      </MemoryRouter>,
    );

    const viewButtons = await screen.findAllByRole('button', { name: /view/i });
    await userEvent.click(viewButtons[0]!);
    expect(screen.getByText(/this batch is on a cdsco alert list/i)).toBeInTheDocument();
  });
});
