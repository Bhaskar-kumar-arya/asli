# @asli/matching

Deterministic matching - see `docs/MATCHING.md` for the full spec. This package
is pure TypeScript: no AWS SDK, no I/O, no network. Callers fetch candidate
`FlaggedBatch` rows, an alias map, and a month count from DynamoDB and pass
them in; this package never decides anything an LLM touched (CLAUDE.md rule 1).

## Usage

```ts
import { decide } from '@asli/matching';

const result = decide(
  { batchNumber: 'GTL 1258', manufacturer: 'Gidsha Pharmaceuticals', source: 'strip_vision' },
  candidateFlaggedBatches, // fetched by the caller from DynamoDB (BATCH# and SKEL# lookups)
  { monthCount: 24, latestMonth: '2025-08' },
);

result.tier; // 'FLAGGED' | 'VERIFY' | 'NO_ALERT_FOUND'
result.matches; // AlertSummary[], SPURIOUS first
result.guidanceKey; // packages/content template key
```

### `classifyMatch` - one candidate at a time

Useful for G2's new-alert fan-out, which classifies a single newly-inserted
`FlaggedBatch` against one medicine at a time rather than running the full
`decide()` aggregation:

```ts
import { classifyMatch } from '@asli/matching';

const { tier, reasonCodes, collision } = classifyMatch(identity, flaggedBatch, ctx);
if (collision) {
  // batchNorm matched but manufacturer didn't - emit metric BatchCollisionIgnored, do nothing else.
}
```

### Normalization building blocks

```ts
import { batchSkeleton, normalizeBatch, normalizeManufacturer, parseMonth } from '@asli/matching';

normalizeBatch('B.No: RPL-1013'); // 'RPL1013'
batchSkeleton('GTL1258'); // '6T11258' - O/Q/D->0, I/L/J->1, S->5, B->8, Z->2, G->6
normalizeManufacturer('M/s. Cipla Ltd., Plot No. 9'); // 'CIPLA'
parseMonth('Aug-2025'); // '2025-08'
```

### Aliases

```ts
import { buildAliasMap } from '@asli/matching';

// Rows come from the Reference table's MFR#/ALIAS# items (docs/DATA_MODEL.md).
const aliases = buildAliasMap([{ aliasNorm: 'CIPLA INDIA', canonicalManufacturerNorm: 'CIPLA' }]);
normalizeManufacturer('Cipla India', aliases); // 'CIPLA'
```

## guidanceKey values this package returns

`result.flagged.nsq`, `result.flagged.spurious`, `result.verify.near_batch`,
`result.verify.manufacturer_unknown`, `result.verify.low_read_confidence`,
`result.verify.default` (VERIFY reasons not covered by the three specific
keys above, e.g. `EXPIRY_DIFFERS` alone), `result.no_alert_found`. These are
this package's own design decision (docs/MATCHING.md only says `guidanceKey`
is "a packages/content template key" without pinning exact values) - lane I
should create `packages/content` templates for each of these seven keys.

## What this package does not do

- Fetch candidates from DynamoDB (batch/skeleton lookups) - the caller's job.
- Decide anything from an image or free text - that's Bedrock extraction
  (docs/SCANNING.md), strictly upstream of this package.
- Emit CloudWatch metrics (`BatchCollisionIgnored`, `CheckTier`,
  `MatchesCreated`) - callers emit these using this package's output.
