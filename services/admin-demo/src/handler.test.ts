import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpApiEvent } from './handler';

const sfnSend = vi.fn();
vi.mock('@aws-sdk/client-sfn', () => ({
  SFNClient: vi.fn().mockImplementation(() => ({ send: sfnSend })),
  StartExecutionCommand: vi.fn((input: unknown) => ({ input })),
}));

function eventWithGroups(groups: string | string[] | undefined, body?: object): HttpApiEvent {
  return {
    body: body ? JSON.stringify(body) : undefined,
    requestContext: { authorizer: { jwt: { claims: { 'cognito:groups': groups } } } },
  };
}

describe('admin demo-replay handler', () => {
  beforeEach(() => {
    sfnSend.mockReset().mockResolvedValue({ executionArn: 'arn:aws:states:...:execution:ingest:demo-1' });
    process.env.STATE_MACHINE_ARN = 'arn:aws:states:ap-south-1:111111111111:stateMachine:asli-dev-a2-ingest';
    delete process.env.DEMO_REPLAY_ALLOWED_STAGE;
    delete process.env.STAGE;
  });

  it('rejects a caller without the admin group', async () => {
    const { handler } = await import('./handler');
    const res = await handler(eventWithGroups('member', { fixtureKey: 'fixtures/demo/replay-1.json' }));
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error.code).toBe('FORBIDDEN');
    expect(sfnSend).not.toHaveBeenCalled();
  });

  it('accepts a caller whose group claim arrives as "[admin]" (real API Gateway HTTP API JWT authorizer shape, confirmed by logging the live claims object)', async () => {
    const { handler } = await import('./handler');
    const res = await handler(eventWithGroups('[admin]', { fixtureKey: 'fixtures/demo/replay-1.json' }));
    expect(res.statusCode).toBe(200);
    expect(sfnSend).toHaveBeenCalledTimes(1);
  });

  it('accepts a caller whose group claim arrives as "[member, admin]"', async () => {
    const { handler } = await import('./handler');
    const res = await handler(eventWithGroups('[member, admin]', { fixtureKey: 'fixtures/demo/replay-1.json' }));
    expect(res.statusCode).toBe(200);
    expect(sfnSend).toHaveBeenCalledTimes(1);
  });

  it('accepts a caller whose group claim arrives as a plain comma-joined string with no brackets', async () => {
    const { handler } = await import('./handler');
    const res = await handler(eventWithGroups('member, admin', { fixtureKey: 'fixtures/demo/replay-1.json' }));
    expect(res.statusCode).toBe(200);
    expect(sfnSend).toHaveBeenCalledTimes(1);
  });

  it('accepts a caller in the admin group and starts the state machine with sourceType FIXTURE', async () => {
    const { handler } = await import('./handler');
    const res = await handler(eventWithGroups(['admin'], { fixtureKey: 'fixtures/demo/replay-1.json' }));

    expect(res.statusCode).toBe(200);
    expect(sfnSend).toHaveBeenCalledTimes(1);
    const startInput = JSON.parse(sfnSend.mock.calls[0]![0].input.input);
    expect(startInput).toEqual({
      months: ['DEMO'],
      tabs: ['nsq'],
      sourceType: 'FIXTURE',
      fixtureKey: 'fixtures/demo/replay-1.json',
    });
    expect(JSON.parse(res.body)).toEqual({ executionArn: 'arn:aws:states:...:execution:ingest:demo-1' });
  });

  it('accepts a comma-separated string groups claim as well as an array', async () => {
    const { handler } = await import('./handler');
    const res = await handler(eventWithGroups('member,admin', { fixtureKey: 'fixtures/demo/replay-1.json' }));
    expect(res.statusCode).toBe(200);
  });

  it('rejects a malformed body', async () => {
    const { handler } = await import('./handler');
    const res = await handler({
      body: '{not json',
      requestContext: { authorizer: { jwt: { claims: { 'cognito:groups': ['admin'] } } } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a body missing fixtureKey', async () => {
    const { handler } = await import('./handler');
    const res = await handler(eventWithGroups(['admin'], {}));
    expect(res.statusCode).toBe(400);
  });

  it('enforces DEMO_REPLAY_ALLOWED_STAGE when set (docs/API.md "stage int only")', async () => {
    process.env.DEMO_REPLAY_ALLOWED_STAGE = 'int';
    process.env.STAGE = 'dev-a2';
    const { handler } = await import('./handler');
    const res = await handler(eventWithGroups(['admin'], { fixtureKey: 'fixtures/demo/replay-1.json' }));
    expect(res.statusCode).toBe(403);
    expect(sfnSend).not.toHaveBeenCalled();
  });

  it('allows the call once STAGE matches DEMO_REPLAY_ALLOWED_STAGE', async () => {
    process.env.DEMO_REPLAY_ALLOWED_STAGE = 'dev-a2';
    process.env.STAGE = 'dev-a2';
    const { handler } = await import('./handler');
    const res = await handler(eventWithGroups(['admin'], { fixtureKey: 'fixtures/demo/replay-1.json' }));
    expect(res.statusCode).toBe(200);
  });
});
