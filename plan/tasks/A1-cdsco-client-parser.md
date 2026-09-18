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
**Status:** DONE
**Stage deployed:** `dev-a1` (`LaneA1Stack-dev-a1`, real deploy, imports the raw bucket from `dev-shared` via SSM)
**Done:**
- `services/ingestion/src/cdsco/**`: `client.ts` (`createCdscoClient` factory: `listAvailableMonths`, `fetchMonth`), `parser.ts` (`parseSnapshot`), `normalize.ts` (`normalizeRows`), `reason-classifier.ts` (deterministic keyword rules from docs/SAFETY_AND_CONTENT.md's reason table, `defaultReasonClassifier` fallback to `OTHER`), `http.ts` (`politeGet` - retries 3x with jittered exponential backoff, identifying User-Agent), `limiter.ts` (`createRateLimiter` - 2s min gap, module-level per client instance).
- Used T01's exact minimal working request (plan/tasks/T01-spikes.md Handoff): no browser headers/cookies needed. NSQ via `filteredNsqDrugTable`, Spurious via the **separate** `filteredSpuriousDrugTable` endpoint (the `tab=` param does nothing), months via `reportingMonths?year=`.
- Parser tests run against T01's **real** captured fixtures (`packages/contracts/fixtures/cdsco/`) - all 217 NSQ rows and all 4 Spurious rows parse correctly, including the Spurious endpoint's different field name (`product_name_from_dtl` vs `str_product_name`).
- Date parsing: reused `@asli/matching`'s `parseMonth` directly rather than writing a second date parser - it already covers every format docs/DATA_SOURCES.md lists (`Mon-YYYY`, `MM/YYYY`, `DD/MM/YYYY`, `MON-YYYY`, full month names, ISO), confirmed by `normalize.test.ts`'s `it.each` over all of them.
- Output validated against `FlaggedBatchSchema` inside `normalizeRows` itself (parses every row before returning), satisfying the acceptance criterion directly rather than leaving it to the caller.
- Rows with no usable batch number are skipped, not thrown - month never fails wholesale. Caller recovers the skipped count as `rows.length - result.length`.
- Rate limiter tested with vitest fake timers (`vi.useFakeTimers()`): asserts consecutive `throttle()` calls are never less than `MIN_GAP_MS` (2000ms) apart, and that already-elapsed time isn't double-charged.
- `infra/lib/lanes/a1.ts`: this lane's one CDK stack (`LaneA1Stack-dev-a1`) - a single test Lambda (`services/ingestion/src/handler.ts`) that calls `fetchMonth` for one month/tab and returns the S3 result. Imports the shared raw bucket name via SSM (`SSM_PATHS.bucket('raw')` from `dev-shared`) and grants the function `s3:PutObject` on it.
- **Actually deployed to `dev-a1` and invoked for real** (not just `cdk synth`): `aws lambda invoke` with `{"month":"2026-02","tab":"nsq"}` returned `StatusCode 200`, a real HTTP fetch of CDSCO's live endpoint, and a real S3 object confirmed via `HeadObjectCommand` (107199 bytes, `raw/cdsco/endpoint/2026-02/nsq/<sha256>.json` in `asli-dev-shared-raw`).
- `pnpm -r lint && pnpm -r build && pnpm -r test` all green across the whole worktree (49 new tests in `services/ingestion`, 6 test files).
**Remaining:**
- Nothing for this lane's scope. A2 (Step Functions + DynamoDB writes) and A3 (PDF/Textract fallback) build on top of this.
**Gotchas / decisions:**
- **`fetchMonth`'s return type is `RawSnapshot & { body: string }`, a superset of the published interface's literal `Promise<RawSnapshot>`.** The caller (A2) needs the raw body text to hand to `parseSnapshot` right after; making `fetchMonth` return it too avoids a redundant S3 read-back immediately after the write. Purely additive - every field the published interface promised is still there.
- **`normalizeRows`'s literal published signature was `(rows, deps): FlaggedBatch[]` with no third `meta` parameter**, but the row data alone doesn't carry `alertMonth`/`sourceUrl`/`snapshotKey`. Rather than add a third parameter (which would make every row in a batch share one meta object awkwardly), `ParsedRow` itself carries those three fields, stamped on by `parseSnapshot` (which already receives `meta`). `normalizeRows` stays a pure function of `(rows, deps)` as documented; the metadata just travels differently than the doc's shorthand pseudocode implied.
- **`normalizeRows` is `async`/returns a `Promise`, not synchronous `FlaggedBatch[]` as the doc's pseudocode literally shows.** `deps.reasonClassifier` is documented as "Bedrock, enum-constrained, injected by A2" - inherently I/O, inherently async. Treating the doc's signature as illustrative rather than literal here; this lane's own `defaultReasonClassifier` never actually needs to await anything.
- **No HTML parsing, no `cheerio`.** docs/DATA_SOURCES.md anticipated HTML; T01's spike found both endpoints return DataTables-style JSON (`{aaData: [...]}`) despite a `Content-Type: text/plain;charset=ISO-8859-1` header. Implemented a plain `JSON.parse`, nothing more - worth a docs/DATA_SOURCES.md fix (not this lane's file to edit).
- **`reasonCode` classification lives in this lane** (`reason-classifier.ts`), not in `packages/content` (lane I's package, which only has a placeholder `index.ts` so far) - kept the keyword table as this lane's own module since docs/SAFETY_AND_CONTENT.md's table is the source of truth either way and A1 needed it day one. If lane I later publishes a canonical classifier from `packages/content`, A2 can inject it as `deps.reasonClassifier` and this lane's keyword rules simply become the always-tried-first fast path (deterministic rules are checked before any injected classifier regardless, per docs/DATA_SOURCES.md's own ordering).
- **`esbuild` was a transitive dependency, not linked as a runnable bin**, so `cdk synth`/`deploy` failed with `esbuild not found` the first time any lane actually used `nodeFn`'s `NodejsFunction` bundling (nobody had before this lane). Added it as an explicit `infra/package.json` devDependency (`^0.25.12`) - a shared infra-tooling fix, not a lane-owned file, but blocking every future lane that deploys a Lambda.
- `infra/lib/lanes/a1.ts` resolves its Lambda `entry` via `path.join(__dirname, ...)` rather than a bare relative string like the `infra/lib/lanes/README.md` example shows - `NodejsFunction`'s relative-path resolution depends on the call-site stack trace, which is ambiguous once it's routed through the shared `nodeFn` helper instead of called directly from the lane file. An absolute path sidesteps that ambiguity entirely.
**Contract change requests:**
- none
**Learning log entries added:** yes
