# Z1 — Hardening and feature freeze
**Priority:** P0 · **Stage 5 (Sat 22:00 onward)** · **Sessions:** 1–2

## Read first
CLAUDE.md, plan/BUILD_PLAN.md (Gates, Cutting rules), docs/PRIVACY.md, docs/OBSERVABILITY_AND_COST.md, plan/INTEGRATION_LOG.md

## Checklist
- [ ] No new features after freeze; unfinished Wave 2 lanes disabled by feature flag or removed
- [ ] All DLQs empty; alarms configured; budget alarm active
- [ ] Logs audited: no personal data, images or model output
- [ ] Wording audit across en/hi/kn (banned words test green)
- [ ] Every FLAGGED/VERIFY path shows a working CDSCO source link
- [ ] Demo data reset script works; demo replay rehearsed twice on a real Android phone
- [ ] CDSCO outage rehearsal: app still works from stored data when the site is unreachable
- [ ] Cold-start latency acceptable; consider provisioned concurrency only on scan Lambda during recording (remove after)
- [ ] `int` redeployed from `main` via one `cdk deploy --all`; fresh-account deploy steps in README verified
- [ ] Optional: `DELETE /v1/me` account deletion
- [ ] Git history check: first commit after event start, no large vendored prior work

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
