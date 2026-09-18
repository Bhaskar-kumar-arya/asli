# I — Content package, translations, reason codes, read-aloud
**Priority:** P1 · **Wave 1** · **Sessions:** 1 · **Depends on:** T02, T01 (Polly voices)

## Read first
CLAUDE.md, docs/SAFETY_AND_CONTENT.md (all), docs/UX.md (Principles)

## Goal
Every word a user sees or hears about a result is reviewed, consistent and available in English, Hindi and Kannada.

## Owns
`packages/content/**`, `scripts/content/**`, `services/content/**`, `infra/lib/lanes/i-content.ts`

## Deliverables
1. Day-one: `packages/content` with English templates (result cards, what to do next, notification titles/bodies, email HTML/text, UI strings used by D1–D3) and the reason code keyword rules, committed early.
2. Template format: `{ key, lang, title, body, steps[], placeholders[], reviewedBy, reviewedAt }`; runtime `render(key, lang, vars)`, falls back to `en` when unreviewed.
3. `scripts/content/translate.ts`: Amazon Translate drafts for `hi` and `kn` with placeholder protection; writes drafts marked unreviewed.
4. Review workflow: `scripts/content/review.md` checklist for the native speaker; the human marks reviewed.
5. `scripts/content/audio.ts`: Polly neural/standard voices for `en-IN` and `hi-IN` render static templates to `public/audio/<lang>/<key>.mp3`; skip `kn` if no voice.
6. Banned-words test across all languages (English list plus Hindi/Kannada equivalents supplied by reviewer).
7. `GET /v1/content/guidance/{key}` (public).

## Acceptance criteria
- [ ] All English keys used by D2/D3/G1 exist
- [ ] Hindi and Kannada drafts generated; review status visible
- [ ] Audio files playable on Android for en and hi
- [ ] Banned-words test passes

## Out of scope
UI components.

---
## Handoff (the session updates this before stopping)
**Status:** DONE (content package + API shipped; hi/kn translation review and live Polly/S3 upload still blocked on AWS account issues - see Gotchas)
**Stage deployed:** none yet - `infra/lib/lanes/i-content.ts` is written and typechecks (`pnpm --filter infra build`) but not deployed to any stage this session (no `STAGE` set, and stage deploys are a separate human step per CLAUDE.md).
**Done:**
- `packages/content`: `render(key, lang, vars)` + `getTemplate`/`toGuidanceTemplate`, reviewed English source-of-truth templates for all 7 `guidanceKey` values `@asli/matching` returns (`result.flagged.nsq`, `result.flagged.spurious`, `result.verify.{near_batch,manufacturer_unknown,low_read_confidence,default}`, `result.no_alert_found` - see packages/matching/README.md), plus `notification.flagged`/`notification.verify` (docs/ALERTS.md wording), `REASON_PLAIN_TEXT_EN` for all 14 reason codes, and result-card UI strings (`Read aloud`, `Save to family medicines`, etc.) not owned by D1's shell i18n.
- Hindi and Kannada drafts for every key above (hand-drafted from the reviewed English, see Gotchas) - unreviewed (`reviewedBy`/`reviewedAt` unset), `render()` falls back to English for them, review status is inspectable via `getTemplate(...).reviewedBy`.
- `packages/content/src/banned-words.ts`: `findBannedWording`/`assertNoBannedWording` per language (en/hi/kn), with a deliverable-6 test in `src/index.test.ts` running every template/reason-text/UI-string in every language through it (22 tests, all passing).
- `scripts/content/translate.ts` (Amazon Translate drafts with placeholder protection, writes `packages/content/drafts/<lang>.json`, emits `TranslateCharacters`) and `scripts/content/audio.ts` (Polly synth + S3 upload to `audio/<lang>/<key>.mp3`, per-language `DescribeVoices` check with skip-not-fail, emits `PollyCharacters`) - both typecheck, neither has been run for real (see Gotchas).
- `scripts/content/review.md`: native-speaker checklist + sign-off procedure.
- `GET /v1/content/guidance/{guidanceKey}?lang=` - `services/content` (public Lambda, 400 on bad `lang`, 404 on unknown key, falls back to English per docs) with 5 handler tests; `infra/lib/lanes/i-content.ts` wires the route.
- `pnpm -r lint && pnpm -r test` pass repo-wide except one pre-existing, unrelated flake in `services/ingestion/src/pdf/download.test.ts` (`Body is unusable: Body has already been read`) that predates this session and isn't in lane I's owned paths.
**Remaining:**
- Native-speaker review of every hi/kn string per `scripts/content/review.md`, then set `reviewedBy`/`reviewedAt`.
- Run `pnpm content:translate` and `pnpm content:audio` for real once Translate/Polly access clears (or against an account that already has it), and deploy `LaneIStack` to a stage.
- D2 (`apps/web/src/features/scan/lib/content.ts`) and G1 (`services/notify/src/templates/*`) both currently ship their own hardcoded English stand-ins with comments saying to swap to this package/endpoint - that swap is those lanes' work, not done here (out of lane I's owned paths).
**Gotchas / decisions:**
- Amazon Translate returns `SubscriptionRequiredException` on this AWS account (plan/tasks/T01-spikes.md spike 7) - `translate.ts` is written for when that clears but couldn't produce real drafts this session, so hi/kn text in `packages/content/src` is hand-drafted directly from the reviewed English and explicitly marked unreviewed.
- Polly has **zero** voices for `hi-IN` and `kn-IN` in `ap-south-1` (same T01 spike) - contradicts docs/SAFETY_AND_CONTENT.md's assumption that Hindi uses pre-rendered Polly MP3s. `audio.ts` only ever produces `en` audio on this account; D2's `readAloud.ts` already falls back to browser `speechSynthesis` for any language whose MP3 is missing, so this doesn't block read-aloud, just makes hi/kn read-aloud client-synthesized instead of Polly-recorded. Logged in submission/LEARNING_LOG.md.
- `GuidanceTemplateSchema` (packages/contracts, frozen) has `whatToDoNext`, not `steps`/`placeholders` - the wire response drops the internal `placeholders` field (client interpolates `{tokens}` itself using its own `CheckItemResult`/`AlertEvent` data; the endpoint returns the raw, uninterpolated template).
- VERIFY's four guidance keys share one body template with the mismatch phrase baked in per key (not a `{mismatchPlain}` placeholder) - matches `@asli/matching`'s and D2's stand-in's existing design.
**Contract change requests:**
- none
**Learning log entries added:** yes
