import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MembersPage } from './MembersPage';
import { cabinetDetailFixture } from '../__fixtures__/cabinetDetail';
import { installMockFetch } from '../__fixtures__/mockFetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MembersPage', () => {
  it('lists members with their roles and can create an invite', async () => {
    installMockFetch({
      '/v1/cabinets/cab-mom-001': () => ({ status: 200, body: cabinetDetailFixture }),
      '/v1/cabinets/cab-mom-001/invites': () => ({
        status: 200,
        body: { code: '7F3K9Q', role: 'VIEWER', expiresAt: '2026-10-01T00:00:00.000Z' },
      }),
    });

    render(
      <MemoryRouter initialEntries={['/cabinets/cab-mom-001/members']}>
        <Routes>
          <Route path="/cabinets/:cabinetId/members" element={<MembersPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/user-asha-001 — OWNER/i)).toBeInTheDocument());
    expect(screen.getByText(/user-priya-003 — VIEWER/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /create invite/i }));

    await waitFor(() => expect(screen.getByText('7F3K9Q')).toBeInTheDocument());
  });
});
