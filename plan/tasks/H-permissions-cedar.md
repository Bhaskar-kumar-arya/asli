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
