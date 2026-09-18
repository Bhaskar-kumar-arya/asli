import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./presign', () => ({
  createUpload: vi.fn(async () => ({
    uploadId: 'upload-1',
    url: 'https://bucket.s3.amazonaws.com/',
    fields: { key: 'strip/user-1/upload-1' },
    expiresAt: '2026-01-01T00:05:00.000Z',
  })),
}));

function baseEvent(overrides: Partial<APIGatewayProxyEventV2WithJWTAuthorizer> = {}): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    requestContext: {
      requestId: 'req-1',
      authorizer: { jwt: { claims: { sub: 'user-1' }, scopes: [] } },
    },
    body: JSON.stringify({ kind: 'strip', contentType: 'image/jpeg' }),
    isBase64Encoded: false,
    ...overrides,
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

describe('uploads handler', () => {
  beforeEach(() => {
    process.env.UPLOADS_BUCKET = 'asli-dev-c-uploads';
  });

  it('returns 201 with the presigned upload on a valid request', async () => {
    const { handler } = await import('./handler');
    const result = await handler(baseEvent());

    expect(result.statusCode).toBe(201);
    expect(JSON.parse(result.body ?? '{}')).toMatchObject({ uploadId: 'upload-1' });
  });

  it('returns BAD_REQUEST for an invalid kind', async () => {
    const { handler } = await import('./handler');
    const result = await handler(baseEvent({ body: JSON.stringify({ kind: 'nope', contentType: 'image/jpeg' }) }));

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body ?? '{}').error.code).toBe('BAD_REQUEST');
  });

  it('returns UNAUTHORIZED when the sub claim is missing', async () => {
    const { handler } = await import('./handler');
    const result = await handler(baseEvent({ requestContext: { requestId: 'req-1', authorizer: { jwt: { claims: {}, scopes: [] } } } as never }));

    expect(result.statusCode).toBe(401);
  });
});
