import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PharmacyCheckResponse } from '@asli/contracts';
import { PharmacyPage } from './PharmacyPage';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchByPath(routes: Record<string, { status: number; body: unknown }>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      const path = new URL(url, 'http://localhost').pathname;
      const route = routes[path];
      if (!route) throw new Error(`No mock route for ${path}`);
      return new Response(JSON.stringify(route.body), { status: route.status });
    }),
  );
}

const response: PharmacyCheckResponse = {
  rows: [
    {
      identity: { productName: 'Paracetamol', batchNumber: 'GTL1258', manufacturer: 'Cipla', quantity: 10, source: 'pharmacy_csv' },
      tier: 'FLAGGED',
      reasonCodes: ['BATCH_EXACT'],
      matches: [
        {
          alertRef: 'a1',
          alertMonth: '2026-01',
          category: 'NSQ',
          productName: 'Paracetamol',
          batchRaw: 'GTL1258',
          manufacturerRaw: 'Cipla',
          reasonCode: 'ASSAY',
          reasonRaw: 'assay',
          reportingSource: 'CDSCO',
          sourceUrl: 'https://cdsco.gov.in/alert/a1',
          demo: false,
        },
      ],
      checkedAgainst: { monthCount: 3, latestMonth: '2026-01' },
      guidanceKey: 'result.flagged.nsq',
      quantity: 10,
    },
  ],
  flaggedUnits: 10,
};

describe('PharmacyPage', () => {
  it('checks an uploaded CSV and shows the results table with flagged units', async () => {
    mockFetchByPath({ '/v1/pharmacy/checks': { status: 200, body: response } });

    render(<PharmacyPage />);

    const file = new File(['batch,quantity\nGTL1258,10'], 'stock.csv', { type: 'text/csv' });
    const csvInput = document.querySelector('input[type="file"][accept*="csv"]') as HTMLInputElement;
    fireEvent.change(csvInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('GTL1258')).toBeInTheDocument());
    expect(screen.getByText(/1 rows checked/)).toBeInTheDocument();
    expect(screen.getByText(/10 flagged units/)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // quantity cell
  });

  it('shows an error message when the check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<PharmacyPage />);
    const file = new File(['batch\nGTL1258'], 'stock.csv', { type: 'text/csv' });
    const csvInput = document.querySelector('input[type="file"][accept*="csv"]') as HTMLInputElement;
    fireEvent.change(csvInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
