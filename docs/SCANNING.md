# SCANNING.md — Extracting medicine details from images

## Input methods, in order of preference
1. **QR** (Wave 2, lane K): decode in the browser with a JS decoder; parse fields; send `qrText` with the scan or go straight to `/v1/checks` with `source: "qr"`. India's pack QR mandate (effective Aug 2023 for listed top brands) means many packs carry product, manufacturer, batch and dates. Verify the current mandate and payload formats before relying on it; payloads vary by manufacturer.
2. **Strip or carton photo** → Bedrock vision.
3. **Pharmacy bill photo** → Bedrock vision, many lines.
4. **Manual entry** always available, pre-filled with whatever was extracted.

## Client capture
- `<input type="file" accept="image/*" capture="environment">` (reliable across Android browsers).
- Downscale in the browser to max 2000 px on the long edge, JPEG quality 0.85, strip EXIF.
- Upload with the presigned URL from `/v1/uploads`; max 5 MB.

## Bedrock call
- Converse API, image as bytes, `temperature: 0`.
- Model ID from SSM `/asli/<stage>/bedrock/visionModelId` (T01 picks a Claude model available in ap-south-1, possibly via an inference profile).
- Force structured output with a single tool (`record_medicines`) whose input schema is the extraction schema below. Validate with Zod; on invalid output retry once, then return `EXTRACTION_FAILED` and prompt manual entry.
- Record input/output tokens as metrics.

### Extraction schema (strip)
```json
{
  "isMedicinePack": true,
  "productName": "string|null", "brandName": "string|null",
  "batchNumber": "string|null", "manufacturer": "string|null",
  "mfgDate": "string|null", "expDate": "string|null",
  "strength": "string|null", "dosageForm": "string|null", "mrp": "string|null",
  "confidence": {"batchNumber": 0.0, "manufacturer": 0.0, "productName": 0.0, "expDate": 0.0},
  "notes": "string|null"
}
```
### Extraction schema (bill)
`{ "isPharmacyBill": true, "lines": [ { "productName", "batchNumber", "expDate", "manufacturer", "quantity", "mrp", "confidence": {...} } ] }` — no patient, doctor, pharmacy or contact fields are requested, and any returned are dropped.

### Prompt rules (strip)
- Copy characters exactly as printed. Do not correct, guess or complete batch numbers.
- If a character is unclear, still return your best reading and lower `confidence.batchNumber`.
- Batch is usually labelled `B.No`, `Batch`, `Lot`. Do not confuse it with MRP, licence number (`Mfg. Lic. No`, `M.L.`), or dates.
- Manufacturer is usually after `Mfd. by` / `Manufactured by`; ignore `Marketed by` unless no manufacturer is printed (then put it in notes).
- Return null instead of inventing.

### Prompt rules (bill)
- One line per medicine item. Ignore totals, taxes, discounts, patient and doctor details.
- Batch column may be headed `Batch`, `B.No`, `Lot`.
- If a line has no batch number, set it to null (UI will ask for a strip photo for that item).

## Post-processing
- `batchNumber` → keep raw; matching normalizes.
- Dates → `parseMonth`.
- If `manufacturer` is null and `brandName`/`productName` present → look up Reference `BRAND#` candidates; attach `manufacturerCandidates` for matching (max tier VERIFY, see MATCHING.md).
- Bill: delete the S3 object immediately after a successful or failed extraction.
- Strip: object expires by lifecycle (1 day).

## UI after scan
Show extracted fields in an editable confirmation step whenever any confidence < 0.7 or the batch is null. The user confirms, then results are shown. Record whether the user edited the batch (metric `BatchEditedByUser`), which feeds accuracy reporting.
