import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QrScanScreen } from './QrScanScreen';
import { QrConfirmScreen } from './QrConfirmScreen';
import { ScanFlowProvider } from '../../lib/scanFlow';

const { decodeQrFromFile } = vi.hoisted(() => ({ decodeQrFromFile: vi.fn() }));
vi.mock('../lib/decodeQr', () => ({ decodeQrFromFile }));

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/scan/qr']}>
      <ScanFlowProvider>
        <Routes>
          <Route path="/scan/qr" element={<QrScanScreen />} />
          <Route path="/scan/qr/confirm" element={<QrConfirmScreen />} />
        </Routes>
      </ScanFlowProvider>
    </MemoryRouter>,
  );
}

async function pickFile() {
  const file = new File(['fake-image-bytes'], 'pack.jpg', { type: 'image/jpeg' });
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await userEvent.upload(input, file);
}

describe('QrScanScreen', () => {
  it('decodes a recognized GS1 payload and prefills the confirm form', async () => {
    decodeQrFromFile.mockResolvedValueOnce('(01)08904004401234(17)250630(10)GTL1258');
    renderScreen();

    await pickFile();

    expect(await screen.findByText(/confirm details/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/batch number/i)).toHaveValue('GTL1258');
  });

  it('shows the raw text and a strip-photo fallback for an unrecognized payload', async () => {
    decodeQrFromFile.mockResolvedValueOnce('some opaque manufacturer code');
    renderScreen();

    await pickFile();

    expect(await screen.findByText(/couldn't make sense of the details/i)).toBeInTheDocument();
    expect(screen.getByText(/some opaque manufacturer code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use a photo of the strip instead/i })).toBeInTheDocument();
  });

  it('shows an error when no QR code is found in the photo', async () => {
    decodeQrFromFile.mockResolvedValueOnce(undefined);
    renderScreen();

    await pickFile();

    expect(await screen.findByText(/couldn't find a qr code/i)).toBeInTheDocument();
  });
});
