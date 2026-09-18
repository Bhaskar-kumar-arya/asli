#!/usr/bin/env tsx
/**
 * Label helper CLI - plan/tasks/E-accuracy-harness.md deliverable 2.
 * Walks unlabelled images in testset/strips and testset/bills, asks for the
 * ground-truth fields from docs/TESTING.md's label JSON shape, and writes
 * `<id>.json` next to the image.
 *
 * Usage: pnpm --filter @asli/accuracy-harness label
 */
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import type { Label } from './types';
import { LabelSchema } from './types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TESTSET_ROOT = join(__dirname, '..', '..', '..', 'testset');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function ask(question: string, fallback?: string): Promise<string> {
  const suffix = fallback !== undefined ? ` [${fallback}]` : '';
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer.length > 0 ? answer : (fallback ?? '');
}

async function askOptional(question: string): Promise<string | undefined> {
  const answer = await ask(question);
  return answer.length > 0 ? answer : undefined;
}

async function askBool(question: string): Promise<boolean> {
  const answer = (await ask(`${question} (y/n)`, 'n')).toLowerCase();
  return answer === 'y' || answer === 'yes';
}

async function askEnum<T extends string>(question: string, options: T[]): Promise<T> {
  const answer = (await ask(`${question} (${options.join('/')})`, options[0])).toLowerCase();
  return (options.find((o) => o === answer) ?? options[0]) as T;
}

function findUnlabelled(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.filter((f) => {
    if (!IMAGE_EXTENSIONS.has(extname(f).toLowerCase())) return false;
    const id = f.slice(0, f.length - extname(f).length);
    return !existsSync(join(dir, `${id}.json`));
  });
}

async function labelStrip(): Promise<Label> {
  const productName = await askOptional('Product name');
  const batchNumber = await ask('Batch number (as printed)');
  const manufacturer = await askOptional('Manufacturer (as printed)');
  const expMonth = await askOptional('Expiry month (YYYY-MM)');
  return {
    kind: 'strip',
    truth: { productName, batchNumber, manufacturer, expMonth },
    conditions: await askConditions(),
  };
}

async function labelBill(): Promise<Label> {
  const lineCount = Number(await ask('How many medicine lines on this bill', '1'));
  const lines = [];
  for (let i = 0; i < lineCount; i++) {
    console.log(`-- Line ${i + 1} --`);
    lines.push({
      productName: await askOptional('  Product name'),
      batchNumber: await askOptional('  Batch number'),
      manufacturer: await askOptional('  Manufacturer'),
      expMonth: await askOptional('  Expiry month (YYYY-MM)'),
    });
  }
  return { kind: 'bill', truth: { lines }, conditions: await askConditions() };
}

async function askConditions(): Promise<Label['conditions']> {
  return {
    foil: await askBool('Foil packaging visible'),
    lighting: await askEnum('Lighting', ['good', 'poor']),
    angle: await askEnum('Angle', ['flat', 'tilted']),
    blur: await askBool('Noticeably blurry'),
  };
}

async function labelDir(dir: string, kind: 'strip' | 'bill'): Promise<number> {
  const unlabelled = findUnlabelled(dir);
  for (const file of unlabelled) {
    const id = file.slice(0, file.length - extname(file).length);
    console.log(`\n=== ${join(dir, file)} ===`);
    const label = kind === 'strip' ? await labelStrip() : await labelBill();
    const parsed = LabelSchema.parse(label);
    writeFileSync(join(dir, `${id}.json`), JSON.stringify(parsed, null, 2));
    console.log(`Wrote ${join(dir, `${id}.json`)}`);
  }
  return unlabelled.length;
}

async function main(): Promise<void> {
  const stripsDir = join(TESTSET_ROOT, 'strips');
  const billsDir = join(TESTSET_ROOT, 'bills');
  console.log('Open each image file yourself (Explorer/Preview) while answering these prompts.');
  const strips = await labelDir(stripsDir, 'strip');
  const bills = await labelDir(billsDir, 'bill');
  console.log(`\nLabelled ${strips} strip(s) and ${bills} bill(s).`);
  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exitCode = 1;
});
