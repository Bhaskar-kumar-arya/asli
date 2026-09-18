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

### 2026-09-17 22:29 IST · T02 · One blocked resource rolled back a 60-resource CloudFormation deploy entirely
- Expected: `cdk deploy dev-shared` would create all resources in `shared-stack.ts` - DynamoDB tables, buckets, Cognito, HTTP API, SNS/SQS, and the Verified Permissions policy store - in one deploy, matching the earlier clean `cdk synth`/`cdk diff`.
- Happened: `AWS::VerifiedPermissions::PolicyStore` failed with `AccessDeniedException: The AWS Access Key Id needs a subscription for the service` (the same account-wide restriction T01's spike had already found blocking AVP/Translate/Textract). CloudFormation immediately rolled back and deleted all 59 other resources that had already started or succeeded creating - a single blocked service took the whole deploy down with it, even resources with zero relationship to AVP.
- Evidence / numbers: deploy log showed `CREATE_FAILED` on `PolicyStore` at 10:28:51pm, then `ROLLBACK_IN_PROGRESS` citing all 19 in-flight resources, full `DELETE_COMPLETE` by 10:28:57pm - about 6 seconds from first failure to full teardown.
- Changed: wrapped the Verified Permissions block in `shared-stack.ts` behind `if (process.env.ENABLE_AVP !== 'false')`, redeployed with `ENABLE_AVP=false`, succeeded in 67.6s creating everything else. Lesson for future CDK stacks on this account: any resource type behind an account-level service restriction should be made deploy-optional from the start, not bolted on after a failed deploy - a single blocked resource type is an all-or-nothing risk to an entire stack, not just itself.

### 2026-09-17 22:35 IST · T02 · Found a stale parallel branch with the same name and a duplicate contracts-v1 tag on origin
- Expected: `git tag contracts-v1` would create a fresh tag with no conflicts, since this was the first session to do T02's work.
- Happened: `contracts-v1` already existed, pointing to a commit (`9b6a6d5`) not in this branch's history at all. `git branch -a --contains` showed it only lived on `remotes/origin/lane/T02` - a *different* `lane/T02` branch than the one this session had been building on, pushed under a different git author, doing essentially the same T02 task (contracts, shared-stack, seed scripts) plus a T00 Amplify-connection commit.
- Evidence / numbers: `origin/lane/T02`'s tip was `d9eba9b`, sharing only the common ancestor `ddf9db7` with this session's local `lane/T02` (tip `e65efa4`) - genuinely independent histories, not a simple fast-forward gap.
- Changed: asked the human directly rather than guessing how to reconcile - turned out to be a previous attempt on a different device whose environment never worked, so nothing there was actually deployed or otherwise irreplaceable. Force-pushed this session's (deployed, tested) branch over the stale one and moved the tag, with explicit human confirmation before doing anything destructive on `origin`. Worth remembering for solo/asynchronous team setups: check `git fetch && git log origin/<branch>` before assuming a freshly-created worktree branch has no remote history to collide with, especially when someone else might be working the same task from a different machine.

### 2026-09-17 21:50 IST · B · "Followed by a separator" had to mean *required*, not optional, or normalizeBatch breaks its own idempotency requirement
- Expected: docs/MATCHING.md's normalizeBatch spec ("Remove leading labels ... followed by `:` `.` `-` or space characters") could be implemented either way - separator required or optional after the label word - and either reading looked equally plausible from the prose alone.
- Happened: writing the idempotency property test (`normalizeBatch(normalizeBatch(x)) === normalizeBatch(x)`, one of the two required property tests) surfaced that making the separator *optional* breaks idempotency and, worse, silently mangles a real batch number: `"LOT2024001"` (no separator after "LOT") would have "LOT" stripped on the first pass under an optional-separator reading, turning a legitimate batch code into `"2024001"`.
- Evidence / numbers: proved it structurally, not just by running the property test once - after normalizeBatch's final `[^A-Z0-9]` filter, the output can contain no separator character at all, so a label regex that *requires* a separator can structurally never match a second time. `spikes`-style manual trace confirmed `"LOT2024001"` normalizes to itself unchanged with the required-separator version.
- Changed: implemented the separator as required (`[:.\-\s]`, not `[:.\-\s]?`). Worth flagging to anyone else reading MATCHING.md's prose literally - "followed by X" reads more like "optional X" in casual English but the correct implementation needs it required.

### 2026-09-17 21:55 IST · B · MATCHING.md's normalizeManufacturer step order breaks its own worked example if followed literally
- Expected: docs/MATCHING.md numbers normalizeManufacturer's steps 1-6 in the order to apply them: uppercase/NFKC, remove punctuation, remove M/S prefix, remove address (split on comma/AT/PLOT/PIN), remove stopwords, alias lookup.
- Happened: applying step 2 (remove punctuation, which includes commas) *before* step 4 (remove address, which splits on the first comma) means step 4 has no comma left to split on by the time it runs - the doc's own worked example, `"M/s. Cipla Ltd., Plot No. 9" -> "CIPLA"`, doesn't survive that literal ordering (the address half never gets cut off, leaving stray tokens).
- Evidence / numbers: traced both orderings by hand against the worked example; only "address-split before general punctuation cleanup" produces `"CIPLA"`. Also cross-checked against `packages/contracts/fixtures/flagged-batches.json`'s precomputed `manufacturerNorm` values (T02 built that fixture with the same corrected ordering, independently, before this session existed) - `"GIDSHA"` and `"ZENOVA"` only come out right with address-split-first too.
- Changed: implemented address-splitting before the general punctuation-removal step, deviating from the doc's literal numbered order but matching its own worked example and T02's fixture data. Worth a docs/MATCHING.md fix - the numbered list reads as sequential but isn't quite.

### 2026-09-18 01:15 IST · A1 · CDSCO's real response is DataTables JSON, not the HTML docs/DATA_SOURCES.md anticipated
- Expected: docs/DATA_SOURCES.md said to use `cheerio` for HTML parsing, since it was written before T01's spike confirmed the actual response shape.
- Happened: T01's real captured fixtures (`packages/contracts/fixtures/cdsco/endpoint-nsq-2026-02.json`) are DataTables-style JSON (`{aaData: [...]}`) despite a `Content-Type: text/plain;charset=ISO-8859-1` header - no HTML at all. A plain `JSON.parse` on the response text is all `parseSnapshot` needed; adding `cheerio` would have been dead weight.
- Evidence / numbers: parsed all 217 real NSQ rows and all 4 real Spurious rows from T01's fixtures with zero HTML parsing - row counts match exactly.
- Changed: dropped `cheerio` from this lane's dependencies. Also found the Spurious endpoint uses `product_name_from_dtl` where NSQ uses `str_product_name` - every other column name is shared between the two endpoints.

### 2026-09-18 01:40 IST · A1 · First lane to use nodeFn's Lambda bundling hit a missing esbuild binary
- Expected: `infra/lib/lanes/README.md`'s `nodeFn`/`NodejsFunction` pattern would bundle and deploy a Lambda without any extra setup, since `aws-cdk-lib` and `esbuild` were both already somewhere in the dependency tree.
- Happened: `cdk synth`/`deploy` failed with `'esbuild' is not recognized` / `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "esbuild" not found` - `esbuild` was only a transitive dependency (via other tools), never hoisted as a runnable `.bin` entry, and nobody had exercised `NodejsFunction` bundling before this lane.
- Evidence / numbers: `node_modules/.pnpm/esbuild@*` existed in three different versions already, but `infra/node_modules/.bin/esbuild` did not, until `esbuild: "^0.25.12"` was added as an explicit `infra/package.json` devDependency and `pnpm install` re-ran.
- Changed: added the explicit devDependency, then successfully deployed `LaneA1Stack-dev-a1` and invoked the real Lambda (`aws lambda invoke` with `{"month":"2026-02","tab":"nsq"}`) - confirmed a real HTTP fetch of the live CDSCO endpoint and a real S3 write (107199 bytes) via a follow-up `HeadObjectCommand`. Worth remembering for every lane after this one: don't assume a transitive dependency is a usable CLI binary just because it resolves.

### 2026-09-18 01:35 IST · D2 (+D1) · Native HTML5 `required` silently ate our own validation in jsdom
- Expected: `MedicineIdentityForm`'s batch-number `<input required>` plus a custom `onSubmit` handler that checks `!batchNumber.trim()` and sets a friendly error message would both just work together - the handler runs on submit either way.
- Happened: clicking submit with an empty batch field produced *no* error at all, and the custom `onSubmit` handler never even ran - jsdom (matching real browser behaviour) blocks the `submit` event entirely when a `required` field is empty, via the Constraint Validation API, before any JS handler sees it.
- Evidence / numbers: reproduced with a single failing RTL test (`getByRole('alert')` found nothing after `userEvent.click`); a second test that pre-filled the field then edited it worked fine, isolating `required`-blocks-submission as the cause rather than anything userEvent- or React-specific.
- Changed: added `noValidate` to the `<form>` so our own error UI (which also needs to show low-confidence highlighting, not just presence/absence) is the only validation path. Worth remembering for any other form in this app that wants custom inline errors instead of the browser's native validation bubble.

### 2026-09-18 01:40 IST · D2 (+D1) · TypeScript narrowing from a param guard doesn't survive into a nested closure
- Expected: `const { kind } = useParams<{ kind: 'strip' | 'bill' }>(); if (kind !== 'strip' && kind !== 'bill') return ...;` would leave `kind` narrowed to `'strip' | 'bill'` for the rest of the component, including inside a `handleFile` function declared later in the same component body.
- Happened: TS still reported `kind` as `'strip' | 'bill' | undefined` inside `handleFile`, failing to satisfy `CreateUploadRequest`'s `kind` field - narrowing from an early-return guard doesn't propagate into nested function closures, even for a `const` binding, since TS can't prove the closure runs before any hypothetical reassignment.
- Changed: rebound to a fresh `const captureKind = kind` immediately after the guard, and used `captureKind` everywhere inside `handleFile`. Standard workaround, but easy to trip over the first time - worth remembering for any other lane doing param-based route guards ahead of an inner async handler.

### 2026-09-18 12:05 IST · D2 (+D1) · Context action functions built inside a state-keyed useMemo caused an infinite render loop, only visible as a "hung" test/build
- Expected: `ScanFlowProvider`'s context value (`useMemo(() => ({...state, setResults, ...}), [state deps])`) was fine to test - a consuming `useEffect` with `[setResults]` in its deps would just run once, since `setResults` is "a function on the context."
- Happened: `setResults` was defined *inside* the `useMemo` factory, which re-ran on every `results`/`warnings`/`billMode`/`pendingConfirm` change - so calling `setResults` produced a *new* `setResults` function identity every time. A consumer's `useEffect(() => setResults(...), [setResults])` therefore looped forever: call → new state → new memo → new `setResults` reference → effect deps changed → effect fires again. This didn't show up as a test failure - `vitest run` on that one file just hung indefinitely (no error, no timeout from vitest itself), which looked identical from the outside to an unrelated Windows resource-contention issue we'd just spent 20 minutes chasing (dozens of orphaned `node.exe` vitest workers from earlier backgrounded runs, killed and re-verified as a red herring before finding the real cause).
- Evidence / numbers: isolated with `npx vitest run <single file> --pool=forks` after confirming a clean process table (`Get-CimInstance Win32_Process` showed 0 stray node processes) - it still hung, proving the earlier process cleanup wasn't the cause. Reproduced consistently in under 30s once isolated.
- Changed: moved every action (`setPendingConfirm`, `setResults`, `reset`) to its own `useCallback(..., [])` (stable identity, no deps, since they only call `set*State` setters which React guarantees are stable) and only the plain data (`pendingConfirm`, `results`, `warnings`, `billMode`) plus those stable callbacks go into the outer `useMemo`. Lesson: never define a context's action functions inline inside a `useMemo`/`useCallback` that also depends on the state those actions update - it silently breaks referential stability, and the failure mode (an infinite effect loop) can look exactly like a stuck test runner or a starved machine rather than a straightforward bug.
