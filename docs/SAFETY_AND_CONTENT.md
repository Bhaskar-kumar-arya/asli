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
- Polly: Hindi and Indian English voices (T01 confirms voice names and neural support in ap-south-1). Static guidance text pre-rendered to MP3 at build time in `asli-<stage>-public/audio/<lang>/<key>.mp3`. Dynamic parts (product, batch) are not spoken; the audio covers title, reason and next steps.
- Kannada: if Polly has no Kannada voice, use browser `speechSynthesis` with `lang="kn-IN"` when a voice exists; otherwise hide the button.
