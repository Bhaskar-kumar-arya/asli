# K — QR decoding
**Priority:** P2 · **Wave 2** · **Sessions:** 1 · **Depends on:** core gate

## Read first
CLAUDE.md, docs/SCANNING.md (Input methods), docs/UX.md

## Owns
`apps/web/src/features/scan/qr/**` (coordinate one import line in D2's chooser with X), `packages/qr-parse/**`

## Deliverables
1. In-browser QR decode from camera photo (e.g. `jsQR` or `zxing` browser build); no image leaves the device for QR.
2. `packages/qr-parse`: parse common pack QR payload styles (GS1 element strings with AIs 01/10/17/11, URLs with query params, key:value text). Unknown formats → show raw text and fall back to strip photo.
3. Flow: decode → prefilled confirm form with `source: "qr"` → `/v1/checks`.
4. Collect real QR samples from team medicines into `testset/qr/` and report decode rate in E's comparison.

## Acceptance criteria
- [ ] ≥ 3 real pack QR codes decoded into correct batch numbers
- [ ] Unknown payload handled gracefully

---
## Handoff (the session updates this before stopping)
**Status:** IN PROGRESS (code complete, blocked on real QR samples)
**Stage deployed:** none (client-side only lane, no infra to deploy)
**Done:**
- `packages/qr-parse`: `parseQrPayload(text)` handles GS1 element strings (AIs
  01/10/11/17, both the `(AI)value` bracket form and raw FNC1-delimited
  form), URLs with query params, and plain `key: value` text. Unrecognized
  payloads return `{ recognized: false, format: 'unknown', rawText }`.
  `batchNumber` is returned raw (uncorrected); dates come back as `YYYY-MM`.
  19 unit tests, `pnpm --filter @asli/qr-parse test|lint|build` all pass.
- `apps/web/src/features/scan/qr/`: `QrScanScreen` captures a photo
  (`capture="environment"`, same pattern as `CaptureScreen`), decodes it
  in-browser with `jsQR` (`lib/decodeQr.ts`, canvas `getImageData` → `jsQR`,
  no upload call at all for QR - CLAUDE.md rule 8 doesn't apply here since we
  never touch CDSCO, but the "no image leaves the device" deliverable is met
  the same way). On an unrecognized payload it shows the raw decoded text and
  buttons to fall back to a strip photo or manual entry, per the deliverable.
  On a recognized payload it calls `setPendingConfirm` (the `scanFlow.tsx`
  field D2 had already added for this) and navigates to `QrConfirmScreen`,
  which reuses `MedicineIdentityForm` prefilled from the decode, submits
  directly to `POST /v1/checks` with `identity.source: 'qr'` (no `/v1/scans`
  call - there's nothing for Bedrock to do), then `/scan/result`.
- Wired `/scan/qr` and `/scan/qr/confirm` into `apps/web/src/features/scan/routes.tsx`
  (one import line: `import { QrScanScreen, QrConfirmScreen } from './qr';`).
  `MethodChooserScreen` already had the `features.qr`-gated button pointing
  at `/scan/qr` (D2's earlier work) - no chooser changes needed.
- Added `jsqr` and `@asli/qr-parse` to `apps/web/package.json`.
- `testset/qr/README.md` scaffolded (mirrors `testset/README.md`), no samples
  yet.
- `pnpm -r lint && pnpm -r test` pass repo-wide. One pre-existing flaky test
  unrelated to this lane: `services/scan/src/scans/handler.test.ts` timed out
  once under full-repo parallel load, passed cleanly in isolation immediately
  after - not caused by this session's changes (scan service files untouched).

**Remaining:**
- Acceptance criterion "≥ 3 real pack QR codes decoded into correct batch
  numbers" is **not met** - this session has no camera/physical medicines. A
  team member needs to shoot ≥ 3 pack QR photos, drop them + a decode into
  `testset/qr/`, run them through `VITE_FEATURE_QR=1 pnpm --filter @asli/web dev`
  → Scan → QR, and record the decode rate in E's accuracy comparison.
  `packages/qr-parse`'s parser is only as good as its test-fixture coverage
  (GS1 bracket/raw, URL, key:value) - real packs may use a payload shape none
  of those three buckets cover; if so it'll gracefully fall back to
  `unrecognized`, but the parser should get a new branch for whatever real
  format shows up.
- `VITE_FEATURE_QR` is off by default and no `.env` files exist in the repo
  to flip it - whoever demos this needs to set it at build/deploy time.

**Gotchas / decisions:**
- GS1 dates (`YYMMDD`) are read as `20YY` unconditionally (no century-pivot
  heuristic) - fine since pack QR mandates postdate 2000, but worth knowing
  if a raw AI 11/17 ever needs a batch from the 1900s (it won't).
- `recognized` in `QrParseResult` is `true` only when a `batchNumber` was
  extracted, even if the format itself was recognized (e.g. a GS1 string with
  only a GTIN AI). That's the field matching needs, and it's what drives the
  UI's raw-text-fallback branch.
- Reused `@asli/matching`'s `parseMonth` inside `@asli/qr-parse` (workspace
  dependency) for non-GS1 date formats, adding only 2-digit-year support
  (`MM/YY`) on top, rather than duplicating date parsing.
- `routes.tsx` isn't listed under this lane's owned paths, but it needed the
  two new route entries to make `/scan/qr` reachable at all - kept to the
  minimum: one import line, two route objects, no other lines touched.

**Contract change requests:**
- none - `source: 'qr'` and `ScanRequestSchema.qrText` already existed in
  `packages/contracts`.
**Learning log entries added:** yes
