import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export function jsonResponse(status: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}
