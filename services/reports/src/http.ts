import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import type { ApiErrorCode } from '@asli/contracts';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, 'BAD_REQUEST', message);
}

export function userIdFromEvent(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const sub = event.requestContext.authorizer?.jwt?.claims?.sub;
  if (typeof sub !== 'string' || sub.length === 0) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Missing JWT sub claim');
  }
  return sub;
}

export function parseJsonBody<T>(event: APIGatewayProxyEventV2WithJWTAuthorizer, parse: (raw: unknown) => T): T {
  if (!event.body) throw badRequest('Request body is required');
  let raw: unknown;
  try {
    raw = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body);
  } catch {
    throw badRequest('Request body is not valid JSON');
  }
  try {
    return parse(raw);
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : 'Invalid request body');
  }
}

export function jsonResponse(status: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function errorResponse(requestId: string, err: unknown): APIGatewayProxyStructuredResultV2 {
  if (err instanceof HttpError) {
    return jsonResponse(err.status, { error: { code: err.code, message: err.message, requestId } });
  }
  // Never leak internal error details to callers.
  return jsonResponse(500, { error: { code: 'INTERNAL', message: 'Internal error', requestId } });
}

export type Handler = (event: APIGatewayProxyEventV2WithJWTAuthorizer) => Promise<APIGatewayProxyStructuredResultV2>;

/** Wraps a handler body so every uncaught HttpError (or unknown error) becomes docs/API.md's error envelope. */
export function withErrors(
  fn: (event: APIGatewayProxyEventV2WithJWTAuthorizer) => Promise<APIGatewayProxyStructuredResultV2>,
): Handler {
  return async (event) => {
    try {
      return await fn(event);
    } catch (err) {
      return errorResponse(event.requestContext.requestId, err);
    }
  };
}
