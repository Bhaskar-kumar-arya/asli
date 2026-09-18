import type { S3Client } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: vi.fn(async () => ({
    url: 'https://asli-dev-c-uploads.s3.ap-south-1.amazonaws.com/',
    fields: { key: 'strip/user-1/upload-1', 'Content-Type': 'image/jpeg' },
  })),
}));

import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { buildUploadKey, createUpload } from './presign';
import { ApiError } from '../http';

describe('buildUploadKey', () => {
  it('builds kind/userId/uploadId', () => {
    expect(buildUploadKey('strip', 'user-1', 'upload-1')).toBe('strip/user-1/upload-1');
  });
});

describe('createUpload', () => {
  it('rejects unsupported content types before calling S3', async () => {
    const s3Client = {} as S3Client;
    await expect(createUpload({ s3Client, uploadsBucket: 'uploads' }, 'user-1', 'strip', 'application/pdf')).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(createPresignedPost).not.toHaveBeenCalled();
  });

  it('locks content-type and a 5 MB limit in the POST policy conditions', async () => {
    const s3Client = {} as S3Client;
    const result = await createUpload(
      { s3Client, uploadsBucket: 'uploads', now: () => 0, uploadId: () => 'upload-1' },
      'user-1',
      'strip',
      'image/jpeg',
    );

    expect(createPresignedPost).toHaveBeenCalledWith(
      s3Client,
      expect.objectContaining({
        Bucket: 'uploads',
        Key: 'strip/user-1/upload-1',
        Conditions: expect.arrayContaining([
          ['content-length-range', 0, 5 * 1024 * 1024],
          ['eq', '$Content-Type', 'image/jpeg'],
        ]),
        Expires: 300,
      }),
    );
    expect(result).toEqual({
      uploadId: 'upload-1',
      url: 'https://asli-dev-c-uploads.s3.ap-south-1.amazonaws.com/',
      fields: { key: 'strip/user-1/upload-1', 'Content-Type': 'image/jpeg' },
      expiresAt: new Date(300 * 1000).toISOString(),
    });
  });
});
