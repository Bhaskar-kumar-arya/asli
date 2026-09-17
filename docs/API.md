# API.md — HTTP API contract

API Gateway HTTP API, base path `/v1`. JSON only. Auth: Cognito JWT (`Authorization: Bearer <idToken>`) unless marked **public**. Request and response bodies are Zod schemas exported from `packages/contracts` (names in brackets). T02 generates `packages/contracts/openapi.yaml` from them.

Errors: `{ error: { code: string, message: string, requestId: string } }` [`ApiError`]. Codes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `EXTRACTION_FAILED`, `INTERNAL`.

## Core types
```ts
MedicineIdentity {
  productName?: string; brandName?: string;
  batchNumber: string; manufacturer?: string;
  mfgMonth?: string; expMonth?: string;       // "YYYY-MM"
  strength?: string; dosageForm?: string;
  mrp?: string; quantity?: number;
  source: "strip_vision" | "bill_vision" | "qr" | "manual" | "pharmacy_csv";
  fieldConfidence?: Partial<Record<"batchNumber"|"manufacturer"|"productName"|"expMonth", number>>;
}
AlertSummary {
  alertRef: string; alertMonth: string; category: "NSQ" | "SPURIOUS";
  productName: string; batchRaw: string; manufacturerRaw: string;
  mfgMonth?: string; expMonth?: string;
  reasonCode: ReasonCode; reasonRaw: string;
  reportingSource: string; reportingLab?: string;
  sourceUrl: string; demo: boolean;
}
CheckItemResult {
  identity: MedicineIdentity;
  tier: "FLAGGED" | "VERIFY" | "NO_ALERT_FOUND";
  reasonCodes: MatchReasonCode[];
  matches: AlertSummary[];
  checkedAgainst: { monthCount: number; latestMonth: string };
  guidanceKey: string;          // packages/content template key
}
```

## Endpoints
| Method | Path | Auth | Request | Response | Lane |
|---|---|---|---|---|---|
| POST | /v1/uploads | JWT | `CreateUploadRequest {kind: strip|bill|pharmacy, contentType}` | `CreateUploadResponse {uploadId, url, fields?, expiresAt}` | C |
| POST | /v1/scans | JWT | `ScanRequest {uploadId, kind: strip|bill, qrText?}` | `ScanResponse {scanId, method, items: ExtractedItem[], results: CheckItemResult[], warnings[]}` | C (X wires matching) |
| POST | /v1/checks | JWT | `CheckRequest {items: MedicineIdentity[] (1..50)}` | `CheckResponse {results: CheckItemResult[]}` | C |
| GET | /v1/alerts/{alertRef} | JWT | — | `AlertDetail` (AlertSummary + snapshotKey + ingestedAt) | C |
| GET | /v1/cabinets | JWT | — | `CabinetList` | F |
| POST | /v1/cabinets | JWT | `CreateCabinetRequest {name}` | `Cabinet` | F |
| GET | /v1/cabinets/{cabinetId} | JWT (View) | — | `CabinetDetail {cabinet, members, medicines: MedicineWithStatus[], matches}` | F |
| POST | /v1/cabinets/{cabinetId}/medicines | JWT (EditMedicine) | `AddMedicineRequest {identity, label?, forPerson?}` | `MedicineWithStatus` (status PENDING until retroactive check completes) | F |
| DELETE | /v1/cabinets/{cabinetId}/medicines/{medId} | JWT (RemoveMedicine) | — | 204 | F |
| POST | /v1/cabinets/{cabinetId}/invites | JWT (ManageMembers) | `CreateInviteRequest {role}` | `Invite {code, role, expiresAt}` | H |
| POST | /v1/invites/{code}/accept | JWT | — | `Cabinet` | H |
| PATCH | /v1/cabinets/{cabinetId}/members/{userId} | JWT (ManageMembers, or self for alertsEnabled) | `UpdateMemberRequest {role?, alertsEnabled?}` | `Member` | H |
| DELETE | /v1/cabinets/{cabinetId}/members/{userId} | JWT (ManageMembers or self) | — | 204 | H |
| POST | /v1/push/subscriptions | JWT | `PushSubscriptionRequest {endpoint, keys, userAgent}` | 201 | G1 |
| DELETE | /v1/push/subscriptions | JWT | `{endpoint}` | 204 | G1 |
| GET | /v1/push/vapid-public-key | **public** | — | `{publicKey}` | G1 |
| POST | /v1/push/test | JWT | — | 202 (sends a test push to the caller) | G1 |
| GET | /v1/content/guidance/{guidanceKey}?lang=en|hi|kn | **public** | — | `GuidanceTemplate` | I |
| POST | /v1/reports | JWT | `ProblemReportRequest {identity, alertRef?, problemType, note?}` | `ProblemReportResponse {pvpi: {howToReport, links[]}}` | L |
| GET | /v1/public/stats | **public** | — | `PublicStats` | S |
| GET | /v1/public/insights | **public** | — | `InsightsResponse` | M |
| GET | /v1/public/metrics | **public** | — | `MetricsSummary {accuracy, cost}` | J |
| POST | /v1/pharmacy/checks | JWT | `PharmacyCheckRequest {uploadId} | {csv: string}` | `PharmacyCheckResponse {rows: (CheckItemResult & {quantity?})[], flaggedUnits}` | N |
| POST | /v1/admin/demo/replay-month | JWT, Cognito group `admin`, stage `int` only | `DemoReplayRequest {fixtureKey}` | `{executionArn}` | A2 |

## Rules
- `POST /v1/scans` never returns the image or raw model output. `warnings` include `LOW_READ_CONFIDENCE`, `NO_BATCH_ON_LINE`, `NOT_A_MEDICINE`.
- Rate limits (per user, API Gateway + app check): scans 30/hour, checks 120/hour, pharmacy 10/hour.
- All list endpoints return at most 100 items; pagination via `nextToken`.
- CORS: Amplify domain and `http://localhost:5173` only.
- Permissions in brackets are Cedar actions checked through `packages/authz` (see PERMISSIONS.md). Until lane H merges, F uses the `authz` stub that allows members by role in code with the same interface.
