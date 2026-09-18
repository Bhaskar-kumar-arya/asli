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
**Status:** IN PROGRESS
**Stage deployed:** none yet - `cdk synth` for `LaneG1Stack-dev-g1` verified clean (imports resolve, all constructs synthesize), not `cdk deploy`d
**Done:**
- `services/notify/**` (`@asli/notify`): subscriptions API handlers (`POST`/`DELETE /v1/push/subscriptions`, `GET /v1/push/vapid-public-key` public, `POST /v1/push/test`); `push-sender` and `email-sender` SNS-subscriber Lambdas; recipient resolution (`recipients.ts`, Cabinets Member items filtered on `alertsEnabled` and a local `authz-stub.ts` matching docs/PERMISSIONS.md's documented stable interface - all three roles permit `ReceiveAlerts`, so this reduces to "any member with alerts on", but the check is there for when roles/policies change); VAPID keys loaded from Secrets Manager (`vapid.ts`); member email looked up from Cognito by `sub` (`cognito.ts`, `ListUsers` filter - `packages/contracts` doesn't store email in Cabinets per docs/PRIVACY.md); push/email templates (`templates/push.ts`, `templates/email.ts`, `templates/reasons.ts`) following docs/SAFETY_AND_CONTENT.md wording exactly, enforced by `templates/banned-words.ts` (`assertNoBannedWording` runs on every rendered template before it can be sent, not just reviewed by eye) - `packages/content` (lane I) is still a placeholder, so these are the documented English fallback with the same call signature `packages/content` can later slot behind. Powertools Logger/Metrics used throughout (`observability.ts`); Powertools Idempotency (`idempotency.ts`) wraps the per-recipient send functions keyed on `[eventId, userId, channel]` via `eventKeyJmesPath` (docs/ALERTS.md).
- `infra/lib/lanes/g1-notify.ts`: one stack, imports push-subscriptions/cabinets/idempotency tables, the shared alerts SNS topic, VAPID secret + public key, and Cognito user pool ID by SSM; two SQS DLQs (one per SNS subscription, per the deliverable); an SES `CfnConfigurationSet` for bounce/complaint tracking; wires the 4 subscriptions-API routes via `addRoute`.
- 26 unit tests (`pnpm --filter @asli/notify test`) covering: wording-rule enforcement across all tier/category combinations (FLAGGED/NSQ, FLAGGED/SPURIOUS, VERIFY), recipient filtering (alertsEnabled, all 3 roles, pagination), push-sender (multi-subscription fan-out, 410 deletes the subscription, non-410/404 doesn't, empty-subscription short-circuit), email-sender (send vs skip-when-no-email), and all 3 subscriptions-API handlers. `pnpm -r lint && pnpm -r test && pnpm -r build` all pass for every package this session touched (see Gotchas for one pre-existing `infra` build failure unrelated to G1).
**Remaining:**
- Real `cdk deploy` of `LaneG1Stack-dev-g1` and an end-to-end send (fixture AlertEvent -> real push to an Android phone + real email) - this session only got to `cdk synth`, not a deploy or a live send. That's this task's actual acceptance criteria and isn't done yet.
- `FROM_EMAIL`: no SSM path exists for a verified SES sender address (not this lane's contract to add - see Contract change requests) and T01's Handoff section is still empty despite plan/NOW.md saying sender/recipient emails were verified 2026-09-17. Deploy needs the real verified address passed as `FROM_EMAIL=<address>` (defaults to the placeholder `alerts@asli.app`, which is not a verified identity and will fail SES sends as-is).
- Once `packages/content` (lane I) merges, swap `templates/push.ts`/`templates/email.ts` for real `packages/content` lookups - the fallback wording already matches docs/SAFETY_AND_CONTENT.md's `en` copy verbatim so the swap should be low-risk, but hasn't been tried.
- Once `packages/authz` (lane H) merges, swap `authz-stub.ts` for the real `createAuthz({ mode: 'avp' | 'stub' })` - not urgent since the stub's role table matches docs/PERMISSIONS.md exactly and all 3 roles currently permit `ReceiveAlerts` anyway.
- No test yet actually exercises the idempotency wrapper's dedupe behavior end-to-end (mocking the DynamoDB idempotency table); current tests call the unwrapped `sendPushToUser`/`sendEmailToUser` functions directly. Acceptance criterion "publishing the same event twice delivers once" is therefore unverified beyond code review of the Powertools wiring.
**Gotchas / decisions:**
- `withIdempotency`'s `getPersistenceStore()` is called eagerly at module load (`const sendPushToUserIdempotent = withIdempotency(sendPushToUser)` at module scope), which calls `requiredEnv('IDEMPOTENCY_TABLE_NAME')` immediately - so any test that imports `push-sender.ts`/`email-sender.ts` must set that env var *before* the dynamic `import()`, even if the test never calls the idempotent-wrapped function. First use of `@aws-lambda-powertools/idempotency` in this repo; worth knowing for I/other lanes that might use it later.
- `@aws-lambda-powertools/idempotency`'s default behavior hashes the *entire* payload object for the idempotency key unless `eventKeyJmesPath` is given. Used `eventKeyJmesPath: '[eventId, userId, channel]'` so the full `AlertEvent` (also passed in the payload, for the actual send) doesn't affect the key - docs/ALERTS.md specifically wants the key to be `eventId+userId+channel`, nothing more.
- `aws-cdk-lib` has no `aws_sesv2` submodule (only `aws_ses`, which is what `SendEmailCommand`'s v2 API can still reference for a configuration set) - `infra/lib/lanes/g1-notify.ts` uses `aws_ses.CfnConfigurationSet`, the runtime SES send itself is `@aws-sdk/client-sesv2`.
- Found `pnpm -r build` currently fails on `infra` due to `lib/lanes/a2-ingestion.ts` (untracked, presumably A2's in-progress work sitting in this shared working directory) referencing `services/ingestion/statemachine/build.ts` outside `infra`'s `rootDir` - reproduced with `pnpm --filter infra build` alone, confirmed this pre-dates and is unrelated to any G1 file (G1's own `infra/lib/lanes/g1-notify.ts` synths and builds clean in isolation). Not G1's file to fix (CLAUDE.md "stay in your lane" - A2 owns `a2-ingestion.ts`); flagging here rather than touching it. `pnpm -r test` is unaffected and fully green.
**Contract change requests:**
- Suggest T02 add an SSM path for a verified SES sender identity (e.g. `SSM_PATHS.ses.fromEmail`) once the human confirms the real verified address - right now G1 has to thread it through as a bare `FROM_EMAIL` env var at deploy time with no shared source of truth, which every other lane needing to send email (there are none yet, but worth it for consistency) would have to duplicate.
**Learning log entries added:** yes
