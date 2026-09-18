# PERMISSIONS.md — Caregiver sharing with Amazon Verified Permissions (Cedar)

## Roles
| Role | View cabinet | Add medicine | Remove medicine | Manage members | Receive alerts |
|---|---|---|---|---|---|
| OWNER | ✓ | ✓ | ✓ | ✓ | ✓ |
| EDITOR | ✓ | ✓ | ✓ | — | ✓ |
| VIEWER | ✓ | — | — | — | ✓ |
Any member can leave a cabinet and toggle their own alerts. A cabinet must always keep at least one OWNER (enforced in code, not policy).

## Cedar schema (packages/authz/schema.cedarschema)
```cedar
namespace Asli {
  entity User;
  entity MemberGroup;
  entity Cabinet {
    owners: MemberGroup,
    editors: MemberGroup,
    viewers: MemberGroup
  };
  action ViewCabinet, AddMedicine, RemoveMedicine, ManageMembers, ReceiveAlerts
    appliesTo { principal: User, resource: Cabinet };
}
```
Entities are passed per request (no entity store): the Lambda loads the cabinet's members from DynamoDB and builds `User::"<id>"` with parent `MemberGroup::"<cabinetId>#<role>"`.

## Policies (packages/authz/policies/*.cedar)
```cedar
// view.cedar
permit (principal, action in [Asli::Action::"ViewCabinet", Asli::Action::"ReceiveAlerts"], resource)
when { principal in resource.owners || principal in resource.editors || principal in resource.viewers };

// edit.cedar
permit (principal, action in [Asli::Action::"AddMedicine", Asli::Action::"RemoveMedicine"], resource)
when { principal in resource.owners || principal in resource.editors };

// manage.cedar
permit (principal, action == Asli::Action::"ManageMembers", resource)
when { principal in resource.owners };
```

## packages/authz interface (stable, used by F, G1, H, N)
```ts
type CabinetAction = "ViewCabinet"|"AddMedicine"|"RemoveMedicine"|"ManageMembers"|"ReceiveAlerts";
interface Authz { isAllowed(userId: string, action: CabinetAction, cabinetId: string): Promise<boolean>; }
export function createAuthz(opts: {
  mode: "stub" | "avp";
  ddb: DynamoDBDocumentClient;
  cabinetsTable: string;
  policyStoreId?: string;   // required when mode: "avp"
  avpClient?: VerifiedPermissionsClient; // required when mode: "avp"
  now?: () => number;
}): Authz;
```
`createAuthz` needs a DynamoDB client and the Cabinets table name to look the caller's role up itself (matching `@asli/lookup`'s `createLookup(deps)` DI convention) - the original two-field sketch above couldn't actually decide anything on its own.
- `stub`: role table above in code. Used by lanes until H merges.
- `avp`: `IsAuthorized` against the policy store (ID from SSM `/asli/<stage>/avp/policyStoreId`), with entities built from DynamoDB - each cabinet has exactly one `MemberGroup` entity per role (`"<cabinetId>#OWNER"` etc), a `User`'s only parent is the group matching their own role, and `Cabinet.owners/editors/viewers` point at those same three fixed group ids. Cache decisions for 30 s per Lambda instance.
- Deny by default on any error.

## Tests
- Cedar policy tests with the Cedar CLI or the `@cedar-policy/cedar-wasm` package against a table of (role, action, expected).
- The stub and AVP modes must return identical results for the same table.

## Demo moment
Two siblings share Mom's cabinet. A retroactive match alerts both. The VIEWER sibling tries to remove the medicine and sees "Only owners and editors can remove medicines".
