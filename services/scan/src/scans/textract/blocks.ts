import type { Block } from '@aws-sdk/client-textract';

/** Plain OCR lines from `DetectDocumentText` / `AnalyzeDocument`'s LINE blocks, reading order. */
export function linesFromBlocks(blocks: Block[]): string[] {
  return blocks
    .filter((b) => b.BlockType === 'LINE' && b.Text)
    .map((b) => b.Text as string);
}

/**
 * Reconstructs the first TABLE in `AnalyzeDocument` Blocks (FeatureTypes:
 * ["TABLES"]) into a row-major grid of cell text, using each CELL's
 * RowIndex/ColumnIndex rather than position on the page. Returns [] if no
 * table was found.
 */
export function firstTableToGrid(blocks: Block[]): string[][] {
  const byId = new Map(blocks.filter((b) => b.Id).map((b) => [b.Id as string, b]));
  const table = blocks.find((b) => b.BlockType === 'TABLE');
  if (!table) return [];

  const cellIds = (table.Relationships ?? [])
    .filter((r) => r.Type === 'CHILD')
    .flatMap((r) => r.Ids ?? []);
  const cells = cellIds.map((id) => byId.get(id)).filter((b): b is Block => Boolean(b) && b?.BlockType === 'CELL');

  let maxRow = 0;
  let maxCol = 0;
  for (const cell of cells) {
    maxRow = Math.max(maxRow, cell.RowIndex ?? 0);
    maxCol = Math.max(maxCol, cell.ColumnIndex ?? 0);
  }
  if (maxRow === 0 || maxCol === 0) return [];

  const grid: string[][] = Array.from({ length: maxRow }, () => Array.from({ length: maxCol }, () => ''));
  for (const cell of cells) {
    const row = (cell.RowIndex ?? 1) - 1;
    const col = (cell.ColumnIndex ?? 1) - 1;
    const wordIds = (cell.Relationships ?? []).filter((r) => r.Type === 'CHILD').flatMap((r) => r.Ids ?? []);
    const text = wordIds
      .map((id) => byId.get(id))
      .filter((b): b is Block => Boolean(b))
      .map((b) => (b.BlockType === 'SELECTION_ELEMENT' ? '' : (b.Text ?? '')))
      .filter(Boolean)
      .join(' ');
    const gridRow = grid[row];
    if (gridRow) gridRow[col] = text;
  }
  return grid;
}
