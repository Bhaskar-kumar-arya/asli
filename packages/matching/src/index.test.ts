import { describe, expect, it } from 'vitest';
import { MATCHING_PACKAGE_PLACEHOLDER } from './index';

describe('matching package scaffold', () => {
  it('builds and runs', () => {
    expect(MATCHING_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
