# @asli/qr-parse

Parses a pack QR payload that's already been decoded to text in the browser
(docs/SCANNING.md "Input methods" §1, lane K). Pure TypeScript, no I/O - the
caller decodes the QR image (e.g. with `jsQR`) and hands this the resulting
string.

QR payload styles vary by manufacturer. This tries, in order:
1. **GS1 element strings** (the format India's pack QR mandate uses), AIs 01
   (GTIN), 10 (batch/lot), 11 (production date), 17 (expiry date) - both the
   human-readable `(01)...(17)...(10)...` bracket form and the raw
   FNC1-delimited form.
2. **URLs with query params** - common param names for batch/exp/mfg/product/manufacturer.
3. **Plain `key: value` text** - one pair per line, or separated by `;`.

Anything else comes back `recognized: false, format: 'unknown'` with the raw
text preserved, so the caller can show it to the user and fall back to a
strip photo or manual entry.

## Usage

```ts
import { parseQrPayload } from '@asli/qr-parse';

const result = parseQrPayload('(01)08904004401234(17)250630(10)GTL1258');
// { recognized: true, format: 'gs1', gtin: '08904004401234',
//   expMonth: '2025-06', batchNumber: 'GTL1258', rawText: '...' }
```

`batchNumber` is returned raw, uncorrected - `@asli/matching`'s
`normalizeBatch` does normalization downstream (CLAUDE.md matching is
deterministic; this package never guesses or completes a batch number).

`result.recognized` is `true` only when a batch number was found - that's the
field matching needs. A payload can still be `format !== 'unknown'` (e.g. a
recognized GS1 string with only a GTIN, no batch AI) while `recognized` is
`false`.
