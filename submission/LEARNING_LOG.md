# LEARNING_LOG.md

Every session appends here before stopping. Good entries are specific: what we expected, what happened, what we measured, what we changed.

Format:
```
### <YYYY-MM-DD HH:MM IST> · <Lane ID> · <short title>
- Expected:
- Happened:
- Evidence / numbers:
- Changed:
```

---

### 2026-09-16 · Planning · Hand-checked CDSCO lag before building
- Expected: flagged batches might already be expired by the time CDSCO announces them, which would weaken the idea.
- Happened: across Sep 2024, Jan 2025 and Mar 2025 central-lab alerts, 170 of 171 batches were still within expiry at announcement.
- Evidence / numbers: average ~9.6 months from manufacture to alert (11.0, 9.6, 8.6 by month).
- Changed: made the retroactive cabinet check a core feature; lane S will recompute on the full backfill.

### 2026-09-16 · Planning · Structured endpoint found, but non-browser fetch failed
- Expected: the CDSCO table endpoint would replace PDF OCR.
- Happened: it returned 200 in a browser but 400 from a non-browser fetch.
- Changed: added spike T01 and a PDF + Textract fallback lane (A3).

### 2026-09-17 10:30 IST · T00 · ts-node silently ran ESM on Node 24, broke lane auto-loading
- Expected: `infra/lib/lanes/*.ts` files with `export function register(app, stage)` would be picked up by `require()` in `infra/bin/app.ts` with no changes needed elsewhere, since `infra/tsconfig.json` sets `"module": "CommonJS"`.
- Happened: `cdk synth` failed with `ERR_MODULE_NOT_FOUND` on a plain relative import (`../lib/load-lanes`) - Node's native ESM resolver was handling it, not ts-node's CJS transform, even though the tsconfig said CommonJS.
- Evidence / numbers: root cause was `infra/package.json` having no `"type"` field while the monorepo root had `"type": "module"` (added to silence an ESLint flat-config warning). ts-node/Node 24 picked ESM for the `infra` subtree despite the tsconfig. Setting `infra/package.json`'s own `"type": "commonjs"` explicitly fixed it immediately.
- Changed: every package that runs via `ts-node`/`require()` should set its own `"type"` explicitly rather than relying on the "nearest package.json wins" default working the way you'd expect across a mixed-module monorepo. Verified fix by dropping a real dummy lane file, running `cdk synth`, confirming the stack appeared without touching `app.ts`, then deleting the dummy file.

### 2026-09-17 19:10 IST · T02 · ts-node still couldn't require() an ESM workspace package, even with infra's own "type":"commonjs" fixed
- Expected: T00's `infra/package.json` `"type": "commonjs"` fix (previous entry) meant infra's own module resolution was sorted, so `shared-stack.ts` could `import { SSM_PATHS } from '@asli/contracts'` without issue.
- Happened: `cdk synth` failed with `ERR_REQUIRE_ESM: Must use import to load ES Module: .../packages/contracts/src/index.ts`. `infra/package.json`'s own `"type"` only controls how Node treats *infra's* files; when ts-node's CJS `require()` loads a file from a *different* package, Node checks the nearest `package.json` to *that* file - and `packages/contracts/package.json` (like every `packages/*`) is `"type": "module"`.
- Evidence / numbers: reproduced by `STAGE=dev-t02 SHARED_STAGE=dev-t02 npx cdk synth` right after adding the `@asli/contracts` import; same error would hit any lane stack importing `packages/matching`, `packages/authz`, or `packages/content` too, since all four are `"type": "module"`.
- Changed: switched infra's CDK app entrypoint (`infra/cdk.json` `app`) from `ts-node --prefer-ts-exts` to `tsx`, which handles CJS/ESM interop across package boundaries. Confirmed `infra/lib/load-lanes.ts` (synchronous `require()` for lane auto-loading) still works unchanged under tsx - its existing tests still pass, and `cdk synth` now produces all 8 tables/3 buckets/Cognito/HTTP API/AVP resources from `shared-stack.ts` importing `@asli/contracts`.

### 2026-09-17 19:15 IST · T02 · zod-to-openapi's latest major requires zod v4
- Expected: `npm install @asteasolutions/zod-to-openapi` would just work against this repo's zod `^3.24.1`.
- Happened: `9.1.0` (and `8.x`) declare a peer dependency on `zod: ^4.0.0`. Installing it anyway and calling `extendZodWithOpenApi(z)` threw `zodSchema.openapi is not a function` at runtime the moment any schema was registered.
- Evidence / numbers: `npm view @asteasolutions/zod-to-openapi@7 peerDependencies` showed the whole `7.x` line still targets `zod: ^3.20.2`; `7.3.4` is the newest `7.x` release.
- Changed: pinned `@asteasolutions/zod-to-openapi` to `^7.3.4` in `packages/contracts/package.json`. Worth rechecking when/if this repo moves to zod v4.

