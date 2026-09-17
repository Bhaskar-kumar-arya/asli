# B — Matching library
**Priority:** P0 · **Wave 1** · **Sessions:** 1 · **Depends on:** T02

## Read first
CLAUDE.md, docs/MATCHING.md (all of it), `packages/contracts/src/{api,items,enums}.ts`

## Goal
Implement `packages/matching` exactly as specified, with exhaustive tests. This is the trust core of Asli.

## Owns
`packages/matching/**`

## Deliverables
1. Day-one stub: publish the full function signatures returning simple placeholder results, and commit it within the first 30 minutes so other lanes can import it.
2. Implement all functions in docs/MATCHING.md.
3. Unit tests for every tier table row and every required test case; property tests (fast-check) listed in the doc.
4. `alias.ts`: load/apply alias map (pure; data passed in).
5. `README.md` in the package with examples.
6. Benchmark: `decide` on 50 candidates < 1 ms.

## Acceptance criteria
- [ ] 100% branch coverage on `classifyMatch` and `decide`
- [ ] All 10 required test cases pass
- [ ] No imports of AWS SDK or any I/O
- [ ] Human reviews the tier table implementation (ask for review before marking DONE)

## Out of scope
Fetching candidates from DynamoDB.

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
