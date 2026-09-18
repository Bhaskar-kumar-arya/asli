import { describe, expect, it } from 'vitest';
import { applyAlias, buildAliasMap } from './alias';

describe('buildAliasMap / applyAlias', () => {
  it('builds a map from alias rows and applies it', () => {
    const map = buildAliasMap([
      { aliasNorm: 'CIPLA LTD', canonicalManufacturerNorm: 'CIPLA' },
      { aliasNorm: 'CIPLA INDIA', canonicalManufacturerNorm: 'CIPLA' },
    ]);
    expect(applyAlias('CIPLA LTD', map)).toBe('CIPLA');
    expect(applyAlias('CIPLA INDIA', map)).toBe('CIPLA');
  });

  it('returns the input unchanged when there is no matching alias', () => {
    const map = buildAliasMap([{ aliasNorm: 'CIPLA LTD', canonicalManufacturerNorm: 'CIPLA' }]);
    expect(applyAlias('UNKNOWN MFR', map)).toBe('UNKNOWN MFR');
  });

  it('returns the input unchanged when no map is given', () => {
    expect(applyAlias('CIPLA', undefined)).toBe('CIPLA');
  });
});