### 2026-09-17 19:45 IST · T01 · CDSCO endpoint works with zero special headers - the documented risk didn't reproduce
- Expected: docs/DATA_SOURCES.md flagged a real risk - a non-browser fetch to `filteredNsqDrugTable` returned HTTP 400 during planning, so T01's job was to find the minimum headers/cookies that make it work from a non-browser client.
- Happened: a plain `curl` with no User-Agent override, no Referer, no cookies, nothing, returned HTTP 200 with 217 real rows of Feb-2026 NSQ data on the first try.
- Evidence / numbers: `curl -s https://cdscoonline.gov.in/CDSCO/filteredNsqDrugTable?month=Feb-2026&source=All&tab=nsq` → 200, `Content-Type: text/plain;charset=ISO-8859-1`, valid JSON body (`{iTotalDisplayRecords, iTotalRecords, aaData: [...]}`) despite the text/plain header. Tried the same request from this local machine, not literally from a Lambda in ap-south-1 (cdk deploy was unavailable this session) - worth one real from-Lambda confirmation later given the endpoint apparently changed behavior since planning.
- Changed: `A3` (PDF+Textract fallback) is very likely not needed as P0 - endpoint verdict is `ENDPOINT_OK` with strong evidence. Also discovered the `tab` query param is a no-op (silently ignored) - spurious drugs are a genuinely separate endpoint, `filteredSpuriousDrugTable`, with different field names (`product_name_from_dtl` instead of `str_product_name`, plus `str_firm_reply`/`str_spurious_manufactured_by`). And found the real months-listing endpoint by guessing variations after the documented name (`publicReportingMonths`) 400'd: `GET /CDSCO/reportingMonths?year=<YYYY>` works, returns `["Jan",...]`, confirms 2019 as the earliest year with full data (2018 returns `[]`).

### 2026-09-17 20:05 IST · T01 · This AWS account blocks Bedrock invoke, Textract, Translate, and Verified Permissions - control-plane reads still work
- Expected: with `cdk bootstrap` confirmed done and basic services (DynamoDB, S3, SNS, SQS, Cognito, API Gateway) working fine in T02's `cdk diff`, the ML/AI services T01 needed to spike would work the same way with the account's existing credentials.
- Happened: `Bedrock Converse` failed with `AccessDeniedException: Your account is currently being verified... normally takes less than 2 hours`, then on retry ~15 minutes later with a different error, `ValidationException: Operation not allowed` (consistent with Bedrock model access - a separate, manual one-time console grant - not yet enabled, once the account-verification part cleared). `VerifiedPermissions.CreatePolicyStore`, `Translate.TranslateText`, and `Textract.AnalyzeDocument` all failed identically with `AccessDeniedException`/`SubscriptionRequiredException: The AWS Access Key Id needs a subscription for the service`. Meanwhile `Bedrock.ListFoundationModels` (control-plane, read-only) and `Polly.DescribeVoices` both worked fine the whole time.
- Evidence / numbers: `spikes/bedrock.ts`, `spikes/bedrock-converse.ts`, `spikes/avp.ts`, `spikes/polly-translate.ts`, `spikes/textract.ts` - all runnable, all reproduce the same errors on demand.
- Changed: flagged this as the top human action item in T01's Handoff rather than trying to work around it - a fresh/newly-verified AWS account appears to gate a specific subset of services (ML/AI-ish ones) behind identity verification and, for Bedrock specifically, an additional manual "model access" grant in the console. Nothing here is fixable from inside this session.

### 2026-09-17 20:10 IST · T01 · Polly has zero Hindi or Kannada voices - docs assumed only Kannada would be missing
- Expected: docs/SAFETY_AND_CONTENT.md's read-aloud plan assumes Polly covers Hindi (pre-rendered MP3s at build time) and only asks "if Polly has no Kannada voice, fall back to browser speechSynthesis" - implying Hindi was assumed safe.
- Happened: `Polly.DescribeVoices({ LanguageCode: 'hi-IN' })` and `{ LanguageCode: 'kn-IN' }` both returned zero voices. Checked the full 100-voice catalog for any voice with "Hindi" or "Kannada" in its language name too, in case the code was wrong - nothing. Only `en-IN` (Indian English: Raveena, Aditi, Kajal) exists.
- Evidence / numbers: `spikes/polly-translate.ts` output; full catalog dump cross-checked by language name, not just code.
- Changed: Hindi read-aloud needs the same browser-`speechSynthesis` fallback docs/SAFETY_AND_CONTENT.md only planned for Kannada - this affects lane I's read-aloud implementation, worth a docs/SAFETY_AND_CONTENT.md update and a heads-up to whoever picks up I.
