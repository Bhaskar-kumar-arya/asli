import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomeMedicineList } from './HomeMedicineList';
import { cabinetDetailFixture, cabinetListFixture } from '../__fixtures__/cabinetDetail';
import { installMockFetch } from '../__fixtures__/mockFetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomeMedicineList', () => {
  it("lists every cabinet's medicines with status chips and reports the latest CDSCO update month", async () => {
    installMockFetch({
      '/v1/cabinets': () => ({ status: 200, body: cabinetListFixture }),
      '/v1/cabinets/cab-mom-001': () => ({ status: 200, body: cabinetDetailFixture }),
    });

    // The register's currency prints on the masthead, so the list reports it upward
    // rather than rendering it a second time on the same screen.
    const onSummary = vi.fn();

    render(
      <MemoryRouter>
        <HomeMedicineList onSummary={onSummary} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/mom - morning tablet/i)).toBeInTheDocument());
    expect(screen.getByText(/mom - fever tablet/i)).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(2);
    await waitFor(() => expect(onSummary).toHaveBeenCalledWith({ entryCount: 2, latestAlertMonth: '2025-05' }));

    // The cabinet sheet - and members and sharing behind it - had no entry point before.
    expect(screen.getByRole('link', { name: /Mom's medicines/i })).toHaveAttribute(
      'href',
      '/cabinets/cab-mom-001',
    );
  });

  it('shows a friendly error when the cabinet list fails to load', async () => {
    installMockFetch({
      '/v1/cabinets': () => ({ status: 500, body: { error: { code: 'INTERNAL', message: 'boom', requestId: 'r1' } } }),
    });

    render(
      <MemoryRouter>
        <HomeMedicineList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
