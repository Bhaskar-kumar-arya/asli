import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { LabelSchema, type TestsetItem } from './types';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

/**
 * Loads every `<id>.jpg` + `<id>.json` pair from `testset/<kind>s/`.
 * Images without a matching label are skipped (still being collected/labelled).
 */
export function loadTestsetDir(dir: string, kind: 'strip' | 'bill'): TestsetItem[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  const images = entries.filter((f) => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()));
  const items: TestsetItem[] = [];

  for (const image of images) {
    const id = image.slice(0, image.length - extname(image).length);
    const labelPath = join(dir, `${id}.json`);
    let raw: string;
    try {
      raw = readFileSync(labelPath, 'utf8');
    } catch {
      continue; // not labelled yet
    }
    const parsed = LabelSchema.parse(JSON.parse(raw));
    if (parsed.kind !== kind) {
      throw new Error(`${labelPath}: label kind "${parsed.kind}" does not match directory "${kind}"`);
    }
    items.push({ id, kind, imagePath: join(dir, image), label: parsed });
  }

  return items;
}

export interface Testset {
  strips: TestsetItem[];
  bills: TestsetItem[];
}

export function loadTestset(root: string): Testset {
  return {
    strips: loadTestsetDir(join(root, 'strips'), 'strip'),
    bills: loadTestsetDir(join(root, 'bills'), 'bill'),
  };
}
