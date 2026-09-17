# MATCHING.md — Deterministic matching (packages/matching)

Pure TypeScript, no I/O, no AWS SDK, 100% of branches unit tested. Other lanes pass in candidate alert records fetched from DynamoDB.

## Functions
```ts
normalizeBatch(raw: string): string
batchSkeleton(norm: string): string
normalizeManufacturer(raw: string, aliases?: AliasMap): string
manufacturerSimilarity(a: string, b: string): number // 0..1
parseMonth(raw: string): string | null // "YYYY-MM"
classifyMatch(identity: MedicineIdentity, candidate: FlaggedBatch, ctx: MatchContext): CandidateMatch
decide(identity: MedicineIdentity, candidates: FlaggedBatch[], ctx: MatchContext): CheckItemResult
```

## normalizeBatch
1. Unicode NFKC, uppercase.
2. Remove leading labels: `B.NO`, `BATCH NO`, `BATCH`, `B NO`, `LOT`, `LOT NO`, followed by `:` `.` `-` or space.
3. Remove all whitespace and the characters `- / . _ : #`.
4. Keep `A–Z` and `0–9` only.
Examples: `GTL 1258` → `GTL1258`; `B.No: RPL-1013` → `RPL1013`; `00 57` → `0057`.

## batchSkeleton
Collapse characters commonly confused on foil and in OCR:
`O,Q,D → 0`, `I,L,J → 1`, `S → 5`, `B → 8`, `Z → 2`, `G → 6`, `T → 7` is NOT applied (too lossy).
Example: `GTLI258` → `6T11258` and `GTL1258` → `6T11258`, so they are near matches. Mapping is applied per character; `T` is unchanged.

## normalizeManufacturer
1. Uppercase, NFKC, replace `&` with `AND`.
2. Remove punctuation, collapse spaces.
3. Remove prefixes `M/S`, `MS`.
4. Remove address after the first comma or ` AT ` or ` PLOT ` or a 6-digit PIN.
5. Remove stopword tokens: `PVT PRIVATE LTD LIMITED LLP INC CO COMPANY INDIA PHARMA PHARMACEUTICAL PHARMACEUTICALS PHARMACEUTICS LABS LAB LABORATORIES LABORATORY HEALTHCARE LIFESCIENCES LIFE SCIENCES REMEDIES DRUGS AND THE UNIT`.
6. If the result is in the alias map, return the canonical value.
Example: `M/s. Cipla Ltd., Plot No. 9` → `CIPLA`.

## manufacturerSimilarity
Token-set Jaccard on normalized tokens; plus 1.0 if one normalized string equals the other or contains the other as whole tokens (≥ 1 token of length ≥ 4). Thresholds: STRONG ≥ 0.6, WEAK 0.3–0.6, MISMATCH < 0.3.

## Tiers (per candidate), then overall result
| Condition | Candidate tier | reasonCodes |
|---|---|---|
| batchNorm equal AND manufacturer STRONG AND expiry not contradictory | FLAGGED | `BATCH_EXACT`,`MFR_STRONG` |
| batchNorm equal AND manufacturer STRONG AND expiry both known and differ | VERIFY | `BATCH_EXACT`,`MFR_STRONG`,`EXPIRY_DIFFERS` |
| batchNorm equal AND manufacturer WEAK or unknown on the user side | VERIFY | `BATCH_EXACT`,`MFR_WEAK` or `MFR_UNKNOWN` |
| batchNorm equal AND manufacturer unknown, but brand→manufacturer candidate (from bill) is STRONG | VERIFY (never FLAGGED) | `BATCH_EXACT`,`MFR_FROM_BRAND_MAP` |
| batchNorm equal AND manufacturer MISMATCH | none (collision, ignore; count metric `BatchCollisionIgnored`) | — |
| skeleton equal (batchNorm differs) AND manufacturer STRONG | VERIFY | `BATCH_NEAR`,`MFR_STRONG` |
| skeleton equal AND manufacturer not STRONG | none | — |
| anything else | none | — |

"Expiry contradictory" = both `expMonth` values known and not equal. Missing expiry is never contradictory.

Overall result for an identity: the highest tier among candidates (FLAGGED > VERIFY), with all matched candidates listed, SPURIOUS listed first. If no candidate tiers → `NO_ALERT_FOUND`. Include `checkedAgainst` = { months: count, latestMonth } so the UI can say "Checked against N CDSCO lists up to Month YYYY".

## Inputs with low extraction confidence
If `identity.fieldConfidence.batchNumber < 0.7`, the result is capped at VERIFY and adds `LOW_READ_CONFIDENCE`. The UI then asks the user to confirm the batch number.

## Required test cases (fixtures: packages/contracts/fixtures/flagged-batches.json)
Rows taken from real CDSCO alerts. Tests must also cover every table row above.
| # | User identity | Candidate | Expected |
|---|---|---|---|
| 1 | batch `GTL1258`, mfr `Gidsha Pharmaceuticals` | GTL1258, M/s Gidsha Pharmaceuticals Pvt. Ltd. | FLAGGED |
| 2 | batch `GTL 1258`, mfr `Gidsha Pharma` | same | FLAGGED |
| 3 | batch `GTLI258`, mfr `Gidsha` | same | VERIFY `BATCH_NEAR` |
| 4 | batch `GTL1258`, mfr `Cipla Ltd` | same | NO_ALERT_FOUND (collision) |
| 5 | batch `GTL1258`, mfr missing | same | VERIFY `MFR_UNKNOWN` |
| 6 | batch `GTL1258`, mfr `Gidsha`, exp `2027-01`; candidate exp `2026-10` | same | VERIFY `EXPIRY_DIFFERS` |
| 7 | batch `ZZZ999`, mfr `Anyone` | none | NO_ALERT_FOUND |
| 8 | batch read confidence 0.5, exact strong | same | VERIFY `LOW_READ_CONFIDENCE` |
| 9 | Two candidates, one NSQ one SPURIOUS, both FLAGGED | — | FLAGGED, SPURIOUS listed first |
| 10 | batch typed `OO57`, mfr strong match | candidate batch `00 57`, same manufacturer | VERIFY `BATCH_NEAR` |

T02 replaces fixture manufacturer and product names with exact rows from the verified PDFs where available. Row 1 is illustrative: confirm spellings against the source before relying on it in the demo.

## Property tests
- normalizeBatch is idempotent.
- decide never returns FLAGGED when `identity.manufacturer` is empty.
- decide output tier never depends on candidate order.
