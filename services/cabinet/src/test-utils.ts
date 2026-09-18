import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export function fakeEvent(opts: {
  userId?: string;
  pathParameters?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: '/v1/cabinets',
    rawQueryString: '',
    headers: opts.headers ?? {},
    pathParameters: opts.pathParameters,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    isBase64Encoded: false,
    requestContext: {
      accountId: '123456789012',
      apiId: 'api1',
      domainName: 'api1.execute-api.ap-south-1.amazonaws.com',
      domainPrefix: 'api1',
      http: { method: 'GET', path: '/v1/cabinets', protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: 'vitest' },
      requestId: 'req-1',
      routeKey: '$default',
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 0,
      authorizer: {
        jwt: {
          claims: opts.userId === undefined ? {} : { sub: opts.userId },
          scopes: [],
        },
      },
    },
  } as unknown as APIGatewayProxyEventV2WithJWTAuthorizer;
}
