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
