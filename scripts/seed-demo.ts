#!/usr/bin/env tsx
/**
 * Seeds the "two siblings share Mom's cabinet" demo persona (docs/PERMISSIONS.md,
 * submission/DEMO_SCRIPT.md 1:45-2:05) with REAL Cognito users and REAL cabinets-table
 * rows, so the demo can be signed into and recorded on an actual phone - unlike
 * packages/contracts/fixtures/cabinets.json, which uses fake userIds
 * (user-asha-001/user-vikram-002/user-priya-003) for Zod/unit-test fixtures only and
 * has no corresponding sign-in credentials.
 *
 * Creates:
 * - Two Cognito users in the shared user pool: a demo "Asha" (OWNER) and "Vikram"
 *   (EDITOR), matching docs/PERMISSIONS.md's sharing moment.
 * - A "Mom's medicines" cabinet with those two as members.
 * - One disclosed mock strip medicine (docs/PRIVACY.md "Demo data") whose identity
 *   exactly matches the real CDSCO row in fixtures/demo/replay-1.json
 *   (E9AIY029 / Pharma Force Lab, Feb-2026 NSQ, captured by T01's endpoint spike) so
 *   POST /v1/admin/demo/replay-month's retroactive fan-out has something to match.
 * - One ordinary clean medicine for contrast (NO_ALERT_FOUND).
 *
 * Idempotent: Cognito user creation tolerates UsernameExistsException (looks up the
 * existing user's sub instead); DynamoDB writes use the same conditional-put pattern
 * as scripts/seed-fixtures.ts.
 *
 * Usage: tsx scripts/seed-demo.ts --stage int
 */
import {
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import { SSM_PATHS } from '@asli/contracts';
import { batchSkeleton, normalizeBatch } from '@asli/matching';

const REGION = 'ap-south-1';

function parseStage(): string {
  const idx = process.argv.indexOf('--stage');
  const stage = idx !== -1 ? process.argv[idx + 1] : undefined;
  if (!stage) {
    throw new Error('Usage: tsx scripts/seed-demo.ts --stage <stage>');
  }
  return stage;
}

/** Demo personas. Fake emails on a domain we own nothing real at - never a real person's data. */
const PERSONAS = [
  { key: 'asha', email: 'asha.demo@asli.internal', role: 'OWNER' as const },
  { key: 'vikram', email: 'vikram.demo@asli.internal', role: 'EDITOR' as const },
];

const DEMO_PASSWORD = 'AsliDemo!2026';
const CABINET_ID = 'cab-demo-mom-001';
const FLAGGED_MED_ID = 'med-demo-flagged-001';
const CLEAN_MED_ID = 'med-demo-clean-001';

// Matches fixtures/demo/replay-1.json's single aaData row exactly (real CDSCO row,
// captured by T01, Feb-2026 NSQ) so the demo replay's retroactive match has a hit.
const FLAGGED_IDENTITY = {
  productName: 'Montelukast & Levocetirizine Dihydrochloride',
  batchNumber: 'E9AIY029',
  manufacturer: 'Pharma Force Lab',
  source: 'strip_vision' as const,
  fieldConfidence: { batchNumber: 0.95, manufacturer: 0.9 },
};

const CLEAN_IDENTITY = {
  productName: 'Metformin 500mg Tablets',
  batchNumber: 'MTF2201',
  manufacturer: 'Cipla Ltd',
  source: 'manual' as const,
};

async function resolveUserPoolId(ssm: SSMClient, stage: string): Promise<string> {
  const name = `/asli/${stage}${SSM_PATHS.cognito.userPoolId}`;
  const res = await ssm.send(new GetParametersCommand({ Names: [name] }));
  const value = res.Parameters?.[0]?.Value;
  if (!value) throw new Error(`Missing SSM parameter ${name} - is the shared stack deployed to this stage?`);
  return value;
}

async function ensureDemoUser(
  cognito: CognitoIdentityProviderClient,
  userPoolId: string,
  email: string,
): Promise<string> {
  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        MessageAction: 'SUPPRESS',
      }),
    );
    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: DEMO_PASSWORD,
        Permanent: true,
      }),
    );
    console.log(`Created Cognito user ${email}`);
  } catch (err) {
    if (!(err instanceof UsernameExistsException)) throw err;
    console.log(`Cognito user ${email} already exists, reusing`);
  }
  const got = await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email }));
  const sub = got.UserAttributes?.find((a) => a.Name === 'sub')?.Value;
  if (!sub) throw new Error(`Could not resolve "sub" for ${email}`);
  return sub;
}

