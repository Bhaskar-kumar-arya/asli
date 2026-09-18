import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { handler as createHandler } from './subscriptions-create';
import { handler as deleteHandler } from './subscriptions-delete';
import { handler as vapidHandler } from './vapid-public-key';

const ddbMock = mockClient(DynamoDBDocumentClient);

function jwtEvent(body: unknown, userId = 'user-a'): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    body: JSON.stringify(body),
    requestContext: {
      requestId: 'req-1',
      authorizer: { jwt: { claims: { sub: userId }, scopes: [] } },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}

beforeEach(() => {
  ddbMock.reset();
  process.env.PUSH_SUBSCRIPTIONS_TABLE_NAME = 'asli-test-push-subscriptions';
});

describe('POST /v1/push/subscriptions', () => {
  it('writes a subscription item for the caller', async () => {
    ddbMock.on(PutCommand).resolves({});

    const response = await createHandler(
      jwtEvent({
        endpoint: 'https://push.example.com/abc',
        keys: { p256dh: 'p', auth: 'a' },
        userAgent: 'Chrome/1.0',
      }),
      {} as never,
      undefined as never,
    );

    expect((response as { statusCode: number }).statusCode).toBe(201);
    expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
  });

  it('rejects an invalid request', async () => {
    const response = await createHandler(jwtEvent({ endpoint: 'not-a-url' }), {} as never, undefined as never);
    expect((response as { statusCode: number }).statusCode).toBe(400);
  });
});

describe('DELETE /v1/push/subscriptions', () => {
  it('deletes the subscription for the caller', async () => {
    ddbMock.on(DeleteCommand).resolves({});

    const response = await deleteHandler(
      jwtEvent({ endpoint: 'https://push.example.com/abc' }),
      {} as never,
      undefined as never,
    );

    expect((response as { statusCode: number }).statusCode).toBe(204);
    expect(ddbMock.commandCalls(DeleteCommand)).toHaveLength(1);
  });
});

describe('GET /v1/push/vapid-public-key', () => {
  it('returns the public key from the env var', async () => {
    process.env.VAPID_PUBLIC_KEY = 'pub-key-123';
    const response = (await vapidHandler({} as never, {} as never, undefined as never)) as {
      statusCode: number;
      body: string;
    };
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ publicKey: 'pub-key-123' });
  });
});
