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
