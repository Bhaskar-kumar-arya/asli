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
  it("lists every cabinet's medicines with status chips and the latest CDSCO update month", async () => {
    installMockFetch({
      '/v1/cabinets': () => ({ status: 200, body: cabinetListFixture }),
      '/v1/cabinets/cab-mom-001': () => ({ status: 200, body: cabinetDetailFixture }),
    });

    render(
      <MemoryRouter>
        <HomeMedicineList />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/mom - morning tablet/i)).toBeInTheDocument());
    expect(screen.getByText(/mom - fever tablet/i)).toBeInTheDocument();
    expect(screen.getByText(/last cdsco update: may 2025/i)).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(2);
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
