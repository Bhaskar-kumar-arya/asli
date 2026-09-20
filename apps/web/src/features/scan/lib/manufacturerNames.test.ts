import { beforeEach, describe, expect, it } from 'vitest';
import {
  getManufacturerSuggestions,
  getRecentManufacturerSearches,
  recordManufacturerSearch,
} from './manufacturerNames';

describe('manufacturerNames', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('ranks a prefix match first', () => {
    const results = getManufacturerSuggestions('cipl', []);
    expect(results[0]).toBe('Cipla Ltd.');
  });

  it('tolerates a couple of typo characters', () => {
    const results = getManufacturerSuggestions('torent', []);
    expect(results).toContain('Torrent Pharmaceuticals Ltd.');
  });

  it('does not suggest wildly different names', () => {
    const results = getManufacturerSuggestions('xyzabc', []);
    expect(results).toHaveLength(0);
  });

  it('boosts a recently searched manufacturer over the plain dictionary entry', () => {
    recordManufacturerSearch('Cipla');
    const results = getManufacturerSuggestions('cipl', getRecentManufacturerSearches());
    expect(results[0]).toBe('Cipla');
  });

  it('keeps its own recent-search history separate from the medicine name field', () => {
    recordManufacturerSearch('Lupin Ltd.');
    const stored = window.localStorage.getItem('asli.recentManufacturerSearches');
    expect(stored).toContain('Lupin Ltd.');
    expect(window.localStorage.getItem('asli.recentMedicineSearches')).toBeNull();
  });
});
