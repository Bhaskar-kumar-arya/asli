import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadTestset, loadTestsetDir } from './testset';

describe('loadTestsetDir', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'testset-strips-'));
    writeFileSync(join(dir, 'a.jpg'), 'fake-image-bytes');
    writeFileSync(
      join(dir, 'a.json'),
      JSON.stringify({
        kind: 'strip',
        truth: { batchNumber: 'GTL1258' },
        conditions: { foil: true, lighting: 'good', angle: 'flat', blur: false },
      }),
    );
    writeFileSync(join(dir, 'b.jpg'), 'unlabelled'); // no b.json - should be skipped
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('loads only images with a matching label file', () => {
    const items = loadTestsetDir(dir, 'strip');
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('a');
    expect(items[0]?.label.kind).toBe('strip');
  });

  it('returns an empty array for a missing directory', () => {
    expect(loadTestsetDir(join(dir, 'does-not-exist'), 'strip')).toEqual([]);
  });

  it('throws if a label file kind does not match its directory', () => {
    writeFileSync(join(dir, 'c.jpg'), 'x');
    writeFileSync(
      join(dir, 'c.json'),
      JSON.stringify({ kind: 'bill', truth: { lines: [{ batchNumber: 'X' }] }, conditions: { foil: false, lighting: 'good', angle: 'flat', blur: false } }),
    );
    expect(() => loadTestsetDir(dir, 'strip')).toThrow(/does not match directory/);
  });
});

describe('loadTestset', () => {
  it('reads both strips and bills subdirectories under a root', () => {
    const root = mkdtempSync(join(tmpdir(), 'testset-root-'));
    try {
      const testset = loadTestset(root);
      expect(testset.strips).toEqual([]);
      expect(testset.bills).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
