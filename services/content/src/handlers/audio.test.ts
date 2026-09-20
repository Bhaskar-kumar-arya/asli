import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@aws-sdk/client-s3', () => ({ S3Client: vi.fn(), GetObjectCommand: vi.fn() }));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://asli-dev-shared-public.s3.ap-south-1.amazonaws.com/audio/en/flagged.mp3?X-Amz-Signature=abc'),
}));

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { handler } from './audio';

function event(pathParameters: Record<string, string>): APIGatewayProxyEventV2 {
  return { pathParameters, requestContext: { requestId: 'req-1' } } as unknown as APIGatewayProxyEventV2;
}

describe('GET /v1/public/audio/{lang}/{keyFile}', () => {
  beforeEach(() => {
    vi.mocked(getSignedUrl).mockClear();
    process.env.PUBLIC_BUCKET_NAME = 'asli-dev-shared-public';
  });

  it('302s to a presigned GET URL for a known lang and mp3 key', async () => {
    const response = (await handler(event({ lang: 'en', keyFile: 'flagged.mp3' }), {} as never, undefined as never)) as {
      statusCode: number;
      headers: Record<string, string>;
    };
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('audio/en/flagged.mp3');
  });

  it('400s for an unsupported lang', async () => {
    const response = (await handler(event({ lang: 'fr', keyFile: 'flagged.mp3' }), {} as never, undefined as never)) as {
      statusCode: number;
    };
    expect(response.statusCode).toBe(400);
  });

  it('400s when keyFile does not end in .mp3', async () => {
    const response = (await handler(event({ lang: 'en', keyFile: 'flagged' }), {} as never, undefined as never)) as {
      statusCode: number;
    };
    expect(response.statusCode).toBe(400);
  });

  it('400s when keyFile is missing', async () => {
    const response = (await handler(event({ lang: 'en' }), {} as never, undefined as never)) as { statusCode: number };
    expect(response.statusCode).toBe(400);
  });

  it('500s when PUBLIC_BUCKET_NAME is not configured', async () => {
    delete process.env.PUBLIC_BUCKET_NAME;
    const response = (await handler(event({ lang: 'en', keyFile: 'flagged.mp3' }), {} as never, undefined as never)) as {
      statusCode: number;
    };
    expect(response.statusCode).toBe(500);
  });
});
