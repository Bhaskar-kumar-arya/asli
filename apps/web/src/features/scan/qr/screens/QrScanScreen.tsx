import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MedicineIdentity } from '@asli/contracts';
import { parseQrPayload } from '@asli/qr-parse';
import { Page } from '../../../../shell/components/Page';
import { Button } from '../../../../shell/components/Button';
import { Card } from '../../../../shell/components/Card';
import { useScanFlow } from '../../lib/scanFlow';
import { decodeQrFromFile } from '../lib/decodeQr';

type Status = 'idle' | 'decoding' | 'not_found' | 'unrecognized' | 'error';

/** Screen 3a (docs/UX.md, K deliverable): scan a pack QR code from a photo. */
export function QrScanScreen() {
  const navigate = useNavigate();
  const { setPendingConfirm } = useScanFlow();
  const [status, setStatus] = useState<Status>('idle');
  const [rawText, setRawText] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStatus('decoding');
    setRawText(undefined);
    try {
      const text = await decodeQrFromFile(file);
      if (!text) {
        setStatus('not_found');
        return;
      }

      const parsed = parseQrPayload(text);
      if (!parsed.recognized || !parsed.batchNumber) {
        setStatus('unrecognized');
        setRawText(parsed.rawText);
        return;
      }

      const identity: MedicineIdentity = {
        batchNumber: parsed.batchNumber,
        productName: parsed.productName,
        manufacturer: parsed.manufacturer,
        mfgMonth: parsed.mfgMonth,
        expMonth: parsed.expMonth,
        source: 'qr',
      };
      setPendingConfirm({ identity, method: 'qr' });
      navigate('/scan/qr/confirm');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Page title="Scan QR code" onBack={() => navigate('/scan')}>
      <Card style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <p style={{ fontSize: '3em', margin: 0 }} aria-hidden="true">
          🔲
        </p>
        <p style={{ color: 'var(--text-2)' }}>
          Photograph the QR code printed on the pack. It's decoded on your device - the photo is
          never uploaded.
        </p>
      </Card>

      {status === 'not_found' || status === 'error' ? (
        <p role="alert" style={{ color: 'var(--flagged)' }}>
          {status === 'not_found'
            ? "We couldn't find a QR code in that photo. Try again with the code centred and in focus."
            : 'Something went wrong reading that photo. Please try again.'}
        </p>
      ) : null}

      {status === 'unrecognized' ? (
        <Card style={{ marginBottom: '1rem' }}>
          <p role="alert">We read the QR code, but couldn't make sense of the details in it.</p>
          {rawText ? (
            <p style={{ color: 'var(--text-2)', wordBreak: 'break-all' }}>
              What we read: <span style={{ fontFamily: 'monospace' }}>{rawText}</span>
            </p>
          ) : null}
          <Button fullWidth onClick={() => navigate('/scan/capture/strip')} style={{ marginTop: '0.75rem' }}>
            Use a photo of the strip instead
          </Button>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => navigate('/scan/manual')}
            style={{ marginTop: '0.5rem' }}
          >
            Type details instead
          </Button>
        </Card>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => void handleFile(e)}
        style={{ display: 'none' }}
      />
      <Button fullWidth disabled={status === 'decoding'} onClick={() => fileInputRef.current?.click()}>
        {status === 'decoding' ? 'Reading QR code…' : 'Take or choose a photo'}
      </Button>
    </Page>
  );
}