async function putIdempotent(
  ddb: DynamoDBDocumentClient,
  tableName: string,
  item: Record<string, unknown>,
): Promise<void> {
  try {
    await ddb.send(
      new PutCommand({ TableName: tableName, Item: item, ConditionExpression: 'attribute_not_exists(PK)' }),
    );
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') return; // already seeded
    throw err;
  }
}

async function main(): Promise<void> {
  const stage = parseStage();
  const ssm = new SSMClient({ region: REGION });
  const cognito = new CognitoIdentityProviderClient({ region: REGION });
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

  const userPoolId = await resolveUserPoolId(ssm, stage);
  const subs: Record<string, string> = {};
  for (const persona of PERSONAS) {
    subs[persona.key] = await ensureDemoUser(cognito, userPoolId, persona.email);
  }

  const tableName = `asli-${stage}-cabinets`;
  const now = new Date().toISOString();

  await putIdempotent(ddb, tableName, {
    PK: `CAB#${CABINET_ID}`,
    SK: 'META',
    name: "Mom's medicines",
    createdBy: subs.asha,
    createdAt: now,
  });

  for (const persona of PERSONAS) {
    await putIdempotent(ddb, tableName, {
      PK: `CAB#${CABINET_ID}`,
      SK: `MEMBER#${subs[persona.key]}`,
      role: persona.role,
      alertsEnabled: true,
      joinedAt: now,
      GSI1PK: `USER#${subs[persona.key]}`,
      GSI1SK: `CAB#${CABINET_ID}`,
    });
  }

  const flaggedNorm = normalizeBatch(FLAGGED_IDENTITY.batchNumber);
  const cleanNorm = normalizeBatch(CLEAN_IDENTITY.batchNumber);

  await putIdempotent(ddb, tableName, {
    PK: `CAB#${CABINET_ID}`,
    SK: `MED#${FLAGGED_MED_ID}`,
    identity: FLAGGED_IDENTITY,
    label: "Mom - disclosed mock strip for demo replay (see docs/PRIVACY.md)",
    forPerson: 'Mom',
    addedBy: subs.asha,
    addedAt: now,
    latestTier: 'PENDING',
    GSI3PK: `SKEL#${batchSkeleton(flaggedNorm)}`,
    GSI3SK: `CAB#${CABINET_ID}#MED#${FLAGGED_MED_ID}`,
  });

  await putIdempotent(ddb, tableName, {
    PK: `CAB#${CABINET_ID}`,
    SK: `MED#${CLEAN_MED_ID}`,
    identity: CLEAN_IDENTITY,
    label: 'Mom - morning tablet',
    forPerson: 'Mom',
    addedBy: subs.vikram,
    addedAt: now,
    latestTier: 'PENDING',
    GSI3PK: `SKEL#${batchSkeleton(cleanNorm)}`,
    GSI3SK: `CAB#${CABINET_ID}#MED#${CLEAN_MED_ID}`,
  });

  console.log(`Seeded demo cabinet ${CABINET_ID} into ${tableName}`);
  console.log('Demo sign-in credentials (for recording only, not committed anywhere else):');
  for (const persona of PERSONAS) {
    console.log(`  ${persona.email} / ${DEMO_PASSWORD} (${persona.role}, sub=${subs[persona.key]})`);
  }
  console.log(
    `Both medicines start PENDING - F's retroactive check (DynamoDB stream on this put) will resolve them within ~10s if the cabinets stack is deployed and reachable, same as any other add-medicine flow. Trigger the actual demo moment with POST /v1/admin/demo/replay-month { "fixtureKey": "fixtures/demo/replay-1.json" } after running scripts/seed-demo-fixture.ts --stage ${stage}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
