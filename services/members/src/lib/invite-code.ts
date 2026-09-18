import { randomInt } from 'node:crypto';

/**
 * docs/PERMISSIONS.md: 8-char invite codes. Crockford-ish alphabet with
 * ambiguous characters (0/O, 1/I/L) removed so codes are easy to read aloud
 * or copy off a share sheet.
 */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
