import type { AliasMap } from './types';

/**
 * Builds an AliasMap from Reference `MFR#<manufacturerNorm>` / `ALIAS#<aliasNorm>`
 * rows (docs/DATA_MODEL.md). Pure - the caller fetches rows from DynamoDB and
 * passes them in; this package does no I/O.
 */
export function buildAliasMap(rows: Array<{ aliasNorm: string; canonicalManufacturerNorm: string }>): AliasMap {
  const map: AliasMap = {};
  for (const row of rows) {
    map[row.aliasNorm] = row.canonicalManufacturerNorm;
  }
  return map;
}

/** Applies an alias map to an already-normalized manufacturer string. */
export function applyAlias(normalized: string, aliases: AliasMap | undefined): string {
  return aliases?.[normalized] ?? normalized;
}
