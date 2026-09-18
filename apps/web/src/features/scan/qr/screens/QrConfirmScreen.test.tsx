import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { MedicineIdentity } from '@asli/contracts';
import { QrConfirmScreen } from './QrConfirmScreen';
import { scanFixtures } from '../../../../mocks/fixtures';

const { createCheck } = vi.hoisted(() => ({ createCheck: vi.fn() }));
vi.mock('../../../../api/endpoints', () => ({ api: { createCheck } }));

const identity: MedicineIdentity = {
  batchNumber: 'GTL1258',
  productName: 'Amoxicillin',
  manufacturer: 'Cipla Ltd',
  expMonth: '2025-06',
  source: 'qr',
};

const { setResultsMock } = vi.hoisted(() => ({ setResultsMock: vi.fn() }));
vi.mock('../../lib/scanFlow', () => ({
  useScanFlow: () => ({ pendingConfirm: { identity, method: 'qr' }, setResults: setResultsMock }),
}));

describe('QrConfirmScreen', () => {
  it('prefills from the decoded identity and submits with source qr', async () => {
    const nsq = scanFixtures.find((f) => f.state === 'FLAGGED_NSQ')!.response.results[0]!;
    createCheck.mockResolvedValueOnce({ results: [{ ...nsq, identity }] });

    render(
      <MemoryRouter initialEntries={['/scan/qr/confirm']}>
        <Routes>
          <Route path="/scan/qr/confirm" element={<QrConfirmScreen />} />
          <Route path="/scan/result" element={<div>result screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/batch number/i)).toHaveValue('GTL1258');
    await userEvent.click(screen.getByRole('button', { name: /looks right/i }));

    expect(await screen.findByText(/result screen/i)).toBeInTheDocument();
    expect(createCheck).toHaveBeenCalledWith({
      items: [expect.objectContaining({ batchNumber: 'GTL1258', source: 'qr' })],
    });
  });
});
