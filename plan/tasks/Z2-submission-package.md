# Z2 — Submission package
**Priority:** P0 · **Stage 5 (drafting starts Saturday morning)** · **Sessions:** 1–2

## Read first
CLAUDE.md, submission/DEMO_SCRIPT.md, submission/WRITEUP.md, submission/LEARNING_LOG.md, S Handoff, E report, J metrics

## Deliverables
1. **README.md** rewritten: problem with computed stats, screenshots/GIF, architecture diagram (export the mermaid to PNG), measured cost and accuracy, deploy steps, AI tools used, licence, credits.
2. **WRITEUP.md** completed from the template using real numbers and the learning log.
3. **Video**: follow DEMO_SCRIPT.md; captions; ≤ 3:00; mock strip disclosure on screen; upload and link.
4. **AWS Builder Center blog post** adapted from the writeup; link it in the submission.
5. Early submission Saturday 18:00 with whatever works; final submission ≥ 3 hours before {{SUBMISSION_DEADLINE}}.
6. Confirm all four teammates' registration and Builder Center profiles are accurate (fast-track eligibility).

## Acceptance criteria
- [ ] Public repo, video link and writeup submitted through the stop's form
- [ ] Every claim in the video is shown working or backed by a measured number

---
## Handoff (the session updates this before stopping)
**Status:** IN PROGRESS
**Stage deployed:** n/a (docs-only work this session)
**Done (previous session):**
- `README.md` rewritten with real numbers from `docs/PRODUCT.md`'s Evidence table (3,326 flagged batches / 21 months, 99.47% within expiry), the architecture diagram, the "Where AWS fits" service table, measured latency, an honest note on why accuracy/per-scan cost aren't measurable yet (account-wide Bedrock restriction), deploy steps, and a status summary pulled from `plan/INTEGRATION_LOG.md`.
- `submission/WRITEUP.md` filled in from the template: problem statement with real numbers, architecture summary, full "Where AWS fits" table, decisions we're proud of, measured results (accuracy/cost/latency, honestly marked where not yet measurable), 6 picked entries from `submission/LEARNING_LOG.md`, limitations, what's next.

