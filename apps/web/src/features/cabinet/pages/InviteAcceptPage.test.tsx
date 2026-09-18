import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InviteAcceptPage } from './InviteAcceptPage';
import { CabinetPage } from './CabinetPage';
import { cabinetDetailFixture } from '../__fixtures__/cabinetDetail';
import { installMockFetch } from '../__fixtures__/mockFetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('InviteAcceptPage', () => {
  it('accepting a valid code lands on the cabinet screen', async () => {
    installMockFetch({
      '/v1/invites/7F3K9Q/accept': () => ({ status: 200, body: cabinetDetailFixture.cabinet }),
      '/v1/cabinets/cab-mom-001': () => ({ status: 200, body: cabinetDetailFixture }),
    });

    render(
      <MemoryRouter initialEntries={['/invite/7F3K9Q']}>
        <Routes>
          <Route path="/invite/:code" element={<InviteAcceptPage />} />
          <Route path="/cabinets/:cabinetId" element={<CabinetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /accept invite/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /mom's medicines/i })).toBeInTheDocument());
  });

  it('shows an error for an invalid code', async () => {
    installMockFetch({
      '/v1/invites/BADCODE/accept': () => ({
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'not found', requestId: 'r1' } },
      }),
    });

    render(
      <MemoryRouter initialEntries={['/invite/BADCODE']}>
        <Routes>
          <Route path="/invite/:code" element={<InviteAcceptPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /accept invite/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/invalid or has expired/i));
  });
});
