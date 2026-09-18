import { describe, expect, it } from 'vitest';
import { generateInviteCode } from './invite-code';

describe('generateInviteCode', () => {
  it('generates an 8-char code from the unambiguous alphabet', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it('is not deterministic', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
