import { S3Client } from '@aws-sdk/client-s3';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { CreateUploadRequestSchema } from '@asli/contracts';
import { jsonResponse, parseJsonBody, requireUserId, withErrorHandling } from '../http';
import { logEvent } from '../logging';
import { createUpload } from './presign';

const s3Client = new S3Client({});
const uploadsBucket = process.env.UPLOADS_BUCKET;

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyStructuredResultV2> {
  return withErrorHandling(event, async () => {
    if (!uploadsBucket) throw new Error('UPLOADS_BUCKET env var is required');
    const userId = requireUserId(event);
    const body = CreateUploadRequestSchema.parse(parseJsonBody(event));

    const response = await createUpload({ s3Client, uploadsBucket }, userId, body.kind, body.contentType);

    logEvent('upload created', { requestId: event.requestContext.requestId, route: 'uploads', kind: body.kind, uploadId: response.uploadId });
    return jsonResponse(201, response);
  });
}
