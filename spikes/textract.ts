import { readFileSync } from 'node:fs';
import { AnalyzeDocumentCommand, TextractClient } from '@aws-sdk/client-textract';

const region = 'ap-south-1';

async function main(): Promise<void> {
  const client = new TextractClient({ region });
  const bytes = readFileSync('nsq-march-2025-page1.png');

  const res = await client.send(
    new AnalyzeDocumentCommand({
      Document: { Bytes: bytes },
      FeatureTypes: ['TABLES'],
    }),
  );

  const tables = (res.Blocks ?? []).filter((b) => b.BlockType === 'TABLE');
  const cells = (res.Blocks ?? []).filter((b) => b.BlockType === 'CELL');
  console.log('tables found:', tables.length, '| total cells:', cells.length);

  // Print row 3 (RowIndex 3) of table 1 as a spot-check - typically the first data row after headers.
  const blockById = new Map((res.Blocks ?? []).map((b) => [b.Id, b]));
  const wordText = (block: (typeof res.Blocks)[number]) =>
    (block?.Relationships ?? [])
      .filter((r) => r.Type === 'CHILD')
      .flatMap((r) => r.Ids ?? [])
      .map((id) => blockById.get(id))
      .filter((b) => b?.BlockType === 'WORD')
      .map((b) => b?.Text)
      .join(' ');

  const row3Cells = cells.filter((c) => c.RowIndex === 3).sort((a, b) => (a.ColumnIndex ?? 0) - (b.ColumnIndex ?? 0));
  for (const cell of row3Cells) {
    console.log(`  col ${cell.ColumnIndex}:`, JSON.stringify(wordText(cell)));
  }
}

main().catch((err) => {
  console.error('ERROR:', err.name, err.message);
  process.exitCode = 1;
});
