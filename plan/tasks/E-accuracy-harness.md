# E — Accuracy harness and test set
**Priority:** P1 (start collecting photos on Thursday) · **Wave 1** · **Sessions:** 1 · **Depends on:** T02

## Read first
CLAUDE.md, docs/TESTING.md (Test set, Accuracy metrics), docs/PRIVACY.md (Demo data), docs/MATCHING.md

## Goal
Measured, honest accuracy numbers for the dashboard, writeup and video.

## Owns
`tools/accuracy/**`, `testset/**`

## Deliverables
1. `testset/README.md`: photo collection guide for the human (what to shoot, variety of foil/light/angle, redaction, naming, labelling).
2. Label helper CLI `tools/accuracy/label.ts`: shows image path, asks for truth fields, writes `<id>.json`.
3. Runner `tools/accuracy/run.ts --stage int [--method strip|bill]`: uploads each image through the real API (test user), records extracted fields, latency and tokens; computes metrics in docs/TESTING.md; seeded tier test (seeds a matching fixture row per item in a dedicated test-only table prefix or uses `/v1/checks` with a known seeded row).
4. Report: JSON + a markdown summary table; uploads `latest.json` to the public bucket.
5. Comparison mode: run twice (e.g. prompt v1 vs v2, or strip vs bill vs QR) and print the difference — for the learning log.

## Acceptance criteria
- [ ] ≥ 30 strips and ≥ 10 bills labelled (human collects; the session prompts and tracks progress)
- [ ] One full run on `int` produces a report
- [ ] At least one measured comparison written to the learning log

## Out of scope
Dashboard UI (J).

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
