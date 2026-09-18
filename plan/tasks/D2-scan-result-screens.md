# D2 — Scan, confirm, result and bill-results screens, manual entry
**Priority:** P0 · **Wave 1** · **Sessions:** 1–2 · **Depends on:** T02 (D1 components; build against mocks, use simple local components until D1 merges)

## Read first
CLAUDE.md, docs/UX.md (screens 3–7, result card states), docs/SCANNING.md (Client capture, UI after scan), docs/SAFETY_AND_CONTENT.md (Result card copy), docs/API.md

## Goal
The demo's hero flow: from "Check a medicine" to a clear, trustworthy result card.

## Owns
`apps/web/src/features/scan/**`, one line in `app/routes.tsx`

## Deliverables
1. Method chooser (strip, bill, QR placeholder button hidden unless `features.qr`, type details).
2. Capture: file input with `capture="environment"`, "where is the batch number" illustration, client downscale + EXIF strip, upload via presigned URL, progress state.
3. Confirm details form: pre-filled, low-confidence fields highlighted, batch required, edits tracked (`batchEdited` flag sent to backend).
4. Manual entry: same form, empty.
5. Result card component for all states in docs/UX.md, copy from `packages/content` keys, source link to `sourceUrl`, "What to do next", Read aloud button (plays `audio/<lang>/<key>.mp3` or browser speech for kn), "Save to family medicines" (choose cabinet; calls F's API).
6. Bill results list with per-line chips and "Add strip photo" for lines without batch.
7. Demo label for `demo: true` alerts.
8. Component tests for every result state using fixtures.

## Acceptance criteria
- [ ] Every state in docs/UX.md renders from fixtures, in en/hi/kn
- [ ] No screen uses the words "safe", "genuine" or "verified" (test greps rendered text)
- [ ] Works against `int`: real strip → confirm → result
- [ ] Usable at 360 px width and "extra large" text size
- [ ] Screen recording of the flow saved for the video draft

## Out of scope
Cabinet screens (D3), QR decoding (K).

---
## Handoff (the session updates this before stopping)
**Status:** IN PROGRESS (core flow + all fixture states done and tested; not yet run against a real `int` deploy or a real device)
**Stage deployed:** none
**Done:**
- Method chooser (`screens/MethodChooserScreen.tsx`): strip / bill / manual, QR hidden behind `features.qr` (`VITE_FEATURE_QR`).
- Capture (`screens/CaptureScreen.tsx`): `capture="environment"` file input, downscale to 2000px/JPEG 0.85 via canvas (`lib/imageProcessing.ts`, re-encoding also strips EXIF), presigned-URL upload (`api/upload.ts`), progress states, routes to confirm/bill-results/manual depending on the scan response. In mock mode only, a scenario picker lets you choose which fixture state to play back (there's no real Bedrock call in this session).
- Confirm details (`screens/ConfirmDetailsScreen.tsx`) and manual entry (`screens/ManualEntryScreen.tsx`) share `components/MedicineIdentityForm.tsx`: low-confidence fields highlighted (threshold 0.7), batch required, `batchEdited` tracked when the user changes a pre-filled batch number.
- Result card (`components/ResultCard.tsx`) covers every docs/UX.md state backed by a fixture: FLAGGED NSQ, FLAGGED SPURIOUS, VERIFY (near batch / manufacturer unknown / low confidence), NO_ALERT_FOUND, extraction-failed → manual entry, not-a-medicine-photo. Includes source link, "What to do next" (FLAGGED/VERIFY only), Read aloud (`lib/readAloud.ts`: MP3 first, falls back to `speechSynthesis`), "Save to family medicines" (`components/SaveToCabinetDialog.tsx`, calls F's `/v1/cabinets` + `/v1/cabinets/{id}/medicines`), and a demo label when `match.demo` is true.
- Bill results (`screens/BillResultsScreen.tsx` + `components/BillResultRow.tsx`): per-line chips, "Add strip photo" banner when `NO_BATCH_ON_LINE` is present, tap a line to open its full result card inline.
- Copy source: `lib/content.ts` mirrors docs/SAFETY_AND_CONTENT.md's reviewed English copy exactly (stand-in for lane I's `packages/content`, which is still a placeholder) - swap to `GET /v1/content/guidance/{guidanceKey}` once that ships; the `guidanceKey` values already match.
- Tests: 24 passing (`lib/content.test.ts`, `components/ResultCard.test.tsx`, `components/MedicineIdentityForm.test.tsx`, `screens/BillResultsScreen.test.tsx`, plus D1's `app/AppRoot.test.tsx`). Includes a banned-words grep (safe/genuine/verified/ok) across every fixture's rendered copy and the raw `getResultCopy()` output.
- One line added to `app/routes.tsx` (`scanRoutes`), nested under a `ScanFlowProvider` layout route so capture → confirm/bill-results → result can share in-flight state without a global store.
**Remaining:**
- hi/kn result-card copy: not built. `lib/content.ts` is English-only (matches SAFETY_AND_CONTENT.md's "en, source of truth"); translated + reviewed copy belongs in lane I's `packages/content` per the doc map, so this should move there once that ships rather than being duplicated in D2.
- Not run against `int` yet - real strip → confirm → result end-to-end (an explicit acceptance criterion) needs a deployed API (lane C/F) and a real device.
- Screen recording of the flow: not captured (no browser automation available in this sandboxed Windows session - please record manually before the demo, ideally on a 360px-wide Android Chrome window per docs/UX.md).
- "offline" result-card state (docs/UX.md lists it as a state to design) isn't a distinct screen - handled today only via the global `OfflineBanner` (D1); if the demo wants a dedicated offline result card, that's a small addition to `ResultScreen`.
- Bill flow: no dedicated bill fixture exists in `packages/contracts/fixtures/scan-responses.json` (only single-item strip fixtures), so the bill path is exercised by a hand-built synthetic case in `BillResultsScreen.test.tsx` rather than a shared fixture. Worth asking T02/A2 to add a `BILL_MIXED` fixture with multiple items/results.
**Gotchas / decisions:**
- `MedicineIdentityForm` needed `noValidate` on the `<form>` - the native HTML5 `required` on the batch field was silently blocking our custom validation/error message from ever running (jsdom enforces constraint validation same as real browsers).
- `useRoutes()` narrowing gotcha in `CaptureScreen`: TypeScript doesn't carry a narrowed union (`kind !== 'strip' && kind !== 'bill' → return`) into a nested closure (`handleFile`); fixed by re-binding to a new `const captureKind = kind` right after the guard.
- Chose a React Context (`ScanFlowProvider`, scoped to the `/scan/*` layout route) over sessionStorage/global state for passing extracted items and results between capture → confirm → result, since the demo flow is always linear and a refresh mid-flow reasonably restarts the check.
- `ScanFlowProvider`'s action functions (`setResults` etc.) are now `useCallback(..., [])`, not defined inline inside the state-keyed `useMemo` - the earlier version silently caused an infinite render loop (new function identity every state change → any consumer effect depending on it re-fires forever). See submission/LEARNING_LOG.md for the full story; worth double-checking any other context provider in this app for the same pattern.
**Contract change requests:**
- `CheckRequestSchema`/`MedicineIdentitySchema` has no way to carry the `batchEdited` flag docs/SCANNING.md asks for ("Record whether the user edited the batch... feeds accuracy reporting"). `ConfirmDetailsScreen` currently only re-checks via `POST /v1/checks` when the batch actually changed, but there's nowhere in the request schema to signal *that a check is a batch-edit re-check* vs. a fresh manual entry, so the `BatchEditedByUser` metric (lane E/S) can't be derived from the request as it stands. Suggest adding an optional `batchEdited?: boolean` to `MedicineIdentitySchema` (T02/B to confirm placement) so it survives the round trip to the metrics/idempotency layer.
**Learning log entries added:** yes
