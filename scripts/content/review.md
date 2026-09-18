# Content review checklist (Hindi / Kannada)

For the native-speaker reviewer. English (`packages/content/src/templates/*.ts`,
`reasons.ts`, `ui-strings.ts`, `REASON_PLAIN_TEXT_EN`) is the reviewed source of truth -
see docs/SAFETY_AND_CONTENT.md. Everything in `hi`/`kn` today is a **hand-drafted,
unreviewed** placeholder (Amazon Translate is blocked on this AWS account - see
plan/tasks/T01-spikes.md spike 7 - so `scripts/content/translate.ts` hasn't produced real
drafts yet). `render()` falls back to English for anything without a reviewed sign-off, so
the app is safe to ship before this review happens; this checklist is what unlocks Hindi
and Kannada guidance text.

## What "reviewed" means here
A template is reviewed once a native speaker has read it against the English original and
confirmed it, and only then does someone set `reviewedBy` (the reviewer's name) and
`reviewedAt` (ISO datetime) on that template object in the source file. Until both fields
are set, `render()` and `GET /v1/content/guidance/{key}` keep serving the English text for
that language.

## Per-string checklist
For every `hi`/`kn` entry in:
- `packages/content/src/templates/guidance.ts` (title, body, steps)
- `packages/content/src/templates/notifications.ts` (title, body)
- `packages/content/src/reasons.ts` (`REASON_PLAIN_TEXT_HI`, `REASON_PLAIN_TEXT_KN`)
- `packages/content/src/ui-strings.ts` (`UI_STRINGS.hi`, `UI_STRINGS.kn`)

check:
1. **Meaning matches the English original** - no dropped clauses, no added claims.
2. **No banned wording** (docs/SAFETY_AND_CONTENT.md table) - "safe", "genuine", "verified",
   "fake" as a synonym for spurious, unqualified "stop taking", "we detected". If the
   reviewer finds a Hindi/Kannada word or phrase this project's `findBannedWording()`
   (`packages/content/src/banned-words.ts`) doesn't catch, add it to that file's pattern
   list for that language - the banned-words test (`packages/content/src/index.test.ts`)
   runs it against every template automatically.
3. **"Batch, never brand"** wording preserved - "this batch", never a bare product/brand
   name implying the whole product is unsafe.
4. **Spurious nuance preserved** - "a batch carrying this label was found to be spurious /
   the real manufacturer may not have made it", never "the manufacturer made fake medicine".
5. **`{placeholder}` tokens untouched** - exact same token names as the English original
   (`{batch}`, `{product}`, `{alertMonth}`, `{reportingLab}`, `{reasonPlain}`,
   `{manufacturer}`, `{monthCount}`, `{latestMonth}`, `{label}`), same count, nothing
   translated or reordered in a way that breaks `render()`'s `{name}` regex.
6. **Reads naturally to an elderly, non-technical reader** (docs/UX.md "Elderly-first
   design") - plain words, no jargon, short sentences.
7. **Tone matches the tier** - FLAGGED/SPURIOUS is direct but not alarmist; VERIFY is
   calm and asks for a pharmacist check; NO_ALERT_FOUND is neutral, not reassuring
   ("no alert found", never a Hindi/Kannada equivalent of "safe").

## Sign-off
1. Fix any issue found above directly in the source file.
2. Set `reviewedBy: '<reviewer name>'` and `reviewedAt: '<ISO datetime>'` on that template
   object.
3. Run `pnpm --filter @asli/content test` - the banned-words and coverage tests must still
   pass.
4. Note the review in `submission/LEARNING_LOG.md` (reviewer name, date, language, what
   changed) per CLAUDE.md.

## If `scripts/content/translate.ts` becomes unblocked later
Run `pnpm content:translate --stage dev-shared`, which writes
`packages/content/drafts/hi.json` and `drafts/kn.json` (not loaded at runtime). Diff those
against the hand-drafted `hi`/`kn` text already in `packages/content/src` - if Translate's
draft is meaningfully different, re-run this checklist against the Translate version before
adopting it; don't skip straight to `reviewedBy` just because it came from Translate.
