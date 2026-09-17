# TESTING.md

## Levels
| Level | Tool | Who |
|---|---|---|
| Unit | Vitest | every lane |
| Contract | Zod parse of fixtures and handler outputs | every lane |
| Matching properties | fast-check | B |
| Cedar policies | cedar-wasm tests | H |
| Frontend components | Vitest + Testing Library, MSW mock API from contracts fixtures | D1–D3 |
| Integration (deployed) | Vitest `tests/e2e` against `int` using a test Cognito user | X |
| Accuracy | tools/accuracy harness | E |

## Test set (`testset/`)
```
testset/
  strips/<id>.jpg + <id>.json
  bills/<id>.jpg + <id>.json
  README.md   (collection rules, consent, redaction)
```
Label JSON: `{ "kind": "strip|bill", "truth": { productName, batchNumber, manufacturer, expMonth } | { lines: [...] }, "conditions": { "foil": true, "lighting": "good|poor", "angle": "flat|tilted", "blur": false } }`.
Target: at least 30 strips and 10 bills, varied foil, lighting and angles. Collect from Thursday.

## Accuracy metrics
- Batch exact after normalization (primary)
- Batch skeleton match
- Manufacturer STRONG similarity
- Expiry month exact
- Bill: line recall (lines found / true lines), batch exact per line
- Tier correctness on a seeded run: each test identity is checked against fixtures seeded with a matching row, so expected tier is known
- Breakdown by method (strip vision, bill vision, QR) and condition

Output: `tools/accuracy/out/<timestamp>.json`, uploaded to `asli-int-public/metrics/accuracy/latest.json` for the dashboard.

## Definition of done for any lane
- Acceptance criteria in the task file all checked
- `pnpm -r lint && pnpm -r test` pass
- Deployed to the lane's `dev-*` stage and smoke-tested
- Handoff section updated, learning log appended
