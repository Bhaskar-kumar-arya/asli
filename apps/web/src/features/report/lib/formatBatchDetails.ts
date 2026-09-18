import type { MedicineIdentity } from '@asli/contracts';

/** Plain-text summary a user can copy into the PvPI form or read out on a call (deliverable 2). */
export function formatBatchDetails(identity: MedicineIdentity): string {
  const lines: [string, string | number | undefined][] = [
    ['Product', identity.productName ?? identity.brandName],
    ['Batch number', identity.batchNumber],
    ['Manufacturer', identity.manufacturer],
    ['Strength', identity.strength],
    ['Dosage form', identity.dosageForm],
    ['Mfg. month', identity.mfgMonth],
    ['Exp. month', identity.expMonth],
  ];
  return lines
    .filter((line): line is [string, string | number] => line[1] !== undefined && line[1] !== '')
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}
