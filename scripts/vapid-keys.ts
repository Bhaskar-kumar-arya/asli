#!/usr/bin/env tsx
/**
 * Creates the VAPID key pair for web push (docs/ALERTS.md) and stores it once:
 * both keys in Secrets Manager `asli/<stage>/vapid`, the public key also in SSM
 * (docs/API.md GET /v1/push/vapid-public-key reads it from there, no secret access needed).
 *
 * Usage: pnpm vapid-keys --stage dev-shared
 */
import { SecretsManagerClient, CreateSecretCommand, PutSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import webPush from 'web-push';
import { SSM_PATHS } from '@asli/contracts';

/** Mirrors infra/lib/ssm.ts ssmName - kept here too since scripts/ isn't a workspace package. */
function ssmName(stage: string, path: string): string {
  return `/asli/${stage}${path.startsWith('/') ? path : `/${path}`}`;
}

function parseStage(): string {
  const idx = process.argv.indexOf('--stage');
  const stage = idx !== -1 ? process.argv[idx + 1] : undefined;
  if (!stage) {
    throw new Error('Usage: pnpm vapid-keys --stage <stage>');
  }
  return stage;
}

async function main(): Promise<void> {
  const stage = parseStage();
  const { publicKey, privateKey } = webPush.generateVAPIDKeys();

  const secretsManager = new SecretsManagerClient({ region: 'ap-south-1' });
  const secretId = `asli/${stage}/vapid`;
  const secretValue = JSON.stringify({ publicKey, privateKey });

  try {
    await secretsManager.send(
      new CreateSecretCommand({ Name: secretId, SecretString: secretValue }),
    );
    console.log(`Created secret ${secretId}`);
  } catch (err) {
    if ((err as { name?: string }).name === 'ResourceExistsException') {
      await secretsManager.send(new PutSecretValueCommand({ SecretId: secretId, SecretString: secretValue }));
      console.log(`Updated existing secret ${secretId}`);
    } else {
      throw err;
    }
  }

  const ssm = new SSMClient({ region: 'ap-south-1' });
  await ssm.send(
    new PutParameterCommand({
      Name: ssmName(stage, SSM_PATHS.vapid.publicKey),
      Value: publicKey,
      Type: 'String',
      Overwrite: true,
    }),
  );
  await ssm.send(
    new PutParameterCommand({
      Name: ssmName(stage, SSM_PATHS.vapid.secretArn),
      Value: secretId,
      Type: 'String',
      Overwrite: true,
    }),
  );
  console.log(`Wrote ${SSM_PATHS.vapid.publicKey} and ${SSM_PATHS.vapid.secretArn} to SSM for stage ${stage}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
