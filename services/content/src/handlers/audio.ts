import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CONTENT_LANGS, type ContentLang } from '@asli/content';
import { errorResponse } from '../http';

const EXPIRES_SECONDS = 300;
const s3Client = new S3Client({});

function isContentLang(value: string): value is ContentLang {
  return (CONTENT_LANGS as string[]).includes(value);
}

/**
 * GET /v1/public/audio/{lang}/{keyFile} - public (docs/SAFETY_AND_CONTENT.md "Read-aloud").
 *
 * The public bucket blocks all public access (infra/lib/shared-stack.ts `PublicBucket`), so
 * `apps/web`'s `playReadAloud()` can't hit `audio/<lang>/<key>.mp3` directly. This redirects to
 * a short-lived presigned GET URL instead - a 302 works with a plain `<audio>` element with no
 * client change, and avoids API Gateway HTTP APIs' binary-payload passthrough entirely. It does
 * not check the object exists first: a missing key presigns fine and 404s when the browser
 * follows the redirect, which `playAudioFile()` already treats as "fall back to speechSynthesis".
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const requestId = event.requestContext.requestId;
  const lang = event.pathParameters?.lang;
  const keyFile = event.pathParameters?.keyFile;
  const bucket = process.env.PUBLIC_BUCKET_NAME;

  if (!bucket) {
    return errorResponse(500, 'INTERNAL', 'PUBLIC_BUCKET_NAME is not configured', requestId);
  }
  if (!lang || !isContentLang(lang)) {
    return errorResponse(400, 'BAD_REQUEST', `lang must be one of ${CONTENT_LANGS.join(', ')}`, requestId);
  }
  if (!keyFile || !keyFile.endsWith('.mp3') || keyFile === '.mp3') {
    return errorResponse(400, 'BAD_REQUEST', 'keyFile must be a non-empty name ending in .mp3', requestId);
  }

  const objectKey = `audio/${lang}/${decodeURIComponent(keyFile)}`;
  const url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: bucket, Key: objectKey }), {
    expiresIn: EXPIRES_SECONDS,
  });

  return { statusCode: 302, headers: { location: url } };
};
