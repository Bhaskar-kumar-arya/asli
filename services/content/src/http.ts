import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import type { ApiErrorCode } from '@asli/contracts';

export function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' },
    body: JSON.stringify(body),
  };
}

export function errorResponse(statusCode: number, code: ApiErrorCode, message: string, requestId: string): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: { code, message, requestId } }),
  };
}
