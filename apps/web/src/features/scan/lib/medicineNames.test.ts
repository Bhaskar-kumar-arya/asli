import { beforeEach, describe, expect, it } from 'vitest';
import { getMedicineSuggestions, getRecentMedicineSearches, recordMedicineSearch } from './medicineNames';

describe('medicineNames', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('ranks a prefix match first', () => {
    const results = getMedicineSuggestions('amox', []);
    expect(results[0]).toBe('Amoxicillin 500mg Capsules');
  });

  it('tolerates a couple of typo characters', () => {
    const results = getMedicineSuggestions('paracetmol', []);
    expect(results).toContain('Paracetamol 500mg Tablets');
  });

  it('does not suggest wildly different names', () => {
    const results = getMedicineSuggestions('xyzabc', []);
    expect(results).toHaveLength(0);
  });

  it('shows recent searches first when the field is empty', () => {
    recordMedicineSearch('Dolo 650');
    recordMedicineSearch('Dolo 650');
    recordMedicineSearch('Crocin');
    const results = getMedicineSuggestions('', getRecentMedicineSearches());
    expect(results[0]).toBe('Dolo 650');
    expect(results).toContain('Crocin');
  });

  it('boosts a recently searched name over the plain dictionary entry', () => {
    recordMedicineSearch('Amoxicillin');
    const results = getMedicineSuggestions('amox', getRecentMedicineSearches());
    expect(results[0]).toBe('Amoxicillin');
  });

  it('persists recent searches across calls via localStorage', () => {
    recordMedicineSearch('Metformin 500mg Tablets');
    expect(getRecentMedicineSearches().map((r) => r.name)).toContain('Metformin 500mg Tablets');
  });
});
