# testset/ — photo collection guide (lane E)

This is the ground-truth set the accuracy harness (`tools/accuracy`) scores real
scans against (docs/TESTING.md "Test set"). Photos are team members' own
medicines, redacted per docs/PRIVACY.md before they're added here — this is the
only place real (if redacted) photos are committed; the harness's own reports
never contain images, only extracted fields and scores.

## Targets
- **≥ 30 strip photos** in `testset/strips/`
- **≥ 10 bill photos** in `testset/bills/`
- Vary these on purpose across the set, don't shoot 30 the same way:
  - **Foil vs box/blister vs loose strip**
  - **Lighting**: good (daylight/bright room) and poor (dim, yellow indoor light)
  - **Angle**: flat-on and tilted/off-axis
  - **Blur**: mostly sharp, but include a handful of slightly blurry shots — the
    harness needs to see real failure cases, not just easy ones

## What to shoot
- **Strips** (`testset/strips/`): one photo per strip, batch number and
  manufacturer clearly the subject (not necessarily in focus — that's the point).
  Use medicines you or your family actually own.
- **Bills** (`testset/bills/`): a full pharmacy bill/receipt with one or more
  medicine lines. Prefer bills with 2+ lines so line-recall scoring is meaningful.

## Redaction (docs/PRIVACY.md "Demo data")
Before adding a bill photo to this folder, cover or crop out anything that
isn't a medicine line: patient name, address, phone number, doctor name,
pharmacy GSTIN, payment details. Only product name, batch number, manufacturer,
expiry, quantity and price should be legible. Strips rarely need redaction, but
check for a name/prescription label stuck on the strip and remove it first.

Never put a person's name, phone number or address in a filename either.

## Naming
Each item is a photo plus a label file sharing the same id:
```
testset/strips/<id>.jpg
testset/strips/<id>.json
testset/bills/<id>.jpg
testset/bills/<id>.json
```
`<id>` is any short slug with no personal info, e.g. `strip-001`, `strip-002-foil-tilted`,
`bill-001`. `.jpg`, `.jpeg` and `.png` are all accepted.

## Labelling
Run the label helper after adding a batch of photos — it walks every image
that doesn't yet have a matching `.json` and asks for the ground truth:
```
pnpm --filter @asli/accuracy-harness label
```
Open each photo yourself (Explorer/Preview) while it prompts you, and type the
batch number/manufacturer/expiry exactly as printed on the strip or bill — that
printed value is the ground truth the harness compares extraction against, not
what you believe the "correct" medicine is.

The label JSON it writes matches docs/TESTING.md exactly:
```json
{
  "kind": "strip",
  "truth": { "productName": "...", "batchNumber": "GTL1258", "manufacturer": "...", "expMonth": "2026-10" },
  "conditions": { "foil": true, "lighting": "good", "angle": "flat", "blur": false }
}
```
For a bill, `truth` is `{ "lines": [ { same four fields }, ... ] }` — one entry
per medicine line, in the order they appear on the bill.

You can also hand-write/edit the JSON directly if that's faster once you know
the shape.

## Running the harness
Once a batch is labelled, see `tools/accuracy/` (`pnpm --filter @asli/accuracy-harness run:accuracy -- --stage <stage>`)
to score it against the real deployed API.
