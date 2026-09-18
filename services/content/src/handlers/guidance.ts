import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { CONTENT_LANGS, toGuidanceTemplate, type ContentLang } from '@asli/content';
import { errorResponse, jsonResponse } from '../http';

function isContentLang(value: string): value is ContentLang {
  return (CONTENT_LANGS as string[]).includes(value);
}

/** GET /v1/content/guidance/{guidanceKey}?lang=en|hi|kn - public (docs/API.md). */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const requestId = event.requestContext.requestId;
  const key = event.pathParameters?.guidanceKey;
  const langParam = event.queryStringParameters?.lang ?? 'en';

  if (!key) {
    return errorResponse(400, 'BAD_REQUEST', 'guidanceKey path parameter is required', requestId);
  }
  if (!isContentLang(langParam)) {
    return errorResponse(400, 'BAD_REQUEST', `lang must be one of ${CONTENT_LANGS.join(', ')}`, requestId);
  }

  const template = toGuidanceTemplate(decodeURIComponent(key), langParam);
  if (!template) {
    return errorResponse(404, 'NOT_FOUND', `Unknown guidance key: ${key}`, requestId);
  }

  return jsonResponse(200, template);
};
