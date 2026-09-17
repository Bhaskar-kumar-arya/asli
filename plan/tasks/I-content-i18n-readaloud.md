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
