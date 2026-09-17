import { describe, expect, it } from 'vitest';
import { CONTENT_PACKAGE_PLACEHOLDER } from './index';

describe('content package scaffold', () => {
  it('builds and runs', () => {
    expect(CONTENT_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
