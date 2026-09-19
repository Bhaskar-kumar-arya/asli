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

export function errorResponse(code: ApiErrorCode, message: string, requestId: string): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: STATUS_BY_CODE[code],
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: { code, message, requestId } }),
  };
}

/** docs/API.md: Cognito JWT `sub` claim identifies the caller on every jwt/admin route. */
export function requireUserId(event: APIGatewayProxyEventV2WithJWTAuthorizer): string {
  const sub = event.requestContext.authorizer?.jwt?.claims?.sub;
  if (typeof sub !== 'string' || !sub) {
    throw new ApiError('UNAUTHORIZED', 'missing sub claim');
  }
  return sub;
}

/**
 * Runs a handler body and converts a thrown ApiError into the docs/API.md error envelope.
 * Never includes the request body, email or any member's identity in the error message
 * (CLAUDE.md privacy rule).
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
    return errorResponse('INTERNAL', 'internal error', requestId);
  }
}
