import { describe, expect, it } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler } from './guidance';

function event(pathParameters: Record<string, string>, queryStringParameters?: Record<string, string>): APIGatewayProxyEventV2 {
  return {
    pathParameters,
    queryStringParameters,
    requestContext: { requestId: 'req-1' },
  } as unknown as APIGatewayProxyEventV2;
}

describe('GET /v1/content/guidance/{guidanceKey}', () => {
  it('returns the English GuidanceTemplate by default', async () => {
    const response = (await handler(event({ guidanceKey: 'result.flagged.nsq' }), {} as never, undefined as never)) as {
      statusCode: number;
      body: string;
    };
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toMatchObject({ key: 'result.flagged.nsq', lang: 'en' });
    expect(body.title).toBe('This batch is on a CDSCO alert list');
    expect(body.reviewedBy).toBeTruthy();
  });

  it('falls back to English for an unreviewed hi/kn draft', async () => {
    const response = (await handler(
      event({ guidanceKey: 'result.no_alert_found' }, { lang: 'hi' }),
      {} as never,
      undefined as never,
    )) as { statusCode: number; body: string };
    const body = JSON.parse(response.body);
    expect(body.lang).toBe('en');
  });

  it('404s for an unknown key', async () => {
    const response = (await handler(event({ guidanceKey: 'not.a.key' }), {} as never, undefined as never)) as {
      statusCode: number;
      body: string;
    };
    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).error.code).toBe('NOT_FOUND');
  });

  it('400s for an unsupported lang', async () => {
    const response = (await handler(
      event({ guidanceKey: 'result.flagged.nsq' }, { lang: 'fr' }),
      {} as never,
      undefined as never,
    )) as { statusCode: number; body: string };
    expect(response.statusCode).toBe(400);
  });

  it('400s when guidanceKey is missing', async () => {
    const response = (await handler(event({}), {} as never, undefined as never)) as { statusCode: number };
    expect(response.statusCode).toBe(400);
  });
});
