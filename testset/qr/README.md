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
No samples collected yet in this session (no camera access) - this is
outstanding, see `plan/tasks/K-qr.md` Handoff. A team member with the
physical medicines needs to shoot ≥ 3 pack QR codes and drop them here, then
report the decode rate (`packages/qr-parse` `parseQrPayload` + the in-browser
`jsQR` decode) in E's comparison.
