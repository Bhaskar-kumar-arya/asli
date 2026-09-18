/** Must match services/pharmacy/src/csv.ts's header aliases. */
export const CSV_TEMPLATE_HEADER = 'product,batch,manufacturer,expiry,quantity';

const TEMPLATE_ROWS = [CSV_TEMPLATE_HEADER, 'Paracetamol 500mg,GTL1258,Cipla,2027-01,10'].join('\n');

/** Triggers a browser download of the pharmacy CSV template (plan/tasks/N-pharmacy-mode.md). */
export function downloadCsvTemplate(): void {
  const blob = new Blob([TEMPLATE_ROWS], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'asli-pharmacy-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}
