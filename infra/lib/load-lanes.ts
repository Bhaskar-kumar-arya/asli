import * as fs from 'node:fs';
import * as path from 'node:path';
import type { App } from 'aws-cdk-lib';

export interface LaneModule {
  register?: (app: App, stage: string) => void;
}

/** Lane filenames in `lanesDir`, sorted, excluding README and files starting with "_". */
export function listLaneFiles(lanesDir: string): string[] {
  return fs
    .readdirSync(lanesDir)
    .filter((f) => f.endsWith('.ts') && !f.startsWith('_'))
    .sort();
}

/** require() + call register(app, stage) for every lane file found in `lanesDir`. */
export function registerLanes(
  app: App,
  stage: string,
  lanesDir: string,
  requireFn: (modulePath: string) => LaneModule = require,
): string[] {
  const registered: string[] = [];
  for (const file of listLaneFiles(lanesDir)) {
    const mod = requireFn(path.join(lanesDir, file));
    if (typeof mod.register === 'function') {
      mod.register(app, stage);
      registered.push(file);
    } else {
      console.warn(`infra/lib/lanes/${file} does not export register(app, stage) - skipped`);
    }
  }
  return registered;
}
