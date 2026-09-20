import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { DemoReplayRequestSchema, type DemoReplayResponse } from '@asli/contracts';

const sfn = new SFNClient({});

/**
 * Minimal shape of the API Gateway HTTP API (payload format 2.0) proxy event
 * this handler needs - avoids an `@types/aws-lambda` dependency for two fields.
 */
export interface HttpApiEvent {
  body?: string;
  isBase64Encoded?: boolean;
  requestContext: {
    authorizer?: { jwt?: { claims?: Record<string, unknown> } };
  };
}
export interface HttpApiResult {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} env var is required`);
  return value;
}

function errorResponse(statusCode: number, code: string, message: string): HttpApiResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: { code, message, requestId: 'admin-demo-replay' } }),
  };
}

function isAdmin(event: HttpApiEvent): boolean {
  const claim = event.requestContext.authorizer?.jwt?.claims?.['cognito:groups'];
  if (Array.isArray(claim)) return claim.includes('admin');
  if (typeof claim === 'string') {
    // API Gateway's HTTP API JWT authorizer serializes an array-valued claim like
    // cognito:groups as "[admin]" or "[admin, other]" - square brackets, but NOT valid
    // JSON (values aren't quoted). Confirmed by logging the real claims object against
    // the live deployed endpoint; unit tests pass the claim as a real array or a plain
    // comma string and never exercised this actual bracketed shape.
    const stripped = claim.trim().replace(/^\[/, '').replace(/\]$/, '');
    return stripped
      .split(',')
      .map((g) => g.trim())
      .includes('admin');
  }
  return false;
}

/**
 * `POST /v1/admin/demo/replay-month` (docs/API.md, docs/ALERTS.md demo path).
 * API Gateway's JWT authorizer only validates the token itself - it can't
 * check the `cognito:groups` claim (infra/lib/api-routes.ts), so the admin
 * gate lives here. "stage int only" (docs/API.md) is enforced via
 * DEMO_REPLAY_ALLOWED_STAGE, which infra/lib/lanes/a2-ingestion.ts sets to
 * "int" when deployed there; this lane's own dev-a2 testing sets it to
 * "dev-a2" so the acceptance criterion is testable without touching int
 * (CLAUDE.md: only T02/X/Z1 deploy there).
 */
export async function handler(event: HttpApiEvent): Promise<HttpApiResult> {
  if (!isAdmin(event)) {
    return errorResponse(403, 'FORBIDDEN', 'Demo replay requires the admin group');
  }

  const allowedStage = process.env.DEMO_REPLAY_ALLOWED_STAGE;
  if (allowedStage && process.env.STAGE !== allowedStage) {
    return errorResponse(403, 'FORBIDDEN', 'Demo replay is disabled on this stage');
  }

  let body: unknown;
  try {
    const raw = event.body ?? '{}';
    body = JSON.parse(event.isBase64Encoded ? Buffer.from(raw, 'base64').toString('utf8') : raw);
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'Invalid JSON body');
  }

  const parsed = DemoReplayRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(400, 'BAD_REQUEST', parsed.error.message);
  }

  const stateMachineArn = requireEnv('STATE_MACHINE_ARN');
  const input = {
    months: ['DEMO'],
    tabs: ['nsq'],
    sourceType: 'FIXTURE',
    fixtureKey: parsed.data.fixtureKey,
  };

  const res = await sfn.send(new StartExecutionCommand({ stateMachineArn, input: JSON.stringify(input) }));
  if (!res.executionArn) throw new Error('StartExecutionCommand did not return an executionArn');

  const response: DemoReplayResponse = { executionArn: res.executionArn };
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(response) };
}
