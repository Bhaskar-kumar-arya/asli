import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import type { ApiErrorCode } from '@asli/contracts';

export function getUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const sub = event.requestContext.authorizer.jwt.claims.sub;
  if (typeof sub !== 'string' || !sub) {
    throw new Error('JWT claims missing sub');
  }
  return sub;
}

export function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function errorResponse(
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  requestId: string,
): APIGatewayProxyStructuredResultV2 {
  return jsonResponse(statusCode, { error: { code, message, requestId } });
}
