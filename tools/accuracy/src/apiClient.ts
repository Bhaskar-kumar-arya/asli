import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import type {
  ApiError,
  CheckRequest,
  CheckResponse,
  CreateUploadResponse,
  MedicineIdentity,
  ScanResponse,
} from '@asli/contracts';

export class ApiRequestError extends Error {
  code: ApiError['error']['code'];
  requestId: string;

  constructor(body: ApiError) {
    super(body.error.message);
    this.code = body.error.code;
    this.requestId = body.error.requestId;
  }
}

export interface TimedResult<T> {
  body: T;
  latencyMs: number;
}

async function apiFetch<T>(baseUrl: string, idToken: string, path: string, init: RequestInit = {}): Promise<TimedResult<T>> {
  const started = performance.now();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...init.headers,
    },
  });
  const latencyMs = performance.now() - started;
  const json: unknown = res.status === 204 ? undefined : await res.json();

  if (!res.ok) {
    if (json && typeof json === 'object' && 'error' in json) {
      throw new ApiRequestError(json as ApiError);
    }
    throw new ApiRequestError({ error: { code: 'INTERNAL', message: `HTTP ${res.status}`, requestId: 'unknown' } });
  }
  return { body: json as T, latencyMs };
}

/** POST /v1/uploads then PUT/POST the file to the returned presigned URL - docs/API.md. */
export async function uploadImage(
  baseUrl: string,
  idToken: string,
  kind: 'strip' | 'bill',
  imagePath: string,
): Promise<string> {
  const contentType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
  const { body: upload } = await apiFetch<CreateUploadResponse>(baseUrl, idToken, '/v1/uploads', {
    method: 'POST',
    body: JSON.stringify({ kind, contentType }),
  });

  const fileBuffer = readFileSync(imagePath);
  if (upload.fields) {
    const form = new FormData();
    for (const [key, value] of Object.entries(upload.fields)) form.append(key, value);
    form.append('file', new Blob([fileBuffer], { type: contentType }), basename(imagePath));
    const res = await fetch(upload.url, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Upload PUT/POST failed for ${imagePath}: HTTP ${res.status}`);
  } else {
    const res = await fetch(upload.url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: fileBuffer });
    if (!res.ok) throw new Error(`Upload PUT failed for ${imagePath}: HTTP ${res.status}`);
  }

  return upload.uploadId;
}

/** POST /v1/scans - returns the scan response plus the client-measured round-trip latency. */
export async function runScan(
  baseUrl: string,
  idToken: string,
  uploadId: string,
  kind: 'strip' | 'bill',
): Promise<TimedResult<ScanResponse>> {
  return apiFetch<ScanResponse>(baseUrl, idToken, '/v1/scans', {
    method: 'POST',
    body: JSON.stringify({ uploadId, kind }),
  });
}

/** POST /v1/checks - used for the seeded tier-correctness probes. */
export async function runChecks(baseUrl: string, idToken: string, items: MedicineIdentity[]): Promise<TimedResult<CheckResponse>> {
  const req: CheckRequest = { items };
  return apiFetch<CheckResponse>(baseUrl, idToken, '/v1/checks', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}
