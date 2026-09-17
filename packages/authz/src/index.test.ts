import { describe, expect, it } from 'vitest';
import { AUTHZ_PACKAGE_PLACEHOLDER } from './index';

describe('authz package scaffold', () => {
  it('builds and runs', () => {
    expect(AUTHZ_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
