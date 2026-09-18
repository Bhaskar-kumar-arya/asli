import { useRef, useState } from 'react';
import type { PharmacyCheckResponse } from '@asli/contracts';
import { Button } from '../../../shell/components/Button';
import { Card } from '../../../shell/components/Card';
import { StatusChip } from '../../../shell/components/StatusChip';
import { ApiRequestError } from '../../../api/client';
import { downscaleImage } from '../../scan/lib/imageProcessing';
import { uploadToPresignedUrl } from '../../../api/upload';
import { pharmacyApi } from '../api/pharmacy';
import { downloadCsvTemplate } from '../lib/csvTemplate';
import { downloadResultsCsv } from '../lib/exportResults';

const INVOICE_CONTENT_TYPE = 'image/jpeg';

/** docs/UX.md screen 15, plan/tasks/N-pharmacy-mode.md: bulk check via CSV upload or invoice photo. */
export function PharmacyPage() {
  const [response, setResponse] = useState<PharmacyCheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function runCheck(fn: () => Promise<PharmacyCheckResponse>) {
    setBusy(true);
    setError(null);
    setResponse(null);
    try {
      setResponse(await fn());
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't run the check. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCsvFile(file: File) {
    const text = await readFileAsText(file);
    await runCheck(() => pharmacyApi.checkCsv(text));
  }

  async function handleInvoicePhoto(file: File) {
    await runCheck(async () => {
      const blob = await downscaleImage(file);
      const upload = await pharmacyApi.createUpload(INVOICE_CONTENT_TYPE);
      await uploadToPresignedUrl(upload, blob, INVOICE_CONTENT_TYPE);
      return pharmacyApi.checkUpload(upload.uploadId);
    });
  }

  const rows = response ? [...response.rows].sort((a, b) => tierRank(a.tier) - tierRank(b.tier)) : [];

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '1rem 1rem 3rem' }}>
      <h1 style={{ margin: '0 0 0.25rem' }}>Pharmacy mode</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
        Check your stock or a supplier invoice against CDSCO alert lists in bulk. Up to 500 rows.
      </p>

      <Card style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <Button onClick={() => csvInputRef.current?.click()} disabled={busy}>
          Upload stock CSV
        </Button>
        <input
          ref={csvInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleCsvFile(file);
          }}
        />
        <Button variant="secondary" onClick={downloadCsvTemplate} disabled={busy}>
          Download CSV template
        </Button>
        <Button variant="secondary" onClick={() => photoInputRef.current?.click()} disabled={busy}>
          Upload supplier invoice photo
        </Button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleInvoicePhoto(file);
          }}
        />
      </Card>

      {busy ? <p role="status">Checking…</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      {response ? (
        <>
          <Card style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <p style={{ margin: 0 }}>
              {response.rows.length} rows checked · <strong>{response.flaggedUnits}</strong> flagged units
            </p>
            <Button variant="secondary" onClick={() => downloadResultsCsv(response)}>
              Export results as CSV
            </Button>
          </Card>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Product</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Batch</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Manufacturer</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem' }}>Qty</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const match = row.matches[0];
                  return (
                    <tr key={`${row.identity.batchNumber}-${i}`} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem' }}>{row.identity.productName ?? '—'}</td>
                      <td style={{ padding: '0.5rem' }}>{row.identity.batchNumber}</td>
                      <td style={{ padding: '0.5rem' }}>{row.identity.manufacturer ?? '—'}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{row.quantity ?? '—'}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <StatusChip tier={row.tier} />
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        {match ? (
                          <a href={match.sourceUrl} target="_blank" rel="noreferrer">
                            CDSCO, {match.reportingLab ?? match.reportingSource}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}

function tierRank(tier: PharmacyCheckResponse['rows'][number]['tier']): number {
  return tier === 'FLAGGED' ? 0 : tier === 'VERIFY' ? 1 : 2;
}

/** FileReader instead of File.text() - broader jsdom/older-browser support. */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
