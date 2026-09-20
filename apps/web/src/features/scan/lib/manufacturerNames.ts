/**
 * Type-ahead suggestions for the "Manufacturer" field (manual entry and confirm-details
 * screens). See lib/typeahead.ts for the shared ranking engine and its privacy notes.
 *
 * The seed dictionary below is real, well-known Indian pharmaceutical manufacturers -
 * deliberately NOT drawn from packages/contracts/fixtures/flagged-batches.json, whose
 * manufacturer names are synthetic test data invented for fixtures, not real companies.
 * Suggesting those would misleadingly imply real manufacturers are commonly flagged.
 */
import { rankSuggestions, readRecentSearches, recordSearch, type RecentSearch } from './typeahead';

const RECENT_SEARCHES_KEY = 'asli.recentManufacturerSearches';

export const COMMON_MANUFACTURER_NAMES: readonly string[] = [
  'Sun Pharmaceutical Industries Ltd.',
  'Cipla Ltd.',
  "Dr. Reddy's Laboratories Ltd.",
  'Lupin Ltd.',
  'Zydus Lifesciences Ltd.',
  'Mankind Pharma Ltd.',
  'Torrent Pharmaceuticals Ltd.',
  'Alkem Laboratories Ltd.',
  'Glenmark Pharmaceuticals Ltd.',
  'Aurobindo Pharma Ltd.',
  'Abbott India Ltd.',
  'GlaxoSmithKline Pharmaceuticals Ltd.',
  'Cadila Pharmaceuticals Ltd.',
  'Ipca Laboratories Ltd.',
  'Micro Labs Ltd.',
  'Intas Pharmaceuticals Ltd.',
  'Macleods Pharmaceuticals Pvt. Ltd.',
  'Emcure Pharmaceuticals Ltd.',
  'Biocon Ltd.',
  'Wockhardt Ltd.',
  'Hetero Drugs Ltd.',
  'Unichem Laboratories Ltd.',
  'Systopic Laboratories Pvt. Ltd.',
  'USV Pvt. Ltd.',
  'FDC Ltd.',
  'Ajanta Pharma Ltd.',
  'Indoco Remedies Ltd.',
  'Alembic Pharmaceuticals Ltd.',
];

export function getManufacturerSuggestions(query: string, recent: RecentSearch[], limit?: number): string[] {
  return rankSuggestions(query, recent, COMMON_MANUFACTURER_NAMES, limit);
}

export function getRecentManufacturerSearches(): RecentSearch[] {
  return readRecentSearches(RECENT_SEARCHES_KEY);
}

export function recordManufacturerSearch(name: string): void {
  recordSearch(RECENT_SEARCHES_KEY, name);
}
