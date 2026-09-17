# X — Integrator (continuous)
**Priority:** P0 · **Continuous from Wave 1** · **Sessions:** many (restart freely from Handoff) · **Depends on:** lanes as they finish

## Read first
CLAUDE.md, plan/BUILD_PLAN.md (Gates), docs/TESTING.md, docs/ALERTS.md (Demo path), every lane's Handoff before merging it

## Goal
Keep `main` green and `int` deployed with every finished lane, and prove the gates end to end.

## Owns
`main` branch merges, `tests/e2e/**`, `scripts/seed-demo.ts`, `infra/lib/lanes/*` registration conflicts only, `plan/INTEGRATION_LOG.md`

## Responsibilities
1. Merge order: B → C (+lookup) → A1 → D1 → D2 → F → G1 → G2 → D3 → A2 → H → I → S → E → Wave 2.
2. Before each merge: read the lane Handoff, run `pnpm -r lint test`, rebase, resolve conflicts (never change another lane's logic silently; send it back if needed), deploy to `int`, run e2e.
3. Switch stubs to real implementations as lanes land (authz mode, lookup, content).
4. **e2e tests** (`tests/e2e`): sign in test user; manual check against seeded row = FLAGGED with source; scan fixture image; add medicine → MATCH within 10 s; publish AlertEvent → push/email counters increment; demo replay → match + event.
5. **Demo data** `scripts/seed-demo.ts`: demo users (two siblings), "Mom" cabinet with realistic medicines, one disclosed mock strip medicine matching a chosen real CDSCO row that will be replayed; produce `fixtures/demo/replay-1.json` for A2.
6. Track gates in `plan/INTEGRATION_LOG.md` with timestamps.
7. Contract change requests: collect from Handoffs, decide with the human, apply as `contracts-v1.x`, record in plan/CHANGELOG.md, notify affected lanes.

## Acceptance criteria
- [ ] Scan gate and Core gate passed and logged
- [ ] e2e suite green on `int` at feature freeze

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
