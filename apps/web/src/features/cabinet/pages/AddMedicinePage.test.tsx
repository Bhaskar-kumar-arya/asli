import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddMedicinePage } from './AddMedicinePage';
import { installMockFetch } from '../__fixtures__/mockFetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AddMedicinePage', () => {
  it('submits a manual entry and navigates to the new medicine', async () => {
    installMockFetch({
      '/v1/cabinets/cab-mom-001/medicines': () => ({
        status: 200,
        body: {
          medId: 'med-new-001',
          identity: { batchNumber: 'AB123', source: 'manual' },
          addedBy: 'user-asha-001',
          addedAt: '2026-09-18T00:00:00.000Z',
          latestTier: 'PENDING',
        },
      }),
    });

    render(
      <MemoryRouter initialEntries={['/cabinets/cab-mom-001/add-medicine']}>
        <Routes>
          <Route path="/cabinets/:cabinetId/add-medicine" element={<AddMedicinePage />} />
          <Route path="/cabinets/:cabinetId/medicines/:medId" element={<p>medicine detail placeholder</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/batch number/i), { target: { value: 'AB123' } });
    fireEvent.click(screen.getByRole('button', { name: /save to family medicines/i }));

    await waitFor(() => expect(screen.getByText(/medicine detail placeholder/i)).toBeInTheDocument());
  });
});
