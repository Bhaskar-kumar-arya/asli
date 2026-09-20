import { useRef, useState } from 'react';
import type { PharmacyCheckResponse } from '@asli/contracts';
import { Button } from '../../../shell/components/Button';
import { Verdict } from '../../../shell/components/Verdict';
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
    <main className="reg-sheet reg-sheet--wide">
      <header className="reg-masthead">
        <h1>Pharmacy mode</h1>
        <p className="reg-masthead__currency">Bulk consignment check · up to 500 rows</p>
      </header>

      <p className="reg-prose">
        Check your stock or a supplier invoice against CDSCO alert lists in bulk.
      </p>

      <div className="reg-stack">
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
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleInvoicePhoto(file);
          }}
        />
      </div>

      {busy ? (
        <p role="status" className="reg-line" style={{ marginTop: '1.4rem' }}>
          <span className="reg-line__ellipsis">Checking the consignment against the register</span>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="reg-line reg-line--flagged" style={{ textTransform: 'none', marginTop: '1.4rem' }}>
          {error}
        </p>
      ) : null}

      {response ? (
        <>
          <div className="reg-head">
            <h2>
              {response.rows.length} rows checked · {response.flaggedUnits} flagged units
            </h2>
            <Button variant="secondary" onClick={() => downloadResultsCsv(response)}>
              Export CSV
            </Button>
          </div>

          <div className="reg-table-scroll" style={{ marginTop: '0.4rem' }}>
            <table className="reg-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Manufacturer</th>
                  <th data-num>Qty</th>
                  <th>Status</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const match = row.matches[0];
                  return (
                    <tr key={`${row.identity.batchNumber}-${i}`}>
                      <td>{row.identity.productName ?? '—'}</td>
                      <td>{row.identity.batchNumber}</td>
                      <td>{row.identity.manufacturer ?? '—'}</td>
                      <td data-num>{row.quantity ?? '—'}</td>
                      <td>
                        <Verdict tier={row.tier} category={match?.category} />
                      </td>
                      <td>
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
