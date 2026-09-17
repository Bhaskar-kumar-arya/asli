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
