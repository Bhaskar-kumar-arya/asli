# SAFETY_AND_CONTENT.md

## Wording rules (all user-facing text, all languages)
| Never | Use instead |
|---|---|
| Safe / genuine / verified / OK | No alert found for this batch |
| This medicine is unsafe / fake | This batch is on a CDSCO Not of Standard Quality list |
| <Brand> is bad | This batch of <product> |
| Stop taking | Do not stop a prescribed medicine without talking to your doctor |
| Manufacturer X made fake medicine | A batch carrying this label was found to be spurious |
| We detected | CDSCO reported (Month YYYY, <lab>) |

## Result card copy (en, source of truth)
### FLAGGED (NSQ)
Title: **This batch is on a CDSCO alert list**
Body: CDSCO reported batch {batch} of {product} as Not of Standard Quality in {alertMonth} ({reportingLab}). Reason: {reasonPlain}.
### FLAGGED (SPURIOUS)
Title: **A batch with this label was reported as spurious**
Body: CDSCO reported a batch carrying batch number {batch} and the label of {manufacturer} as spurious in {alertMonth}. The real manufacturer may not have made it.
### VERIFY
Title: **Please check this batch with your pharmacist**
Body: This looks similar to a batch on a CDSCO alert list, but some details don't fully match ({mismatchPlain}). Show this screen and the strip to your pharmacist.
### NO_ALERT_FOUND
Title: **No alert found for this batch**
Body: We checked {monthCount} CDSCO lists up to {latestMonth}. This does not certify the medicine; it means this batch is not on those lists. We'll keep checking every month if you save it.

## "What to do next" (FLAGGED and VERIFY)
1. Don't stop taking a prescribed medicine on your own. Talk to your doctor first.
2. Keep the strip, carton and bill.
3. Show this screen to your pharmacist and ask for a replacement from a different batch.
4. If you notice any side effect or problem, you can report it (PvPI link, Wave 2).
Source link: "View CDSCO source".

## Reason codes and plain-language text (packages/content/reasons)
| Code | Typical CDSCO wording contains | Plain English |
|---|---|---|
| DISSOLUTION | dissolution | The tablet may not release its medicine properly in the body. |
| ASSAY | assay, content of | The amount of active medicine was outside the allowed limit. |
| IDENTIFICATION | identification | The test could not confirm the expected medicine is present. |
| DISINTEGRATION | disintegration | The tablet did not break down in the expected time. |
| STERILITY | sterility | The sterile product failed a sterility test. |
| PARTICULATE | particulate, visible particles | Unwanted particles were found. |
| MICROBIAL | microbial, bacterial endotoxin | Microbial limits were not met. |
| RELATED_SUBSTANCES | related substances, impurities | Impurities were above the allowed limit. |
| PH | pH | The acidity or alkalinity was outside the allowed range. |
| DESCRIPTION | description, appearance | The product's appearance did not match its specification. |
| UNIFORMITY | uniformity of weight, content uniformity | Doses were not consistent from unit to unit. |
| LABELLING | label, misbranded | The labelling did not meet requirements. |
| SPURIOUS | spurious | Reported as spurious (not made by the manufacturer on the label). |
| OTHER | — | Failed one or more quality tests. See the CDSCO source for details. |

Classification: deterministic keyword rules first. Unmatched `reasonRaw` → Bedrock at ingestion only, constrained to return one code from this enum; otherwise `OTHER`. Cached in Reference `REASON#`. No generated text is shown, so Bedrock Guardrails are not needed; this decision is documented in the writeup.

## Languages
- `en` is the source. `hi` and `kn` drafted with Amazon Translate by `scripts/content/translate.ts`, then reviewed by a native speaker. Each template has `reviewedBy` and `reviewedAt`; unreviewed templates fall back to English with a note.
- Placeholders (`{batch}`) are protected during translation (replace with tokens before, restore after).

## Read-aloud
- Polly: static guidance text pre-rendered to MP3 offline (`scripts/content/audio.ts`) to `asli-<stage>-public/audio/<lang>/<key>.mp3`. Dynamic parts (product, batch) are not spoken; the audio covers title, reason and next steps. T01 found Polly in `ap-south-1` has voices only for `en-IN` - zero `hi-IN`/`kn-IN` - so today only `en` ever gets a pre-rendered MP3; hi/kn always use the `speechSynthesis` fallback below.
- The public bucket blocks all public access (`infra/lib/shared-stack.ts` `PublicBucket`), so the browser never reads the MP3 from S3 directly. Lane I serves `GET /v1/public/audio/{lang}/{keyFile}` (`services/content/src/handlers/audio.ts`), which 302-redirects to a 5-minute presigned GET URL for `audio/<lang>/<key>.mp3`. `apps/web`'s `VITE_AUDIO_BASE_URL` points at this route (its base plus `/v1/public`); a missing key still presigns but 404s on redirect, which the client already treats as "fall back to speechSynthesis".
- Kannada (and any language with no MP3, including hi/kn today): if Polly has no voice and the browser has no `speechSynthesis` voice for that language either, hide the button entirely (`canReadAloud()` in `apps/web/src/features/scan/lib/readAloud.ts`) rather than offering a control that can't do anything.
