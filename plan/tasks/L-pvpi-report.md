# L — "Report a problem" routed to PvPI
**Priority:** P2 · **Wave 2** · **Sessions:** 1 · **Depends on:** core gate

## Read first
CLAUDE.md, docs/PRODUCT.md (Out of scope: crowd warnings), docs/DATA_MODEL.md (Reports), docs/SAFETY_AND_CONTENT.md

## Owns
`services/reports/**`, `apps/web/src/features/report/**`, `infra/lib/lanes/l-reports.ts`

## Deliverables
1. **Verify first:** current official Pharmacovigilance Programme of India (PvPI) consumer reporting routes (form, app, helpline) from official IPC/PvPI sources. Record URLs and date in Handoff. Do not ship unverified numbers or links.
2. "Report a problem with this medicine" on result and medicine detail screens: choose problem type (side effect, looks different, doesn't seem to work, packaging problem, other), explanation of how to report to PvPI, batch details formatted for copying.
3. `POST /v1/reports`: store privately (docs/DATA_MODEL.md Reports) and return PvPI routes. Never displayed to other users, never affects tiers.
4. Wording: "Asli does not investigate reports. PvPI is the official channel."

## Acceptance criteria
- [ ] Links verified with date
- [ ] Report stored without personal data beyond IDs
- [ ] No UI anywhere shows report counts per batch

---
## Handoff (the session updates this before stopping)
**Status:** IN PROGRESS (deployed and smoke-tested; not yet wired into result/detail screens)
**Stage deployed:** `dev-l` (`LaneLStack-dev-l`, imports shared resources from `dev-shared`). Deployed via `STAGE=dev-l SHARED_STAGE=dev-shared cdk deploy LaneLStack-dev-l` - only this lane's stack, not the other lanes that also happen to synth under the shared `dev-l` STAGE name.

**Verified PvPI routes (2026-09-18):**
- Toll-free helpline: **1800-180-3024** (Mon–Fri 9:00 AM–5:30 PM IST, voicemail outside hours) - confirmed on both https://www.ipc.gov.in/PvPI/adr.html and the PvPI FAQ page (https://www.ipc.gov.in/mandates/pvpi/pharmacovigilance-skill-development-programme/8-category-en/429-pvpi-frequently-asked-questions.html).
- Mobile app: **"ADR PvPI"** (Android, Google Play) - confirmed on the same FAQ page.
- Official consumer ADR reporting form (live PDF, fetched and confirmed as a real 548 KB PDF): https://cdsco.gov.in/opencms/export/sites/CDSCO_WEB/Pdf-documents/Consumer_Section_PDFs/ADRRF_2.pdf
- Consumer reporting overview page: https://www.ipc.gov.in/PvPI/adr.html
- **Not shipped:** an NCC-PvPI email address (`pvpi.ipc@gov.in` appeared in a search snippet) - the address on ipc.gov.in's own pages is spambot-obfuscated and couldn't be confirmed directly, so it's omitted per CLAUDE.md ("do not ship unverified numbers or links"). All of the above live in `services/reports/src/pvpi.ts` with source citations inline.

**Done:**
- `services/reports/**`: `POST /v1/reports` handler (`handlers/create-report.ts`), repo/db helpers, verified PvPI routes + fixed problem-type list (`pvpi.ts`), unit tests (4 passing) covering 401 on missing JWT, 400 on an unknown `problemType`, successful store + response shape, and that no personal data (`userId`, full `identity`) reaches the stored item or the response body.
- `infra/lib/lanes/l-reports.ts`: imports the shared `reports` table via SSM (already provisioned by T02's shared-stack), one Lambda, one JWT route. Matches the `f-cabinet.ts`/`g1-notify.ts` pattern; `pnpm --filter infra build/test` green.
- `apps/web/src/features/report/**`: `ReportProblemButton` (drop-in component) + `ReportProblemModal` (problem-type radio group, optional 280-char note, batch-details copy box, PvPI routes shown after submit, "Asli does not investigate reports. PvPI is the official channel." wording, no "safe"/"genuine" anywhere - asserted in a test). 4 component tests passing.
- `pnpm -r lint` and the touched packages' `test`/`build` all pass.

**Remaining:**
- **Not wired into any screen.** Lane L only owns `apps/web/src/features/report/**` per this task file - `ResultCard.tsx` (lane C, `apps/web/src/features/scan/components/`) and `MedicineDetailPage.tsx` (lane F, `apps/web/src/features/cabinet/pages/`) both need one import + one line added:
  `import { ReportProblemButton } from '../../report';` then `<ReportProblemButton identity={...} alertRef={match?.alertRef} />` next to the existing action buttons. Left un-added rather than editing another lane's owned files.
- Not deployed to `int` - only `dev-l`, per CLAUDE.md ("Never deploy to `int` unless your task is T02, X or Z1"). Whoever runs the `int` integration pass (lane X) should `cdk deploy LaneLStack-int` (after destroying `LaneLStack-dev-l` first, per X's own learning-log entry about the shared HTTP API/Cognito pool being single physical resources that reject a duplicate `POST /v1/reports` route).

**Gotchas / decisions:**
- `ReportItemSchema` (packages/contracts) has no `userId` field by design (see submission/LEARNING_LOG.md's L entry) - the JWT is required and checked (so only signed-in users can report) but the sub is never persisted. Don't add a userId column without a contract change request.
- `problemType` is `z.string()` in the contract (not an enum), so the handler enforces the fixed 5-value list (`side_effect`, `looks_different`, `not_working`, `packaging_problem`, `other`) itself and 400s on anything else. The same literal list is duplicated in `apps/web/src/features/report/problemTypes.ts` - keep both in sync if the list changes.
- No idempotency table used for this write (unlike F/G1's `makeIdempotent`) - a duplicate report on retry is harmless (private, not user-visible, doesn't affect tiers), so a random `reportId` + `attribute_not_exists(PK)` condition was judged sufficient rather than adding an idempotency-table dependency this lane doesn't otherwise need.

**Contract change requests:**
- none - `ProblemReportRequestSchema`/`ProblemReportResponseSchema`/`ReportItemSchema` were already complete and used as-is.

**Learning log entries added:** yes