**Done (this session):**
- `submission/BLOG_POST.md`: new AWS Builder Center blog post adapted from `WRITEUP.md`, same real numbers (171/170 hand-check, 3,326/99.47% full backfill, latency, cost, the account-wide Bedrock restriction and the Gemini-fallback decision from commit `7466969`), written in blog tone (hook → problem → what we built → engineering decisions → honest measured-vs-not section → what's next) rather than the submission-form template structure. Links the real repo (`https://github.com/Bhaskar-kumar-arya/asli`, confirmed via `git remote -v`) and Claude Code.
- `LICENSE`: real MIT license text added at repo root, copyright year 2026. Searched the repo (`package.json`, README, docs, plan) for a team/org name to use as the copyright holder — found none (git authors are two individuals: "HEET SHAH" and "devestrator"/Bhaskar) — so left the holder as `{{TEAM_NAME}}`, clearly marked, per the task instructions not to invent a name.
- `README.md` Licence section: now says MIT, links `LICENSE`, notes the `{{TEAM_NAME}}` placeholder is pending Deliverable 6.
- Architecture diagram exported to PNG: `docs/diagrams/architecture.mmd` (mermaid source, copied from README) rendered with `npx @mermaid-js/mermaid-cli@11.17.0` (worked headless in this Windows/PowerShell environment — no browser needed, puppeteer's bundled Chromium handled it) to `docs/diagrams/architecture.png` (1600px wide, white background, 67KB). README's architecture section now links both the mermaid source (GitHub renders it natively) and the exported PNG.
- README screenshots: added a "Screenshots" section marking this as an outstanding human TODO, with the exact live URL (`https://main.d2ag2oukltn4mc.amplifyapp.com`, confirmed real from `plan/INTEGRATION_LOG.md`) and the 3 screens that matter most per `submission/DEMO_SCRIPT.md`'s shot list: (1) the flagged result card with CDSCO source link, (2) the "No alert found" neutral card (proves the never-say-"safe" rule), (3) the shared cabinet with a caregiver alert arriving. Also added the same TODO note at the top of the README where the video thumbnail/GIF placeholder already was.
- "AI tools used" in `WRITEUP.md`: confirmed via `git log --all --grep` (no Copilot/Cursor/other coding-tool mentions) and `git log --all --format --grep "co-authored-by"` (only `Claude Sonnet 5` and `Claude Haiku 4.5` trailers exist across all 54 commits) that Claude Code is the only coding assistant used. Also honestly noted the one other AI-adjacent fact found in git history: commit `7466969` made Gemini the *runtime* default vision-extraction provider for the product (a product dependency, not a coding tool) — described accurately in both `WRITEUP.md` and `BLOG_POST.md` as separate from "AI tools used to build this repo".
- Linked `BLOG_POST.md` from the top of `WRITEUP.md` with a `{{BUILDER_CENTER_BLOG_URL}}` placeholder for the human to fill in once published.
- `pnpm -r lint && pnpm -r test` run: no-op as expected (docs/LICENSE/PNG-only changes, no app code touched).

**Done (2026-09-20, aligning the package to the organisers' final-day notice and rubric):**
- `submission/WRITEUP.md` rewritten: links table, "Open the live app without signing up" (public `/insights` + `/dashboard`, seeded demo login, two manual-check inputs verified against the live API today: E9AIY029 → FLAGGED, an unlisted batch → NO_ALERT_FOUND), who-did-what from git history, AWS table with a live/blocked status column, real accuracy numbers from the 2026-09-19 harness run (the old "not yet measurable" text was stale), a new "AWS feedback" section, and a rubric map. Previously said Bedrock reads photos; it is Gemini in practice, now stated plainly.
- `submission/DEMO_SCRIPT.md` rewritten to the 3:00 cap with only measured numbers, an "say and show honestly" list (no "Bedrock reads the strip", no "Verified Permissions" on camera, no cost-per-scan), a replay fallback, and a pre-record checklist that includes opening the live URL in a private window.
- New `submission/FORM_ANSWERS.md` (paste-ready form answers). The form itself is not readable without signing in, so field names are inferred from the notice.
- `README.md`: added "Try it (no sign-up)", fixed stale accuracy/status text, removed a stray `Deliverable 6.}}` fragment. `submission/BLOG_POST.md`: replaced the stale accuracy paragraph with the real figures.
- AI-tools credit corrected: trailers are Sonnet 5 (63), Opus 5 (11), Haiku 4.5 (1); previously omitted Opus 5.
- Verified the demo login works (Cognito `USER_PASSWORD_AUTH`) and `GET /v1/public/metrics` returns real accuracy data.

**Still `{{...}}` (human only, do not submit with these):** `{{YOUTUBE_URL}}`, `{{BUILDER_CENTER_BLOG_URL}}`, `{{BUILDER_CENTER_PROFILE_LINKS}}`. Roster resolved 2026-09-20: the team used two shared laptops for almost the whole build plus a third near the end, so git authors (`HEET SHAH` 57, `devestrator` 30, `YashasYogindra` 1) are laptops, not people. WRITEUP/FORM_ANSWERS/README now state a one-owner-per-area split (Bhaskar backend and pipeline, Pushya frontend, Heet design and content, Yashas architecture, infra and delivery). The per-area detail is derived from the recorded roles plus the repo's work areas, so the team should sanity-check it.

**Remaining (all human-only):**
- ~~Screenshots/GIF for the README~~ — done, `docs/screenshots/` exists and is linked (this line was stale).
- Video: record per `submission/DEMO_SCRIPT.md`, ≤3:00, captions, mock-strip disclosure on screen, upload and link.
- Publish `submission/BLOG_POST.md` to AWS Builder Center and fill in `{{BUILDER_CENTER_BLOG_URL}}` in `WRITEUP.md`.
- Builder Center profile links (Deliverable 6, fast-track eligibility). Team name and roles are done (team **bskry**, one owner per area).
- Accuracy numbers in WRITEUP.md "Measured results" and "What we learned" — fill in once lane E's harness has run against real photos (now unblocked in principle since C's Gemini fallback is live and verified against one real photo per commit `7466969`, but a full scored run hasn't happened yet).
- Early submission Saturday 18:00, final submission ≥3h before deadline — human actions on the hackathon's own form.

**Gotchas / decisions:**
- Deliberately did not invent accuracy or per-scan cost numbers that don't exist yet, in either `WRITEUP.md` or the new `BLOG_POST.md` — both say plainly what's measured vs. blocked. Matches the acceptance criterion "every claim in the video is shown working or backed by a measured number."
- `npx @mermaid-js/mermaid-cli` needed one retry with `-y` — the first bare `npx` call declined to install without an explicit yes flag. Once given `-y`, headless rendering worked fine on this Windows box with no extra browser setup, so no PNG-generation fallback note was needed in the README after all.
- Did not touch `docs/PRODUCT.md`, `plan/INTEGRATION_LOG.md`, or any application code — stayed within README.md / submission/** / LICENSE / docs/diagrams/architecture.{mmd,png} as instructed.
**Contract change requests:**
- none
**Learning log entries added:** no (this session was writeup/docs only, no new engineering finding to log)
