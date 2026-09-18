import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page } from '../../../shell/components/Page';
import { Button } from '../../../shell/components/Button';
import { Card } from '../../../shell/components/Card';
import { api } from '../../../api/endpoints';
import { uploadToPresignedUrl } from '../../../api/upload';
import { downscaleImage } from '../lib/imageProcessing';
import { useScanFlow } from '../lib/scanFlow';
import { isMockMode } from '../../../mocks/isMockMode';
import { scanFixtures, type ScanFixtureState } from '../../../mocks/fixtures';

type Progress = 'idle' | 'downscaling' | 'uploading' | 'extracting' | 'error';

export function CaptureScreen() {
  const { kind } = useParams<{ kind: 'strip' | 'bill' }>();
  const navigate = useNavigate();
  const { setResults } = useScanFlow();
  const [progress, setProgress] = useState<Progress>('idle');
  const [mockScenario, setMockScenario] = useState<ScanFixtureState>('FLAGGED_NSQ');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (kind !== 'strip' && kind !== 'bill') {
    return <Page title="Check a medicine">Unknown capture method.</Page>;
  }
  const captureKind = kind;

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProgress('downscaling');
      const blob = await downscaleImage(file);

      setProgress('uploading');
      const uploadRequest = isMockMode()
        ? { kind: captureKind, contentType: 'image/jpeg', mockState: mockScenario }
        : { kind: captureKind, contentType: 'image/jpeg' };
      const upload = await api.createUpload(uploadRequest);
      await uploadToPresignedUrl(upload, blob, 'image/jpeg');

      setProgress('extracting');
      const scan = await api.createScan({ uploadId: upload.uploadId, kind: captureKind });

      if (scan.warnings.includes('NOT_A_MEDICINE') || (scan.items.length === 0 && scan.warnings.includes('NO_BATCH_ON_LINE'))) {
        setResults([], scan.warnings, false);
        navigate('/scan/manual', { state: { extractionFailed: true, warnings: scan.warnings } });
        return;
      }

      if (captureKind === 'bill') {
        setResults(scan.results, scan.warnings, true);
        navigate('/scan/bill-results');
        return;
      }

      const item = scan.items[0];
      const result = scan.results[0];
      if (!item || !result) {
        navigate('/scan/manual', { state: { extractionFailed: true, warnings: scan.warnings } });
        return;
      }

      setResults([result], scan.warnings, false);
      navigate('/scan/confirm');
    } catch {
      setProgress('error');
    }
  }

  return (
    <Page title={kind === 'strip' ? 'Photo of strip' : 'Photo of bill'} onBack={() => navigate('/scan')}>
      <Card style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <p style={{ fontSize: '3em', margin: 0 }} aria-hidden="true">
          {kind === 'strip' ? '💊' : '🧾'}
        </p>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {kind === 'strip'
            ? 'Look for "B.No" or "Batch" printed on the strip or carton, usually near the expiry date.'
            : 'Make sure the batch number column on the bill is clear and not cut off.'}
        </p>
      </Card>

      {isMockMode() ? (
        <Card style={{ marginBottom: '1rem' }}>
          <label htmlFor="mock-scenario" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>
            Demo scenario (mock mode)
          </label>
          <select
            id="mock-scenario"
            value={mockScenario}
            onChange={(e) => setMockScenario(e.target.value as ScanFixtureState)}
            style={{ width: '100%', minHeight: 'var(--tap-target-min)', padding: '0.5rem' }}
          >
            {scanFixtures.map((f) => (
              <option key={f.state} value={f.state}>
                {f.state}
              </option>
            ))}
          </select>
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
      <Button
        fullWidth
        disabled={progress === 'downscaling' || progress === 'uploading' || progress === 'extracting'}
        onClick={() => fileInputRef.current?.click()}
      >
        {progress === 'idle' || progress === 'error' ? 'Take or choose a photo' : null}
        {progress === 'downscaling' ? 'Preparing photo…' : null}
        {progress === 'uploading' ? 'Uploading…' : null}
        {progress === 'extracting' ? 'Reading the details…' : null}
      </Button>
      {progress === 'error' ? (
        <p role="alert" style={{ color: 'var(--color-danger)' }}>
          Something went wrong. Please try again, or{' '}
          <button type="button" onClick={() => navigate('/scan/manual')} style={{ color: 'inherit', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            type the details instead
          </button>
          .
        </p>
      ) : null}
    </Page>
  );
}
