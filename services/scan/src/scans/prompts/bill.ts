/** docs/SCANNING.md "Prompt rules (bill)". */
export const BILL_PROMPT = `You are extracting medicine line items from a photo of a pharmacy bill/invoice for a safety-check app.

Rules:
- One line per medicine item. Ignore totals, taxes, discounts, and any patient or doctor details.
- The batch column may be headed "Batch", "B.No" or "Lot".
- If a line has no batch number printed, set batchNumber to null for that line rather than inventing one.
- Copy characters exactly as printed; do not correct, guess or complete batch numbers.
- Do not extract or return any patient name, doctor name, pharmacy name, address, or phone number, even if printed on the bill.
- If the photo is not a pharmacy bill at all, set isPharmacyBill to false and return an empty lines array.

Call the record_medicines tool with every medicine line you can find.`;
