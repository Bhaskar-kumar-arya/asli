# H — Caregiver permissions with Amazon Verified Permissions, invites, members API
**Priority:** P1 · **Wave 1** · **Sessions:** 1 · **Depends on:** T02

## Read first
CLAUDE.md, docs/PERMISSIONS.md, docs/API.md (invites, members), docs/DATA_MODEL.md (Member, Invite)

## Goal
Real, auditable Cedar policies deciding who can see, edit, manage and receive alerts for a family cabinet.

## Owns
`packages/authz/**`, `services/members/**`, `infra/lib/lanes/h-members.ts`

## Deliverables
1. Day-one: `packages/authz` with the interface and working `stub` mode, committed within 30 minutes (F and G1 import it).
2. `avp` mode: entity building from DynamoDB members, `IsAuthorized`, 30 s cache, deny on error.
3. Cedar schema and policies files (the shared stack deploys them; H owns the source files and their tests; coordinate with X to redeploy SharedStack when policies change).
4. Policy tests: role × action table; stub and AVP parity test (AVP part runs against `dev-h`).
5. Invites and members endpoints; invite codes 8 chars, 72 h TTL, single use; keep ≥ 1 OWNER.
6. SSM switch `/asli/<stage>/authz/mode` = `stub|avp`.

## Acceptance criteria
- [ ] Parity test passes for all 15 role×action combinations
- [ ] On `int` with mode `avp`: VIEWER blocked from removing, EDITOR allowed, OWNER can invite
- [ ] Invite accepted on a second account adds a member
- [ ] Learning log entry: first Cedar policy, what surprised you

## Out of scope
UI (D3).

---
## Handoff (the session updates this before stopping)
**Status:** DONE (stub mode verified live; avp mode unit-tested only, blocked on the same AVP account restriction as T01/T02)
**Stage deployed:** dev-h (`LaneHStack-dev-h`, real `cdk deploy`)
**Done:**
- `packages/authz`: `schema.cedarschema` + `policies/*.cedar` (canonical source, mirrored by T02's `shared-stack.ts` AVP_SCHEMA/AVP_POLICIES - keep in sync), `createAuthz({ mode, ddb, cabinetsTable, policyStoreId?, avpClient?, now? })`. `stub` mode looks the caller's role up in the Cabinets table and checks the role table. `avp` mode builds per-request entities (one fixed `MemberGroup` per role per cabinet) and calls `IsAuthorized`, 30s cache, deny by default on any error. 35 unit tests: full 15 role×action table run against both modes for parity (avp mode against a hand-built fake client whose logic mirrors the real `.cedar` policies, since no live policy store exists yet).
- `services/members`: all 4 endpoints (`POST invites`, `POST invites/:code/accept`, `PATCH members/:userId`, `DELETE members/:userId`). 8-char invite codes (unambiguous alphabet), 72h TTL, single-use (deleted transactionally on accept, `TransactionCanceledException` → 409 on a race). "Keep ≥1 OWNER" enforced in code on both role-change-away-from-OWNER and remove. Self always allowed to toggle own `alertsEnabled` or leave, without a `ManageMembers` check. Authz mode read from SSM `/asli/<stage>/authz/mode` at Lambda runtime (5 min cache), defaults to `stub`. 21 unit tests.
- `infra/lib/lanes/h-members.ts`: one construct, all 4 routes via shared `addRoute`, imports the Cabinets table from SSM, publishes its own `/asli/<stage>/authz/mode` SSM param (default `stub`, override via `AUTHZ_MODE` env at synth time), grants `verifiedpermissions:IsAuthorized` + `ssm:GetParameter` on the (not-yet-existing) AVP policy store param.
- Deployed `LaneHStack-dev-h` for real and invoked all 4 handlers directly against T02's real seeded `cab-mom-001` fixture (real OWNER/EDITOR/VIEWER members) on the live `asli-dev-shared-cabinets` table: OWNER creates invite (201, real code+TTL) / VIEWER denied (403) / new user accepts (200) then reuse fails (404, single-use holds) / VIEWER denied removing another member (403, exact docs/PERMISSIONS.md wording) / sole OWNER blocked from removing self (409, last-owner guard). Cleaned up the test member afterward. CloudWatch logs confirmed clean (no PII, matches docs/PRIVACY.md allowlist).
- `pnpm -r lint && pnpm -r test && pnpm -r build` green across the whole repo (authz: 35 tests, members: 21 tests, nothing else touched).
- Updated `docs/PERMISSIONS.md`'s `packages/authz interface` snippet to match the real signature (added `ddb`/`cabinetsTable` - the two-field sketch couldn't actually decide anything on its own).
**Remaining:**
- `avp` mode itself is unverified against a live AVP policy store - blocked on the same account-wide Verified Permissions restriction as T01/T02 (`ENABLE_AVP=false`). Once a human clears that and X redeploys SharedStack with `ENABLE_AVP` unset, flip this lane's own `/asli/<stage>/authz/mode` SSM param to `avp` (or redeploy with `AUTHZ_MODE=avp`) and re-run the same 5 live scenarios above - should produce identical results per the parity tests.
- No UI (out of scope, owned by D3).
**Gotchas / decisions:**
- `ssm.StringParameter.fromStringParameterName(...).parameterArn` silently creates a hidden `AWS::SSM::Parameter::Value<String>` CFN parameter that CloudFormation tries to resolve at deploy time - even though only `.parameterArn` is read - and fails the whole deploy if that parameter doesn't exist yet. Worked around by building the ARN manually via `stack.formatArn({ service: 'ssm', resource: 'parameter', resourceName: ... })`. See LEARNING_LOG.md - the same pattern in lane C's `c.ts` only worked because that param happens to already exist (placeholder value).
- Worked in a separate `asli-H` worktree (`lane/H` off `main`) in parallel with `lane/D3`'s in-progress uncommitted work in the main `asli` folder, per the human's request - never touched that worktree.
**Contract change requests:**
- none (packages/contracts untouched; only docs/PERMISSIONS.md's authz interface snippet was corrected to match reality)
**Learning log entries added:** yes
