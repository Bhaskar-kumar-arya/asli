import type { PharmacyCheckResponse } from '@asli/contracts';

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Exports the results table as CSV (plan/tasks/N-pharmacy-mode.md deliverable 2). */
export function downloadResultsCsv(response: PharmacyCheckResponse): void {
  const header = 'product,batch,manufacturer,quantity,tier,source_url';
  const rows = response.rows.map((row) => {
    const match = row.matches[0];
    return [
      row.identity.productName ?? '',
      row.identity.batchNumber,
      row.identity.manufacturer ?? '',
      String(row.quantity ?? ''),
      row.tier,
      match?.sourceUrl ?? '',
    ]
      .map(csvCell)
      .join(',');
  });

  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'asli-pharmacy-results.csv';
  link.click();
  URL.revokeObjectURL(url);
}
