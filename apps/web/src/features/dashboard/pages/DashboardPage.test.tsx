import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import type { DashboardMetrics } from '../types';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchJson(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => body,
    }),
  );
}

const fixture: DashboardMetrics = {
  accuracy: { sampleSize: 40, measuredAt: '2026-09-17T12:00:00.000Z' },
  cost: { costPer1000ScansUsd: 1.2345, measuredAt: '2026-09-18T00:00:00.000Z' },
  accuracyDetail: {
    runId: 'r1',
    measuredAt: '2026-09-17T12:00:00.000Z',
    tierCorrectnessRate: 0.9,
    byMethod: [{ method: 'strip_vision', count: 30, batchExactRate: 0.9 }],
    byCondition: [{ condition: 'lighting', value: 'poor', count: 5, batchExactRate: 0.6 }],
  },
  costDetail: {
    window: { start: '2026-09-17T00:00:00.000Z', end: '2026-09-18T00:00:00.000Z' },
    scanCount: 100,
    perScanUsd: { totalUsd: 0.001234 },
    perIngestionRun: { rows: 50, totalUsd: 0.5 },
    tenThousandFamilyProjection: {
      assumptions: {
        projectedFamilies: 10_000,
        avgMedicinesPerFamily: 5,
        scansPerFamilyPerMonth: 2,
        newAlertFanoutsPerMonth: 4,
        familiesNotifiedPerFanout: 50,
        notificationsPerFamily: 2,
      },
      totalUsd: 123.45,
    },
  },
};

describe('DashboardPage', () => {
  it('renders accuracy breakdown and cost cards from the public metrics endpoint', async () => {
    mockFetchJson(fixture);

    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText(/Sample size: 40/)).toBeInTheDocument());
    expect(screen.getByText('strip_vision')).toBeInTheDocument();
    expect(screen.getByText('lighting=poor')).toBeInTheDocument();
    expect(screen.getByText('$0.0012')).toBeInTheDocument();
    expect(screen.getByText('$1.2345')).toBeInTheDocument();
    expect(screen.getByText('50 rows ingested')).toBeInTheDocument();
  });

  it('shows a fallback message when no accuracy run has been uploaded yet', async () => {
    mockFetchJson({ ...fixture, accuracyDetail: undefined });

    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText(/No accuracy run has been uploaded yet/)).toBeInTheDocument());
  });

  it('shows an error message when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
