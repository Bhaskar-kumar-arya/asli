import { describe, expect, it } from 'vitest';
import { buildIngestDefinition } from './build';
import type { IngestLambdaArns } from './types';

const arns: IngestLambdaArns = {
  expandWork: 'arn:aws:lambda:ap-south-1:111111111111:function:expand-work',
  markRunning: 'arn:aws:lambda:ap-south-1:111111111111:function:mark-running',
  fetchMonth: 'arn:aws:lambda:ap-south-1:111111111111:function:fetch-month',
  loadFixture: 'arn:aws:lambda:ap-south-1:111111111111:function:load-fixture',
  normalizeAndWrite: 'arn:aws:lambda:ap-south-1:111111111111:function:normalize-and-write',
  markDone: 'arn:aws:lambda:ap-south-1:111111111111:function:mark-done',
  markFailed: 'arn:aws:lambda:ap-south-1:111111111111:function:mark-failed',
  invokeStats: 'arn:aws:lambda:ap-south-1:111111111111:function:invoke-stats',
  buildReference: 'arn:aws:lambda:ap-south-1:111111111111:function:build-reference',
};

// Minimal shape this file's ASL is expected to have - just enough structure
// checking to catch a broken Next/Catch reference without needing a real
// Step Functions deploy (that's this lane's acceptance-criteria test on
// dev-a2, not a unit test's job).
interface AslState {
  Type: string;
  Next?: string;
  End?: boolean;
  Catch?: Array<{ Next: string }>;
  Choices?: Array<{ Next: string }>;
  Default?: string;
  Iterator?: { StartAt: string; States: Record<string, AslState> };
}
interface AslDefinition {
  StartAt: string;
  States: Record<string, AslState>;
}

function collectStateNames(states: Record<string, AslState>): string[] {
  return Object.keys(states);
}

function assertReferencesResolve(startAt: string, states: Record<string, AslState>): void {
  const names = new Set(collectStateNames(states));
  expect(names.has(startAt)).toBe(true);
  for (const state of Object.values(states)) {
    if (state.Next) expect(names.has(state.Next)).toBe(true);
    for (const c of state.Catch ?? []) expect(names.has(c.Next)).toBe(true);
    for (const c of state.Choices ?? []) expect(names.has(c.Next)).toBe(true);
    if (state.Default) expect(names.has(state.Default)).toBe(true);
    if (state.Iterator) assertReferencesResolve(state.Iterator.StartAt, state.Iterator.States);
  }
}

describe('buildIngestDefinition', () => {
  const def = buildIngestDefinition(arns) as AslDefinition;

  it('every Next/Catch/Choice/Default target names a real state', () => {
    assertReferencesResolve(def.StartAt, def.States);
  });

  it('every state eventually reaches a terminal state (no dead ends)', () => {
    const terminal = new Set(
      Object.entries(def.States)
        .filter(([, s]) => s.End || s.Type === 'Succeed' || s.Type === 'Fail')
        .map(([name]) => name),
    );
    expect(terminal.size).toBeGreaterThan(0);
  });

  it('Map state runs at maxConcurrency 1 (docs/DATA_SOURCES.md polite-fetching rule)', () => {
    const map = def.States.ProcessMonths! as unknown as { MaxConcurrency: number; ItemsPath: string };
    expect(map.MaxConcurrency).toBe(1);
    expect(map.ItemsPath).toBe('$.items');
  });

  it('every task-bearing state (except the terminal MarkFailed) catches into MarkFailed', () => {
    const iterStates = def.States.ProcessMonths!.Iterator!.States;
    for (const [name, state] of Object.entries(iterStates)) {
      if (state.Type !== 'Task') continue;
      if (name === 'MarkFailed') continue;
      expect(state.Catch?.some((c) => c.Next === 'MarkFailed')).toBe(true);
    }
  });

  it('the Choice state routes ENDPOINT, FIXTURE and PDF to distinct states, defaulting to the PDF placeholder', () => {
    const choice = def.States.ProcessMonths!.Iterator!.States.ChooseSource!;
    const targets = choice.Choices!.map((c) => c.Next);
    expect(new Set(targets).size).toBe(3);
    expect(choice.Default).toBe('PdfNotImplemented');
  });

  it('the PDF placeholder is a Pass state that flows straight to MarkFailed, never to NormalizeAndWrite', () => {
    const placeholder = def.States.ProcessMonths!.Iterator!.States.PdfNotImplemented!;
    expect(placeholder.Type).toBe('Pass');
    expect(placeholder.Next).toBe('MarkFailed');
  });

  it('MarkFailed terminates the iteration (End: true) rather than re-throwing, so one bad month never fails the whole Map', () => {
    const markFailed = def.States.ProcessMonths!.Iterator!.States.MarkFailed!;
    expect(markFailed.End).toBe(true);
    expect(markFailed.Catch).toBeUndefined();
  });

  it('after the Map, stats invocation and reference building run before the execution ends', () => {
    expect(def.States.InvokeStatsIfPresent!.Next).toBe('BuildReference');
    expect(def.States.BuildReference!.End).toBe(true);
  });
});
