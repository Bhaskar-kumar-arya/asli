#!/usr/bin/env tsx
/**
 * Starts one `asli-<stage>-ingest` execution covering every month from
 * `--from` through the current month (this task's Deliverable 5).
 *
 * Usage: tsx scripts/backfill.ts --stage dev-a2 --from 2023-01
 */
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

function parseArgs(): { stage: string; from: string } {
  const stageIdx = process.argv.indexOf('--stage');
  const fromIdx = process.argv.indexOf('--from');
  const stage = stageIdx !== -1 ? process.argv[stageIdx + 1] : undefined;
  const from = fromIdx !== -1 ? process.argv[fromIdx + 1] : undefined;
  if (!stage || !from || !/^\d{4}-\d{2}$/.test(from)) {
    throw new Error('Usage: tsx scripts/backfill.ts --stage <stage> --from <YYYY-MM>');
  }
  return { stage, from };
}

export function monthsSince(from: string, now: Date = new Date()): string[] {
  const [fromYear, fromMonth] = from.split('-').map(Number) as [number, number];
  const months: string[] = [];
  let year = fromYear;
  let month = fromMonth;
  const endYear = now.getUTCFullYear();
  const endMonth = now.getUTCMonth() + 1;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

async function main(): Promise<void> {
  const { stage, from } = parseArgs();
  const ssm = new SSMClient({ region: 'ap-south-1' });
  const param = await ssm.send(new GetParameterCommand({ Name: `/asli/${stage}/a2/ingestStateMachineArn` }));
  const stateMachineArn = param.Parameter?.Value;
  if (!stateMachineArn) throw new Error(`No ingest state machine ARN found for stage ${stage}`);

  const months = monthsSince(from);
  const sfn = new SFNClient({ region: 'ap-south-1' });
  const res = await sfn.send(
    new StartExecutionCommand({
      stateMachineArn,
      input: JSON.stringify({ months, tabs: ['nsq', 'spurious'], sourceType: 'ENDPOINT' }),
    }),
  );

  console.log(
    `Started backfill execution ${res.executionArn} for ${months.length} months (${months[0]}..${months[months.length - 1]})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
