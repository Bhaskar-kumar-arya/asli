import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CabinetPage } from './CabinetPage';
import { cabinetDetailFixture } from '../__fixtures__/cabinetDetail';
import { installMockFetch } from '../__fixtures__/mockFetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CabinetPage', () => {
  it('groups medicines by forPerson', async () => {
    installMockFetch({
      '/v1/cabinets/cab-mom-001': () => ({ status: 200, body: cabinetDetailFixture }),
    });

    render(
      <MemoryRouter initialEntries={['/cabinets/cab-mom-001']}>
        <Routes>
          <Route path="/cabinets/:cabinetId" element={<CabinetPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: /mom's medicines/i })).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Mom' })).toBeInTheDocument();
    expect(screen.getByText(/members \(3\)/i)).toBeInTheDocument();
  });
});
