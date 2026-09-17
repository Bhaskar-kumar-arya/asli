import { randomUUID } from 'node:crypto';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import type { S3Client } from '@aws-sdk/client-s3';
import type { CreateUploadResponse, UploadKind } from '@asli/contracts';
import { ApiError } from '../http';

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
const EXPIRES_SECONDS = 300;

/** docs/DATA_MODEL.md uploads bucket prefixes: `strip|bill|pharmacy/<userId>/<uploadId>`. */
export function buildUploadKey(kind: UploadKind, userId: string, uploadId: string): string {
  return `${kind}/${userId}/${uploadId}`;
}

export interface PresignDeps {
  s3Client: S3Client;
  uploadsBucket: string;
  now?: () => number;
  uploadId?: () => string;
}

/**
 * docs/API.md POST /v1/uploads: presigned POST (not PUT) because the 5 MB
 * limit and locked content-type need policy conditions S3 enforces itself -
 * a presigned PUT query-string signature can't express a content-length-range
 * condition. `fields` in the response carries the POST policy fields the
 * client must include verbatim.
 */
export async function createUpload(
  deps: PresignDeps,
  userId: string,
  kind: UploadKind,
  contentType: string,
): Promise<CreateUploadResponse> {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new ApiError('BAD_REQUEST', 'unsupported content type');
  }

  const uploadId = deps.uploadId?.() ?? randomUUID();
  const key = buildUploadKey(kind, userId, uploadId);

  const { url, fields } = await createPresignedPost(deps.s3Client, {
    Bucket: deps.uploadsBucket,
    Key: key,
    Conditions: [
      ['content-length-range', 0, MAX_BYTES],
      ['eq', '$Content-Type', contentType],
    ],
    Fields: { 'Content-Type': contentType },
    Expires: EXPIRES_SECONDS,
  });

  const now = deps.now?.() ?? Date.now();
  return {
    uploadId,
    url,
    fields,
    expiresAt: new Date(now + EXPIRES_SECONDS * 1000).toISOString(),
  };
}
