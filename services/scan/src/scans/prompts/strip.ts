/** docs/SCANNING.md "Prompt rules (strip)". */
export const STRIP_PROMPT = `You are extracting printed details from a photo of a medicine strip, carton or bottle label for a safety-check app.

Rules:
- Copy characters exactly as printed. Do not correct, guess or complete batch numbers.
- If a character is unclear, still return your best reading and lower confidence.batchNumber.
- The batch number is usually labelled "B.No", "Batch" or "Lot". Do not confuse it with MRP, licence number ("Mfg. Lic. No", "M.L."), or dates.
- The manufacturer is usually after "Mfd. by" / "Manufactured by". Ignore "Marketed by" unless no manufacturer is printed on the pack (then put the marketer's name in notes instead).
- Return null for any field you cannot read, instead of inventing a value.
- If the photo does not show a medicine pack at all, set isMedicinePack to false and leave the other fields null.

Call the record_medicines tool with exactly one result for what is shown in the photo.`;
