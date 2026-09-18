import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicStats } from '@asli/contracts';
import { InsightsPage } from './InsightsPage';
import type { InsightsDetail } from '../types';

afterEach(() => {
  vi.unstubAllGlobals();
});

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one to mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const statsFixture: PublicStats = {
  generatedAt: '2026-09-17T00:00:00.000Z',
  monthsCovered: 2,
  latestMonth: '2025-03',
  totalFlaggedBatches: 3,
  cabinetsProtected: 5,
  medicinesTracked: 12,
};

const insightsFixture: InsightsDetail = {
  generatedAt: '2026-09-17T00:00:00.000Z',
  byCategory: { NSQ: 2, SPURIOUS: 1 },
  byMonth: [
    { month: '2025-01', count: 2 },
    { month: '2025-03', count: 1 },
  ],
  topReasonCodes: [
    { reasonCode: 'ASSAY', count: 2 },
    { reasonCode: 'DISSOLUTION', count: 1 },
  ],
  byMonthCategory: [
    { month: '2025-01', NSQ: 1, SPURIOUS: 1 },
    { month: '2025-03', NSQ: 1, SPURIOUS: 0 },
  ],
  byReportingSource: [
    { reportingSource: 'Central Drugs Lab', count: 2 },
    { reportingSource: 'State Drugs Lab', count: 1 },
  ],
  withinExpiry: { rows: 3, withinExpiry: 2, missingExpiry: 0, withinExpiryShare: 2 / 3 },
  mfgToAlertLagMonths: { n: 3, mean: 10, median: 10, p10: 5, p90: 15, max: 20 },
  alertToExpiryRemainingMonths: { n: 3, mean: 6, median: 6, p10: 2, p90: 10, max: 12 },
};

function mockFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) => {
      const body = url.includes('/public/stats') ? statsFixture : insightsFixture;
      return Promise.resolve({ status: 200, ok: true, json: async () => body });
    }),
  );
}

describe('InsightsPage', () => {
  it('renders headline cards and chart summaries from the public insights endpoints', async () => {
    mockFetch();

    render(<InsightsPage />);

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument());
    expect(screen.getByText('Families protected').closest('div')).toHaveTextContent('5');
    expect(screen.getByText(/1 Not-of-Standard-Quality and 0 spurious/)).toBeInTheDocument();
    expect(screen.getByText(/most common reason was "The amount of active medicine/)).toBeInTheDocument();
    expect(screen.getByText(/67% of flagged batches/)).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<InsightsPage />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
