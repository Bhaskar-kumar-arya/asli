# PRIVACY.md

## Data we collect and why
| Data | Why | Retention |
|---|---|---|
| Email (Cognito) | Sign-in, alert emails | Until account deletion |
| Strip photos | Extraction | S3 lifecycle, 1 day |
| Bill photos | Extraction | Deleted by code immediately after extraction |
| Extracted medicine fields | Checks, cabinet | While saved in a cabinet |
| Push subscriptions | Notifications | Until unsubscribed or push service returns 404/410 |
| Problem reports (Wave 2) | Aggregate stats, PvPI routing | 12 months, never shown to others |

## Rules for code
- Bill extraction requests only medicine line fields; any patient, doctor, pharmacy or contact data returned is dropped before storage.
- Never log request bodies, image keys with user IDs, emails, labels, notes or model outputs. Use Powertools Logger with an allowlist of fields (`requestId`, `lane`, `route`, `tier`, `counts`, `durationMs`).
- Model invocation logging in Bedrock stays disabled.
- Presigned upload URLs expire in 5 minutes and are scoped to one key.
- S3: block public access, SSE-S3, TLS-only bucket policy.
- DynamoDB: encryption at rest (default).
- Users can delete a cabinet, a medicine, and their account. `DELETE /v1/me` (lane Z1) removes the caller's Cognito user, their push subscriptions, and either their cabinet membership (if they share it with an owner) or the whole cabinet (if they're its sole member) - it refuses with 409 rather than orphaning a cabinet the caller solely owns but shares with other members, asking them to transfer ownership or remove those members first.

## Demo data
- Test set photos: team members' own medicines; bills redacted before adding to `testset/`; no faces, names or addresses.
- The flagged strip in the demo is a disclosed mock matching a real CDSCO row, shown with on-screen text.
