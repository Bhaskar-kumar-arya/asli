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
**Status:** NOT STARTED | IN PROGRESS | BLOCKED | DONE
**Stage deployed:** 
**Done:**
- 
**Remaining:**
- 
**Gotchas / decisions:**
- 
**Contract change requests:**
- none
**Learning log entries added:** yes / no
