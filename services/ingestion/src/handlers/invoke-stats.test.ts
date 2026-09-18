import { beforeEach, describe, expect, it, vi } from 'vitest';

const ssmSend = vi.fn();
const lambdaSend = vi.fn();

vi.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: vi.fn().mockImplementation(() => ({ send: ssmSend })),
  GetParameterCommand: vi.fn((input: unknown) => ({ input })),
}));
vi.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: vi.fn().mockImplementation(() => ({ send: lambdaSend })),
  InvokeCommand: vi.fn((input: unknown) => ({ input })),
}));

describe('invoke-stats handler', () => {
  beforeEach(() => {
    ssmSend.mockReset();
    lambdaSend.mockReset().mockResolvedValue({});
    process.env.STAGE = 'dev-a2';
  });

  it('invokes the stats Lambda asynchronously when its ARN is present in SSM', async () => {
    ssmSend.mockResolvedValue({ Parameter: { Value: 'arn:aws:lambda:ap-south-1:111111111111:function:stats-job' } });

    const { handler } = await import('./invoke-stats');
    const out = await handler();

    expect(out.invoked).toBe(true);
    expect(lambdaSend).toHaveBeenCalledTimes(1);
    const invokeCommand = lambdaSend.mock.calls[0]![0];
    expect(invokeCommand.input.FunctionName).toBe('arn:aws:lambda:ap-south-1:111111111111:function:stats-job');
    expect(invokeCommand.input.InvocationType).toBe('Event');
  });

  it('no-ops when the SSM parameter does not exist (lane S not deployed yet)', async () => {
    ssmSend.mockRejectedValue(Object.assign(new Error('not found'), { name: 'ParameterNotFound' }));

    const { handler } = await import('./invoke-stats');
    const out = await handler();

    expect(out.invoked).toBe(false);
    expect(lambdaSend).not.toHaveBeenCalled();
  });
});
