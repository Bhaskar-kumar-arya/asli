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
**Status:** IN PROGRESS
**Stage deployed:** none (this lane owns no infra; it drives whatever stage is passed via `--stage`. No lane has deployed `int` yet per plan/INTEGRATION_LOG.md, so no real run has been done)
**Testset counts (this session):** 14/30 strips, 1/10 bills labelled and Zod-validated (was 0/30, 0/10). See `testset/sources.md` for full per-photo attribution and an honest account of the shortfall.
- Sourcing method: since no human was available to shoot real photos this week, sourced real, CC-licensed medicine-strip and pharmacy-bill photos from Wikimedia Commons (its `list=search`, `list=categorymembers`, and per-uploader `list=allimages` API), inspecting ~90 candidate blister/strip photos and ~10 candidate bill/receipt photos by eye (zoomed crops via a local PIL script, not committed) before writing any ground truth - no field was guessed. Every image is real (not synthetic/AI-generated) and unaltered except downscaling and, for the one bill, cropping to redact anything that wasn't the medicine line/price.
- Strips: 14/30, all with a confidently legible `batchNumber` (mandatory field - candidates where it wasn't clearly readable were dropped rather than guessed). Only 2 of the 14 are genuinely Indian-market packs (Neorelax MR / Meyer Organics via Acme Generics, and Fincover / Micro Labs) - Indian-brand searches (Cipla, Sun Pharma, Lupin, Alkem, Mankind, Torrent, Zydus Cadila, Dr Reddy's) mostly returned EU parallel-import regulatory PDFs, not photos. The other 12 are real EU/Philippines-market packs (KRKA, Zentiva, Novartis, Bayer, AstraZeneca, Takeda, GSK, Organon) with legible batch/lot/exp - still useful for testing the vision pipeline's field-reading accuracy, just not India-specific.
- Bills: 1/10. Real, itemised, CC-licensed Indian pharmacy bill photos are essentially unavailable under an open license (searched Commons full-text and Openverse for "pharmacy bill/receipt/cash memo/invoice" - hits were 19th-century scanned journals or a single blank receipt *template* graphic, never a real filled Indian bill). The one usable find is a real Dutch pharmacy till receipt (Apotheek Hillegersberg, Rotterdam) with one compounded-medicine line and price - no batch/manufacturer/expiry (normal for an EU till receipt) and not Indian-format, kept anyway since it's real, licensed, and PII-clean rather than padding the count with something irrelevant. Two similar Dutch receipts found in the same search were card-payment slips with no medicine line and were not used.
- Verification: ran `loadTestset()` from `tools/accuracy/src/testset.ts` (unmodified) against the real `testset/` directory from a scratch script - all 15 items parse against `LabelSchema` with no errors. `pnpm -r lint && pnpm -r test` green repo-wide (72+52+11+20+... tests across all lanes, including the harness's own 20).
**Done (prior session, unchanged):**
- `testset/README.md`: full collection guide (foil/lighting/angle/blur variety, docs/PRIVACY.md redaction rules, `<id>.jpg`+`<id>.json` naming, how to run the label helper). `testset/strips/` and `testset/bills/` scaffolded (empty, `.gitkeep`).
- `tools/accuracy/src/label.ts`: interactive CLI (`pnpm --filter @asli/accuracy-harness label`) that walks unlabelled images and writes `<id>.json` matching docs/TESTING.md's label shape exactly (Zod-validated via `types.ts`).
- `tools/accuracy/src/run.ts` (`pnpm --filter @asli/accuracy-harness run:accuracy -- --stage <stage> [--method strip|bill] [--upload] [--compare-with <path>]`): resolves the stage's API/Cognito/bucket config from SSM (`aws.ts`), signs in a real test Cognito user (`ASLI_TEST_USER_EMAIL`/`ASLI_TEST_USER_PASSWORD`), uploads each labelled testset image through the real `/v1/uploads` + `/v1/scans`, scores extraction (`score.ts`, using `@asli/matching`'s own normalize/similarity functions so "correct" means the same thing matching does), and separately runs a **seeded tier-correctness probe** (`seededTier.ts`) that builds identities straight from `packages/contracts/fixtures/flagged-batches.json` (the same rows `pnpm seed-fixtures` puts in every stage), predicts each one's tier locally with `@asli/matching`'s `decide()`, then calls the real `/v1/checks` and diffs the two - this catches wiring bugs (bad GSI, wrong stage) without re-testing matching logic itself (that's B's fully unit-tested lane).
- Report (`report.ts`): JSON + markdown per docs/TESTING.md ("Output: `tools/accuracy/out/<timestamp>.json`"), with `--upload` PUTting `latest.json` to `<publicBucket>/metrics/accuracy/latest.json` for J's dashboard. Bedrock token totals are pulled from CloudWatch (`BedrockInputTokens`/`BedrockOutputTokens`, the metrics C already emits) for the run's time window rather than invented; cost-per-1000 is left "unknown" until `packages/contracts/src/pricing.ts` has real verified prices.
- Comparison mode (`--compare-with <prior-report.json>`): prints a before/after table per metric (`compareReports`/`comparisonToMarkdown`) - ready for a strip-vs-bill or prompt-v1-vs-v2 comparison once two real runs exist.
- 20 unit tests (score/testset/report/seededTier/index), all pure/local (temp dirs, no AWS calls) - `pnpm -r lint && pnpm -r test` green repo-wide.
**Remaining:**
- **Human or a future session:** close the testset gap - now 14/30 strips (12 non-Indian but legible; only 2 genuinely Indian-market) and 1/10 bills (non-Indian, single line, no batch/mfr/expiry). Real Indian strip photos with a legible batch number and real Indian pharmacy bill photos are both scarce under open licensing (see `testset/sources.md`'s "Coverage gaps" section for what was tried) - closing this properly likely needs actual human-shot photos of real Indian medicine strips/bills per `testset/README.md`, not more internet sourcing.
- **Blocked on lane X:** no stage has a live `/v1/uploads`+`/v1/scans`+`/v1/checks` deployment yet (`int` not deployed; C's scan endpoint is also still blocked on the account-wide Bedrock restriction per T01/C's Handoffs, so even a `dev-c` run would likely fail extraction). Once `int` (or any stage with scan working) is live and a test Cognito user exists there, run: `ASLI_TEST_USER_EMAIL=... ASLI_TEST_USER_PASSWORD=... pnpm --filter @asli/accuracy-harness run:accuracy -- --stage int --upload`.
- Acceptance criteria 1 (≥30/≥10) is **not met** (14/30, 1/10) and honestly documented as such. Criteria 2-3 (a full `int` run producing a report, a measured comparison in the learning log) are still blocked on lane X's deployment as before - the tooling is done and tested, but no real accuracy numbers exist yet to report or log.
- Nice-to-have not built: a way to seed a dedicated test-only FlaggedBatches row (task's alternative "or" option) - used the "call `/v1/checks` against the already-seeded fixture rows" option instead since `pnpm seed-fixtures` already seeds `flagged-batches.json` into every stage.
**Gotchas / decisions:**
- `@asli/matching`'s `manufacturerSimilarity(a, b)` expects **already-normalized** strings (its own doc comment says so) - passing raw manufacturer text directly gives a low Jaccard score even for what should be a 1.0 match (e.g. `manufacturerSimilarity('Gidsha Pharmaceuticals', 'Gidsha Pharma')` = 0.33, not 1.0, until both are run through `normalizeManufacturer` first). `score.ts`'s `scoreStrip` does the normalization itself; any other caller of `manufacturerSimilarity` should double check it's normalizing first too.
- Tier-correctness probes are checked against **predictions from the local matching library**, not hand-picked expected tiers, so they stay correct automatically if `packages/contracts/fixtures/flagged-batches.json` changes - but this means they verify *wiring* (does the deployed check return what the pure function would), not matching *logic* (B already owns 100% branch coverage on that).
- Report writer treats missing cost data as the string `"unknown"` rather than `0` or omitting the field, per CLAUDE.md's "measured, not estimated" spirit - don't change this to a fallback of 0.
**Contract change requests:**
- none
**Learning log entries added:** yes
