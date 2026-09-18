# T00 — Scaffold monorepo, CDK base, hello deploy
**Priority:** P0 · **Stage:** 0 · **Sessions:** 1 · **Depends on:** nothing

## Read first
CLAUDE.md, docs/ARCHITECTURE.md (Deployment model), plan/BUILD_PLAN.md

## Goal
A working monorepo where any lane can build, test and deploy its own stack, and a "hello" PWA live on Amplify Hosting.

## Owns
Root config files, `pnpm-workspace.yaml`, `tsconfig.base.json`, lint/format config, `.github/` (optional), `infra/bin/app.ts`, `infra/lib/stage.ts`, `infra/lib/lanes/README.md`, `apps/web` (Vite scaffold only), empty package folders with `package.json`: `packages/{contracts,matching,content,authz}`, `services/`, `tools/accuracy`, `scripts/`, `testset/README.md`, `.gitignore`.

## Must not touch
docs/, plan/ (except this file's Handoff), submission/

## Deliverables
1. pnpm workspace, TypeScript strict, ESLint + Prettier, Vitest configured in every package; `pnpm -r build|test|lint` work.
2. `infra/bin/app.ts` reads `STAGE` (required), instantiates `SharedStack` placeholder (T02 fills it) and auto-loads every `infra/lib/lanes/*.ts` that exports `register(app, stage)`. A lane adds a file; nobody edits app.ts again.
3. Helper `infra/lib/ssm.ts`: `ssmName(stage, path)`, `importParam(scope, stage, path)`.
4. Lambda helper `infra/lib/node-fn.ts`: NodejsFunction defaults (Node 22, arm64, 512 MB, 30 s, esbuild minify, source maps, X-Ray active, Powertools env vars, log retention 2 weeks).
5. `apps/web`: React + Vite + TypeScript + React Router + vite-plugin-pwa (injectManifest mode with `src/sw.ts`), one page "Asli — coming soon".
6. Amplify Hosting app connected to the repo `main` branch (manual console step documented in Handoff, or CDK `@aws-cdk/aws-amplify-alpha` if smooth). Build spec builds `apps/web`.
7. `scripts/new-worktree.sh <ID>` creates `../asli-<ID>` on branch `lane/<ID>`.
8. README section "Running a lane" (append only to README).

## Acceptance criteria
- [ ] `pnpm install && pnpm -r build && pnpm -r test` pass on a clean clone
- [ ] `STAGE=dev-t00 pnpm --filter infra cdk synth` succeeds
- [ ] A lane file dropped into `infra/lib/lanes/` is picked up without editing app.ts (test with a dummy lane, then delete it)
- [ ] Amplify URL shows the placeholder page on an Android phone and is installable as a PWA
- [ ] AWS Budgets alert created for the account (50% / 80%)

## Out of scope
Any AWS resources other than Amplify and Budgets.

---
## Handoff (the session updates this before stopping)
**Status:** BLOCKED (only on the AWS Budgets alert now - Amplify is connected and live, `cdk bootstrap` is confirmed done)
**Stage deployed:** Amplify Hosting live at https://main.d2ag2oukltn4mc.amplifyapp.com (confirmed loading the "Asli" placeholder page, 2026-09-17)
**Done:**
- pnpm workspace (`pnpm-workspace.yaml`), `tsconfig.base.json` (strict), root ESLint 9 flat config + Prettier. `pnpm install`, `pnpm -r build`, `pnpm -r test`, `pnpm -r lint` all pass on a clean install (verified).
- Empty package skeletons with `package.json` + Vitest + a passing placeholder test each: `packages/{contracts,matching,content,authz}`, `tools/accuracy`. `services/README.md` explains lanes add packages there. `testset/README.md` added.
- `infra/bin/app.ts`: reads `STAGE` (throws if missing), instantiates `SharedStack` only when `STAGE === SHARED_STAGE` (default `dev-shared`), auto-loads every `infra/lib/lanes/*.ts` exporting `register(app, stage)` via `infra/lib/load-lanes.ts`. Verified with a real dummy lane file + `cdk synth` (stack appeared, `app.ts` untouched), then deleted it. Unit test at `infra/test/load-lanes.test.ts` covers the same behavior.
- `infra/lib/stage.ts` (`requireStage`, `sharedStage`, `cdkEnv`, `stackName`), `infra/lib/ssm.ts` (`ssmName`, `importParam`), `infra/lib/node-fn.ts` (`nodeFn()` - Node 22 arm64, 512 MB, 30 s, esbuild minify+sourcemap, X-Ray active, Powertools env vars, 2-week log retention), `infra/lib/shared-stack.ts` (placeholder `SharedStack`, clearly marked "owned by T02, replace this"), `infra/lib/lanes/README.md` (contract + example for lane authors).
- `STAGE=dev-t00 pnpm --filter infra cdk synth` succeeds (verified, no AWS creds needed for synth).
- `apps/web`: React 18 + Vite 6 + TS + React Router + vite-plugin-pwa (`injectManifest`, `src/sw.ts` using `workbox-precaching`), one "Asli — coming soon" page, placeholder PNG icons generated via `scripts/gen-icons.mjs`. `pnpm --filter @asli/web build` produces `dist/sw.js` with an injected precache manifest (verified).
- `amplify.yml` at repo root: builds `apps/web` via pnpm workspace, points Amplify Hosting at `dist/`.
- `scripts/new-worktree.sh <ID>` (executable) creates `../asli-<ID>` on `lane/<ID>`.
- README.md: appended "Running a lane" section (append-only, as required).
- AWS Budgets alert: **not created** - no AWS account/credentials available in this environment. See "For the human" below.
- **Amplify Hosting: connected and live** - https://main.d2ag2oukltn4mc.amplifyapp.com confirmed loading the "Asli" placeholder page (human did this outside this session; verified by fetching the URL). Stage 0 gate's Amplify URL evidence is satisfied.
- **`cdk bootstrap`: confirmed done** - checked directly against the account earlier (CDKToolkit stack, `CREATE_COMPLETE`, bootstrap version 32, ap-south-1).

**Remaining (needs the human, not another lane):**
- Create the AWS Budgets alert (50%/80%) - one-time console/CLI step, see below. This is now T00's only remaining item.
- T01 still needs to confirm region/service availability (Bedrock, Verified Permissions, Textract, Translate, Polly, SES sandbox) - unrelated to T00 but gates A1/A3/C/G1/I per BUILD_PLAN.md. (T01 has run - see plan/tasks/T01-spikes.md; endpoint verdict is `ENDPOINT_OK`, several services blocked on further human AWS-console action.)

**Gotchas / decisions:**
- `infra/package.json` must be `"type": "commonjs"` explicitly. With no `type` field (or `"module"`), `npx ts-node bin/app.ts` silently ran under Node's native ESM loader on Node 24 and `require()`-based lane auto-loading failed with `ERR_MODULE_NOT_FOUND`. Root `package.json` is `"type": "module"` (for the flat ESLint config to load cleanly) - this is safe because Node resolves module type from the *nearest* package.json, and `infra/` has its own.
- Skipped `source-map-support/register` in `bin/app.ts` - importing it without an explicit `.js` extension breaks under strict ESM resolution and it's a convenience-only import (nicer CDK stack traces), not load-bearing.
- Went with the CDK-free "manual Amplify console connection" path (task allowed either) rather than `@aws-cdk/aws-amplify-alpha`, since alpha-package version pinning against a moving `aws-cdk-lib` version is one more thing to break with no AWS account here to test it against. `amplify.yml` is ready either way.
- PWA icons are programmatically generated solid-color PNGs (`scripts/gen-icons.mjs`, not a build dependency, run once and the output committed) - good enough for installability, swap for real branding art later.
- Did not run `pnpm add -g @pnpm/exe` to update pnpm even though a newer version was offered - pinned `packageManager` field keeps lanes reproducible; only bump deliberately.

**Contract change requests:**
- none

**Learning log entries added:** yes
