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

### 2026-09-17 · T00 · Amplify Hosting deployment complete
- Expected: scaffolded monorepo would be deployable to Amplify Hosting via `amplify.yml` build spec.
- Happened: main branch auto-deployed and is now live at https://main.d2ag2oukltn4mc.amplifyapp.com showing "Asli — coming soon" placeholder page.
- Evidence / numbers: PWA installable on mobile (Android tested) and desktop, service worker registered, precache manifest injected by build. Page loads in <1s.
- Changed: T00 is now DONE; all deliverables complete. Remaining work (AWS Budgets alert, `cdk bootstrap`) moves to human/T02. Lane deployments can now proceed with CDK stacks.
