# G1 — Web push and email senders, subscriptions API
**Priority:** P0 · **Wave 1** · **Sessions:** 1 · **Depends on:** T02, T01 (push and SES spikes)

## Read first
CLAUDE.md, docs/ALERTS.md (Senders), docs/SAFETY_AND_CONTENT.md, docs/PRIVACY.md, docs/API.md (push)

## Goal
When an `AlertEvent` is published, every permitted caregiver gets a push notification and an email, exactly once per channel.

## Owns
`services/notify/**`, `infra/lib/lanes/g1-notify.ts`

## Deliverables
1. Subscriptions API: `POST/DELETE /v1/push/subscriptions`, `GET /v1/push/vapid-public-key`, `POST /v1/push/test`.
2. SNS subscriber Lambda `push-sender`: resolve recipients (members, `alertsEnabled`, `authz ReceiveAlerts`), load subscriptions, render notification text from `packages/content` in member language, send with `web-push`, delete 404/410 subscriptions, idempotency (eventId+userId+push).
3. SNS subscriber Lambda `email-sender`: SES v2 SendEmail with HTML+text templates from `packages/content` (fallback simple template if I not merged), idempotency (eventId+userId+email), configuration set.
4. DLQs on both subscriptions; retries.
5. Metrics.

## Acceptance criteria
- [ ] Publishing a fixture AlertEvent to `dev-g1` topic delivers a push to a real Android phone and an email to a verified address
- [ ] Publishing the same event twice delivers once
- [ ] A member with alerts off receives nothing
- [ ] Notification and email text pass the wording rules (unit test for banned words)

## Out of scope
Deciding matches.

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
