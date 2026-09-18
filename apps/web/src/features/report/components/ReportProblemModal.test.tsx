import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MedicineIdentity, ProblemReportResponse } from '@asli/contracts';
import { ReportProblemModal } from './ReportProblemModal';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchJson(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status,
      ok: status < 400,
      json: async () => body,
    }),
  );
}

const identity: MedicineIdentity = {
  productName: 'Paracetamol 500mg',
  batchNumber: 'GTL1258',
  manufacturer: 'Acme Pharma',
  source: 'manual',
};

const pvpiResponse: ProblemReportResponse = {
  pvpi: {
    howToReport: 'Call the PvPI toll-free helpline 1800-180-3024.',
    links: ['https://www.ipc.gov.in/PvPI/adr.html'],
  },
};

describe('ReportProblemModal', () => {
  it('never says the medicine is safe or genuine anywhere in its copy', () => {
    render(<ReportProblemModal identity={identity} onClose={vi.fn()} />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/\bsafe\b/i);
    expect(text).not.toMatch(/\bgenuine\b/i);
    expect(text).toMatch(/Asli does not investigate reports\. PvPI is the official channel\./);
  });

  it('shows the batch details for copying', () => {
    render(<ReportProblemModal identity={identity} onClose={vi.fn()} />);
    expect(screen.getByText(/Batch number: GTL1258/)).toBeInTheDocument();
    expect(screen.getByText(/Acme Pharma/)).toBeInTheDocument();
  });

  it('submits the chosen problem type and shows PvPI routes on success', async () => {
    mockFetchJson(201, pvpiResponse);
    render(<ReportProblemModal identity={identity} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Packaging problem'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(screen.getByText(/1800-180-3024/)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /ipc\.gov\.in/ })).toHaveAttribute(
      'href',
      'https://www.ipc.gov.in/PvPI/adr.html',
    );

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(init.body as string) as { problemType: string };
    expect(sentBody.problemType).toBe('packaging_problem');
  });

  it('shows an error and keeps the form open when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    render(<ReportProblemModal identity={identity} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText(/1800-180-3024/)).not.toBeInTheDocument();
  });
});
