import type { CreateUploadResponse } from '@asli/contracts';

/** Uploads a blob to the presigned URL from POST /v1/uploads (docs/API.md). */
export async function uploadToPresignedUrl(target: CreateUploadResponse, file: Blob, contentType: string): Promise<void> {
  if (target.fields) {
    const form = new FormData();
    for (const [key, value] of Object.entries(target.fields)) form.append(key, value);
    form.append('Content-Type', contentType);
    form.append('file', file);
    const res = await fetch(target.url, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`Upload failed with ${res.status}`);
    return;
  }
  const res = await fetch(target.url, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file });
  if (!res.ok) throw new Error(`Upload failed with ${res.status}`);
}
