import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import type { VapidPublicKeyResponse } from '@asli/contracts';
import { requiredEnv } from '../ddb';
import { jsonResponse } from '../http';

/** Public endpoint - the public key is passed as a Lambda env var at deploy time (infra/lib/lanes/g1-notify.ts). */
export const handler: APIGatewayProxyHandlerV2 = async () => {
  const publicKey = requiredEnv('VAPID_PUBLIC_KEY');
  const response: VapidPublicKeyResponse = { publicKey };
  return jsonResponse(200, response);
};
