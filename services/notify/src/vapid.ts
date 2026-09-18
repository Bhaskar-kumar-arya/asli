import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { requiredEnv } from './ddb';

const secretsManager = new SecretsManagerClient({});

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

let cached: VapidKeys | undefined;

/** Fetches the VAPID key pair once per warm Lambda instance (scripts/vapid-keys.ts wrote it). */
export async function loadVapidKeys(): Promise<VapidKeys> {
  if (cached) return cached;

  const secretArn = requiredEnv('VAPID_SECRET_ARN');
  const result = await secretsManager.send(new GetSecretValueCommand({ SecretId: secretArn }));
  if (!result.SecretString) throw new Error('VAPID secret has no SecretString');

  const parsed = JSON.parse(result.SecretString) as VapidKeys;
  cached = parsed;
  return parsed;
}
