import { describe, expect, it } from 'vitest';
import { CONTRACTS_PACKAGE_PLACEHOLDER } from './index';

describe('contracts package scaffold', () => {
  it('builds and runs', () => {
    expect(CONTRACTS_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
