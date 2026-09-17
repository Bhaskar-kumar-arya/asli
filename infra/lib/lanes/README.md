# infra/lib/lanes/

Each lane owns exactly one file here: its CDK construct/stack for its own resources.
Nobody edits `infra/bin/app.ts` to wire a new lane in - drop a file here and it is
picked up automatically.

## Contract

A lane file must have a default-ish shape: export a function named `register`:

```ts
// infra/lib/lanes/a1.ts
import type { App } from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';
import { cdkEnv, stackName } from '../stage';
import { nodeFn } from '../node-fn';
import { importParam } from '../ssm';

export function register(app: App, stage: string): void {
  const stack = new Stack(app, stackName('LaneA1Stack', stage), { env: cdkEnv() });

  const tableName = importParam(stack, process.env.SHARED_STAGE ?? 'dev-shared', '/tables/medicines');

  nodeFn(stack, 'A1Handler', {
    serviceName: 'a1-cdsco-client',
    entry: '../../services/a1-cdsco-client/src/handler.ts',
    environment: { TABLE_NAME: tableName },
  });
}
```

- `app.ts` calls `register(app, STAGE)` for every `*.ts` file in this folder (except this README
  and files starting with `_`).
- Import shared resources only via `infra/lib/ssm.ts` helpers reading `/asli/<stage>/...` - never
  hardcode ARNs or reach into another lane's stack.
- One file, one stack, one lane. If you need more than one stack, nest constructs inside yours.
- Filename should match your lane ID, e.g. `a1.ts`, `b.ts`, `g2.ts`.
