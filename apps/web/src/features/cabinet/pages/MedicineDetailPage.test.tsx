import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MedicineDetailPage } from './MedicineDetailPage';
import { alertSummaryFixtures, cabinetDetailFixture } from '../__fixtures__/cabinetDetail';
import { installMockFetch } from '../__fixtures__/mockFetch';

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cabinets/:cabinetId/medicines/:medId" element={<MedicineDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MedicineDetailPage', () => {
  it('shows match history with source links and reason text', async () => {
    installMockFetch({
      '/v1/cabinets/cab-mom-001': () => ({ status: 200, body: cabinetDetailFixture }),
      '/v1/alerts/alert-nsq-001': () => ({ status: 200, body: alertSummaryFixtures['alert-nsq-001'] }),
      '/v1/alerts/alert-spurious-001': () => ({ status: 200, body: alertSummaryFixtures['alert-spurious-001'] }),
    });

    renderAt('/cabinets/cab-mom-001/medicines/med-glimepiride-001');

    await waitFor(() => expect(screen.getByText(/this batch is on a cdsco alert list/i)).toBeInTheDocument());
    expect(screen.getByText(/a batch with this label was reported as spurious/i)).toBeInTheDocument();
    expect(screen.getAllByText(/view cdsco source/i)).toHaveLength(2);
    expect(screen.getByText(/amount of active medicine was outside the allowed limit/i)).toBeInTheDocument();
  });

  it('highlights the match named in ?match= from a notification deep link', async () => {
    installMockFetch({
      '/v1/cabinets/cab-mom-001': () => ({ status: 200, body: cabinetDetailFixture }),
      '/v1/alerts/alert-nsq-001': () => ({ status: 200, body: alertSummaryFixtures['alert-nsq-001'] }),
      '/v1/alerts/alert-spurious-001': () => ({ status: 200, body: alertSummaryFixtures['alert-spurious-001'] }),
    });

    renderAt('/cabinets/cab-mom-001/medicines/med-glimepiride-001?match=alert-spurious-001');

    const highlighted = await screen.findByText(/a batch with this label was reported as spurious/i);
    expect(highlighted.closest('li')).toHaveAttribute('data-highlighted', 'true');
  });

  it('shows the API 403 message and disables Remove when a VIEWER tries to remove', async () => {
    installMockFetch({
      '/v1/cabinets/cab-mom-001': () => ({ status: 200, body: cabinetDetailFixture }),
      '/v1/alerts/alert-nsq-001': () => ({ status: 200, body: alertSummaryFixtures['alert-nsq-001'] }),
      '/v1/alerts/alert-spurious-001': () => ({ status: 200, body: alertSummaryFixtures['alert-spurious-001'] }),
      '/v1/cabinets/cab-mom-001/medicines/med-glimepiride-001': () => ({
        status: 403,
        body: {
          error: {
            code: 'FORBIDDEN',
            message: 'Only owners and editors can remove medicines',
            requestId: 'req-1',
          },
        },
      }),
    });

    renderAt('/cabinets/cab-mom-001/medicines/med-glimepiride-001');
    await waitFor(() => expect(screen.getByText(/this batch is on a cdsco alert list/i)).toBeInTheDocument());

    const removeButton = screen.getByRole('button', { name: /remove from family medicines/i });
    fireEvent.click(removeButton);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/only owners and editors can remove medicines/i),
    );
    expect(removeButton).toBeDisabled();
  });
});
