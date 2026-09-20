/**
 * Type-ahead suggestions for the "Medicine name" field (manual entry and confirm-details
 * screens). See lib/typeahead.ts for the shared ranking engine and its privacy notes.
 */
import { rankSuggestions, readRecentSearches, recordSearch, type RecentSearch } from './typeahead';

const RECENT_SEARCHES_KEY = 'asli.recentMedicineSearches';

export type RecentMedicineSearch = RecentSearch;

/**
 * Seed dictionary: the generic names CDSCO most often flags (from
 * packages/contracts/fixtures/flagged-batches.json) plus common Indian OTC brand names,
 * so the field has something to suggest before the user has any search history.
 */
export const COMMON_MEDICINE_NAMES: readonly string[] = [
  'Amlodipine 5mg Tablets',
  'Amoxicillin 500mg Capsules',
  'Atorvastatin 10mg Tablets',
  'Azithromycin 250mg Tablets',
  'Cefixime 200mg Tablets',
  'Cetirizine 10mg Tablets',
  'Chlorpheniramine 4mg Tablets',
  'Ciprofloxacin 500mg Tablets',
  'Diclofenac 50mg Tablets',
  'Domperidone 10mg Tablets',
  'Doxycycline 100mg Capsules',
  'Glimepiride 2mg Tablets',
  'Ibuprofen 400mg Tablets',
  'Ivermectin 12mg Tablets',
  'Levocetirizine 5mg Tablets',
  'Losartan 50mg Tablets',
  'Metformin 500mg Tablets',
  'Norfloxacin 400mg Tablets',
  'Ofloxacin 200mg Tablets',
  'Omeprazole 20mg Capsules',
  'Ondansetron 4mg Tablets',
  'Pantoprazole 40mg Tablets',
  'Paracetamol 500mg Tablets',
  'Paracetamol 650mg Tablets',
  'Prednisolone 5mg Tablets',
  'Ranitidine 150mg Tablets',
  'Salbutamol 4mg Tablets',
  'Dolo 650',
  'Crocin',
  'Combiflam',
  'Saridon',
  'Disprin',
  'Calpol',
  'Augmentin',
  'Azee 500',
  'Pan-D',
  'Aciloc',
  'Rantac',
  'Volini Gel',
  'Digene',
];

export function getMedicineSuggestions(query: string, recent: RecentSearch[], limit?: number): string[] {
  return rankSuggestions(query, recent, COMMON_MEDICINE_NAMES, limit);
}

export function getRecentMedicineSearches(): RecentSearch[] {
  return readRecentSearches(RECENT_SEARCHES_KEY);
}

export function recordMedicineSearch(name: string): void {
  recordSearch(RECENT_SEARCHES_KEY, name);
}
