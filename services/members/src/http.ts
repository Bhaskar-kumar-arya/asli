import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import type { ApiErrorCode } from '@asli/contracts';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  EXTRACTION_FAILED: 422,
  INTERNAL: 500,
};

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function errorResponse(code: ApiErrorCode, message: string, requestId: string): APIGatewayProxyStructuredResultV2 {
  return jsonResponse(STATUS_BY_CODE[code], { error: { code, message, requestId } });
}

/** docs/API.md: Cognito JWT `sub` claim identifies the caller on every jwt/admin route. */
export function requireUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const sub = event.requestContext.authorizer?.jwt?.claims?.sub;
  if (typeof sub !== 'string' || !sub) {
    throw new ApiError('UNAUTHORIZED', 'missing sub claim');
  }
  return sub;
}

export function requirePathParam(event: APIGatewayProxyEventV2WithJWTAuthorizer, name: string): string {
  const value = event.pathParameters?.[name];
  if (!value) throw new ApiError('BAD_REQUEST', `${name} path parameter is required`);
  return value;
}

export function parseJsonBody(event: APIGatewayProxyEventV2WithJWTAuthorizer): unknown {
  if (!event.body) {
    throw new ApiError('BAD_REQUEST', 'request body is required');
  }
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError('BAD_REQUEST', 'request body is not valid JSON');
  }
}

/**
 * Runs a handler body and converts thrown ApiError/ZodError into the docs/API.md
 * error envelope. Never includes the request body or member email in the error
 * message - CLAUDE.md privacy rule.
 */
export async function withErrorHandling(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  fn: () => Promise<APIGatewayProxyStructuredResultV2>,
): Promise<APIGatewayProxyStructuredResultV2> {
  const requestId = event.requestContext.requestId;
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      return errorResponse(err.code, err.message, requestId);
    }
    if (err && typeof err === 'object' && 'issues' in err) {
      return errorResponse('BAD_REQUEST', 'request failed validation', requestId);
    }
    return errorResponse('INTERNAL', 'internal error', requestId);
  }
}
