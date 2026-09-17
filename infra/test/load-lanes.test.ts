import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { App } from 'aws-cdk-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listLaneFiles, registerLanes, type LaneModule } from '../lib/load-lanes';

describe('lane auto-loading (dummy lane dropped in, no app.ts edits)', () => {
  let lanesDir: string;

  beforeEach(() => {
    lanesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asli-lanes-'));
    fs.writeFileSync(path.join(lanesDir, 'README.md'), '# not a lane');
    fs.writeFileSync(path.join(lanesDir, '_scratch.ts'), '// ignored, leading underscore');
    fs.writeFileSync(path.join(lanesDir, 'z9.ts'), '// dummy lane for the test');
  });

  afterEach(() => {
    fs.rmSync(lanesDir, { recursive: true, force: true });
  });

  it('lists only lane .ts files, excluding README and underscore-prefixed files', () => {
    expect(listLaneFiles(lanesDir)).toEqual(['z9.ts']);
  });

  it('calls register(app, stage) for a dropped-in dummy lane without touching app.ts', () => {
    const registerSpy = vi.fn();
    const fakeRequire = (modulePath: string): LaneModule => {
      expect(modulePath).toBe(path.join(lanesDir, 'z9.ts'));
      return { register: registerSpy };
    };

    const app = {} as App;
    const registered = registerLanes(app, 'dev-t00', lanesDir, fakeRequire);

    expect(registered).toEqual(['z9.ts']);
    expect(registerSpy).toHaveBeenCalledWith(app, 'dev-t00');
  });

  it('skips a lane file that does not export register(), with a warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fakeRequire = (): LaneModule => ({});

    const app = {} as App;
    const registered = registerLanes(app, 'dev-t00', lanesDir, fakeRequire);

    expect(registered).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('z9.ts'));
    warnSpy.mockRestore();
  });
});
