# A1 — CDSCO endpoint client and parser
**Priority:** P0 · **Wave 1** · **Sessions:** 1 · **Depends on:** T02, T01 endpoint verdict

## Read first
CLAUDE.md, docs/DATA_SOURCES.md, docs/MATCHING.md (normalization), T01 Handoff, `packages/contracts/fixtures/cdsco/`

## Goal
A tested library that fetches one month/tab from CDSCO politely, saves the raw response to S3, and parses it into `FlaggedBatch[]` records.

## Owns
`services/ingestion/src/cdsco/**` (client, parser, date parsing, reason classification call-site), its tests

## Interface (used by A2)
```ts
listAvailableMonths(year: number): Promise<string[]>                  // "YYYY-MM"
fetchMonth(month: string, tab: "nsq"|"spurious"): Promise<RawSnapshot> // saves to S3, returns {key, sha256, url, contentType}
parseSnapshot(snap: RawSnapshotBody, meta): ParsedRow[]
normalizeRows(rows: ParsedRow[], deps: {aliases, reasonClassifier}): FlaggedBatch[]
```

## Implementation notes
- Use exactly the minimal working request recorded by T01. Retries 3× with jittered backoff; 2 s minimum gap between calls (module-level limiter).
- HTML parsing with `cheerio` (if HTML); map columns by header text, not position.
- Dates via `parseMonth` from `packages/matching` (import; if B not merged, use B's published interface stub).
- Reason code: keyword rules from `packages/content` (stub list from docs/SAFETY_AND_CONTENT.md if I not merged); unmatched → `reasonClassifier` (Bedrock, enum-constrained) injected by A2.
- Manufacturer: `normalizeManufacturer` + alias map; write unseen normalized names to a `newManufacturers` list for alias review.
- `rowHash`, `batchNorm`, `batchSkeleton` computed here.
- Skip and count rows missing batch number; never throw away the whole month for one bad row.

## Acceptance criteria
- [ ] Parser tests pass on all T01 fixtures, including row counts
- [ ] Date parsing covers every format seen in fixtures and PDFs
- [ ] Deployed test Lambda in `dev-a1` fetches one real month and writes a snapshot to S3
- [ ] No request is made faster than every 2 s (unit test with fake timers)
- [ ] Output validates against `FlaggedBatch` schema

## Out of scope
Step Functions, DynamoDB writes (A2), PDFs (A3).

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
