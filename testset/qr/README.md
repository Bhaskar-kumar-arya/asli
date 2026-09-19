# testset/qr/ — real pack QR samples (lane K)

Ground truth for `@asli/qr-parse`, mirrors `testset/README.md` for strips/bills.
Acceptance criteria (`plan/tasks/K-qr.md`) needs **≥ 3 real pack QR codes**
decoded into the correct batch number.

## Naming
```
testset/qr/<id>.jpg
testset/qr/<id>.json
```
`<id>` is a short slug with no personal info, e.g. `qr-001`, `qr-002-gs1-bracket`.

## What to shoot
A clear photo of the QR code printed on a pack you or your family actually
own - flat-on, in focus, the whole code visible. No redaction is normally
needed since pack QR codes don't carry patient/pharmacy data, but check the
frame doesn't also capture a prescription label stuck on the strip.

## Labelling
No harness exists for QR yet (E's comparison covers strips/bills). Until
then, hand-write `<id>.json` next to each photo:
```json
{
  "kind": "qr",
  "decodedText": "(01)08904004401234(17)250630(10)GTL1258",
  "truth": { "batchNumber": "GTL1258", "manufacturer": "Cipla Ltd", "expMonth": "2025-06" }
}
```
`decodedText` is exactly what a QR reader (e.g. your phone's camera) reads
from the code - useful for testing `@asli/qr-parse` directly without a photo
pipeline. `truth` is what's printed on the pack, same as the strip/bill
ground truth.

## Status
**2/3 real pack QR photos collected and kept 2026-09-19** (`qr-001-hk-vitals-bottle`,
`qr-003-novolife-thai-jar`) - **short of K's "≥ 3 real pack QR codes"
acceptance criterion.** A third real sample (`qr-002-zerodol-p-blister`, a
medicine blister strip) was shot and tested but removed from the testset
because its QR - small, printed on creased/reflective foil - failed to
decode with `jsQR` at every scale/crop tried (see `submission/LEARNING_LOG.md`'s
2026-09-19 K entry for the full attempt log). Decode rate tested offline
with the exact `jsQR` library `apps/web/src/features/scan/qr/lib/decodeQr.ts`
uses (via `jimp` in Node instead of an in-browser canvas, same decode call):

| Sample | Decoded? | Notes |
|---|---|---|
| qr-001-hk-vitals-bottle | ✅ | needed 0.75x downscale from full resolution |
| qr-003-novolife-thai-jar | ✅ | decoded at full resolution, no adjustment needed |

**Decode rate on kept samples: 2/2 (100%)**, but only 2 real samples total -
**still needs ≥1 more real pack QR photo to meet the ≥3 acceptance
criterion.** Worth trying a real phone's native camera QR reader on a
strip/blister QR as a follow-up - phone-native decoders are typically more
robust than `jsQR` alone (continuous autofocus, multi-frame capture) and
might succeed where this offline single-photo test didn't.
