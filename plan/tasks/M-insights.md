# M — Public insights page
**Priority:** P2 · **Wave 2** · **Sessions:** 1 · **Depends on:** S

## Read first
CLAUDE.md, docs/UX.md, S Handoff, docs/SAFETY_AND_CONTENT.md (wording)

## Owns
`services/insights/**`, `apps/web/src/features/insights/**`, `infra/lib/lanes/m-insights.ts`

## Deliverables
1. `GET /v1/public/insights`: flagged batches per month (NSQ vs Spurious), by reason code, by reporting source, lag and months-to-expiry distributions, headline cards.
2. `/insights` page with accessible charts (e.g. Recharts), each with a text summary and "Source: CDSCO alerts, computed by Asli on <date>".
3. No manufacturer rankings or named-company charts.

## Acceptance criteria
- [ ] Headline matches S numbers
- [ ] Charts readable at 360 px and with screen reader summaries

---
## Handoff (the session updates this before stopping)
**Status:** IN PROGRESS (code-complete, not yet deployed/verified against real data)
**Stage deployed:** none - no AWS deploy permission available this session; `STAGE=dev-m SHARED_STAGE=dev-shared npx tsx bin/app.ts` (from `infra/`) synths clean against `dev-shared`'s real SSM parameters (stats table, shared HTTP API) - all 24 lane stacks bundled successfully with exit code 0, including `LaneMStack-dev-m`.
**Done:**
- `services/insights/**`: `GET /v1/public/insights` handler reads lane S's `ImpactStatsDocument` (`STATS#IMPACT`/`ALL` in the shared Stats table, via `@asli/stats`'s exported types - no edits to `services/stats`) and reshapes it into `InsightsResponseSchema`-conformant fields (generatedAt, byCategory, byMonth, topReasonCodes) plus chart-only detail (byMonthCategory NSQ/SPURIOUS split, byReportingSource, withinExpiry share, mfgToAlertLagMonths, alertToExpiryRemainingMonths) - same "contract superset" pattern lane J already used for `/v1/public/metrics` (see this task's Handoff "Contract change requests"). Returns a zeroed body before `compute-stats` has ever run, mirroring lane S's own `/v1/public/stats` fallback. 2 unit tests (`pnpm -r test`), lint/`tsc --noEmit` clean.
- `infra/lib/lanes/m-insights.ts`: imports the stats table from `dev-shared` via SSM, grants read-only access, registers the public route. Auto-discovered by `infra/lib/load-lanes.ts`, no other infra file touched. No compute job of its own and no write access to any table.
- `/insights` page (`apps/web/src/features/insights/**`): headline cards from `GET /v1/public/stats` (reused verbatim, not recomputed, so totals can't drift from lane S's numbers - this task's first acceptance criterion); four `role="img"`-labelled Recharts charts (flagged batches per month by NSQ/SPURIOUS, by reason code, by reporting lab, timing table for the two lag distributions) each with a plain-language text summary above it and a "Source: CDSCO alerts, computed by Asli on <date>" line below it (Deliverable 2); a collapsible table of the month-by-month numbers as a non-chart fallback. Reason codes use `@asli/content`'s reviewed `reasonPlainText()` instead of raw codes (docs/UX.md "plain words, no jargon"). No manufacturer/company breakdown anywhere (Deliverable 3, docs/PRODUCT.md "Out"). Wired into `apps/web/src/app/routes.tsx` (the `// M adds:` placeholder D1 had already left was filled in exactly as commented). 2 component tests + `pnpm --filter @asli/web build` (tsc + vite production build) clean.
- Added `recharts` and `@asli/content` (read-only, for `reasonPlainText`) to `apps/web/package.json`.
**Remaining:**
- Real deploy (`cdk deploy LaneMStack-<stage>` or `int` once X does the shared `int` deploy) and a check against real backfilled data once lane S's `compute-stats` has actually run on `int` - not possible this session (no deploy permission granted). Once it has, re-verify the "headline matches S numbers" and "charts readable at 360px" acceptance criteria against the real page, not just the synthetic fixtures used here.
- Screen-reader manual pass (VoiceOver/NVDA) on the live page - the `role="img"` aria-labels and text summaries are a best-effort implementation, not manually verified with an actual screen reader this session.
**Gotchas / decisions:**
- **Contract gap, resolved the same way lane S resolved its own.** `@asli/contracts`'s `InsightsResponseSchema` (generatedAt, byCategory, byMonth, topReasonCodes) doesn't cover this task's byReportingSource / lag / months-to-expiry-distribution deliverables. Rather than block on a contract edit (lanes can't touch `packages/contracts` without T02/human approval) or fork a second endpoint, this lane copied lane J's existing precedent for `/v1/public/metrics`: `GET /v1/public/insights` returns the frozen schema's fields plus a documented superset (`services/insights/src/types.ts` `InsightsDetail`, mirrored in `apps/web/src/features/insights/types.ts`). Any caller reading only `InsightsResponse`'s documented fields is unaffected; `InsightsResponseSchema.parse()` is still called on the exact contract subset before the extra fields are spread in, so the contract portion is validated.
- `services/insights` depends on `@asli/stats` (workspace protocol) purely as a type source (`ImpactStats`, `ImpactStatsDocument`, `LagStats`) rather than duplicating that shape locally - it's read-only, type-only, and the two lanes already share the same Stats table item shape by construction.
- Recharts' `ResponsiveContainer` needs `ResizeObserver`, which jsdom 25.0.1 doesn't provide - stubbed locally in `InsightsPage.test.tsx` via `vi.stubGlobal`, not in the shared `apps/web/src/test-setup.ts` (kept the fix inside this lane's own file rather than touching shared test infra another lane owns).
- Lag/months-to-expiry distributions are rendered as a table (mean/median/p10/p90/max), not a chart - only five summary numbers exist per distribution (no raw histogram buckets are computed anywhere), and an exact-numbers table is more accessible for the elderly-first audience (docs/UX.md) than a bar chart of two data points would be.
**Contract change requests:**
- Propose `@asli/contracts`'s `InsightsResponseSchema` gain the fields this lane's `InsightsDetail` superset adds (byReportingSource counts, mfgToAlertLagMonths/alertToExpiryRemainingMonths `LagStats`, withinExpiry share) so the richer insights shape is contract-validated instead of a lane-local extension - same low-urgency flag lane S already raised for its own `ImpactStatsDocument`/`PublicStatsSchema` gap. Nothing currently depends on this being contract-validated; flagging for whoever owns contracts going forward (T02/human) to decide.
**Learning log entries added:** yes (`submission/LEARNING_LOG.md`, lane M entry)
