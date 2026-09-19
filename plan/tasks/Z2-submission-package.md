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
**Done:**
- `README.md` rewritten with real numbers from `docs/PRODUCT.md`'s Evidence table (3,326 flagged batches / 21 months, 99.47% within expiry), the architecture diagram, the "Where AWS fits" service table, measured latency, an honest note on why accuracy/per-scan cost aren't measurable yet (account-wide Bedrock restriction), deploy steps, and a status summary pulled from `plan/INTEGRATION_LOG.md`.
- `submission/WRITEUP.md` filled in from the template: problem statement with real numbers, architecture summary, full "Where AWS fits" table, decisions we're proud of, measured results (accuracy/cost/latency, honestly marked where not yet measurable), 6 picked entries from `submission/LEARNING_LOG.md`, limitations, what's next.
**Remaining:**
- Screenshots/GIF for the README.
- Export the mermaid architecture diagram to a PNG (README currently embeds mermaid source, which GitHub renders natively, but Deliverable 1 asks for an exported PNG too).
- Video: record per `submission/DEMO_SCRIPT.md`, ≤3:00, captions, mock-strip disclosure on screen, upload and link (human task — needs a screen recording).
- AWS Builder Center blog post adapted from the writeup, linked in the submission.
- Team names/roles, Builder Center profile links (Deliverable 6, fast-track eligibility) — left as `{{...}}` placeholders in both README.md and WRITEUP.md, needs the human team.
- Licence choice for README.md (left as a placeholder, MIT suggested).
- Accuracy numbers in WRITEUP.md "Measured results" and "What we learned" — fill in once lane E's harness has run against real photos (still blocked, see plan/INTEGRATION_LOG.md).
- "AI tools used" section — confirm whether any tool beyond Claude Code was used.
- Early submission Saturday 18:00, final submission ≥3h before deadline — human actions on the hackathon's own form.
**Gotchas / decisions:**
- Deliberately did not invent accuracy or per-scan cost numbers that don't exist yet — both sections say plainly what's measured vs. blocked, rather than presenting a placeholder as real. Matches the acceptance criterion "every claim in the video is shown working or backed by a measured number."
- Checked `plan/CHANGELOG.md`'s "Contract change requests" section before writing this: it's correctly still empty since none of the three low-urgency CCRs from lanes S/J/M have been human-approved yet — no writeup claim depends on those being unified.
**Contract change requests:**
- none
**Learning log entries added:** no (this session was writeup/docs only, no new engineering finding to log)
