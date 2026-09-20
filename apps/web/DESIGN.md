---
name: Asli
description: The drug-testing laboratory's bench register, rendered as a family's medicine app.
colors:
  stock: '#ecebe1'
  carbon: '#16150f'
  ledger-rule: '#a3b3ac'
  oxide: '#b0342a'
  methyl-violet: '#5b3e8e'
  iron: '#12130f'
typography:
  display:
    fontFamily: "'Archivo', 'Noto Sans Devanagari', 'Noto Sans Kannada', system-ui, sans-serif"
    fontSize: 'clamp(2.1rem, 11vw, 2.9rem)'
    fontWeight: 800
    lineHeight: '0.94'
    letterSpacing: '0.02em'
    fontVariation: "'wdth' 118"
  headline:
    fontFamily: "'Archivo', system-ui, sans-serif"
    fontSize: 'clamp(1.5rem, 7vw, 1.62rem)'
    fontWeight: 800
    lineHeight: '1.08'
    letterSpacing: '0.055em'
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "'Anonymous Pro', ui-monospace, monospace"
    fontSize: 'clamp(2rem, 13vw, 2.3rem)'
    fontWeight: 700
    lineHeight: '1.02'
    letterSpacing: '-0.025em'
  body:
    fontFamily: "'Archivo', 'Noto Sans Devanagari', 'Noto Sans Kannada', system-ui, sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: '1.55'
  record:
    fontFamily: "'Anonymous Pro', ui-monospace, monospace"
    fontSize: '0.95rem'
    fontWeight: 400
  label:
    fontFamily: "'Archivo', system-ui, sans-serif"
    fontSize: '0.82rem'
    fontWeight: 600
    letterSpacing: '0.16em'
    fontVariation: "'wdth' 88"
rounded:
  none: '0'
spacing:
  line: '56px'
  tap: '48px'
  margin: '46px'
  sheet: '480px'
components:
  button-primary:
    backgroundColor: '{colors.carbon}'
    textColor: '{colors.stock}'
    borderColor: '{colors.carbon}'
    borderRadius: '{rounded.none}'
  button-secondary:
    backgroundColor: '{colors.stock}'
    textColor: '{colors.carbon}'
    borderColor: '{colors.carbon}'
    borderRadius: '{rounded.none}'
  button-danger:
    backgroundColor: '{colors.stock}'
    textColor: '{colors.oxide}'
    borderColor: '{colors.oxide}'
    borderRadius: '{rounded.none}'
  stamp-flagged:
    textColor: '{colors.oxide}'
    borderColor: '{colors.oxide}'
    borderRadius: '{rounded.none}'
  stamp-verify:
    textColor: '{colors.methyl-violet}'
    borderColor: '{colors.methyl-violet}'
    borderRadius: '{rounded.none}'
---

# Design System: Asli

## Overview

**Creative North Star: "The Analyst's Record"**

Asli is not a health app that happens to cite a government list. It is the bench register a
government drug-testing laboratory actually writes in, handed to a family. Every screen is a ruled
sheet with an oxide-red double margin rule running its full height; every medicine is a numbered
entry on a rule; every verdict is a rubber stamp struck across that rule. The product's whole truth
is *a lab tested this batch and recorded a finding*, and this system shows that finding in the
grammar the finding was actually made in.

The density is generous rather than tight — a register earns its authority from ruling and
whitespace, not from packing. Nothing floats, nothing glows, nothing is rounded. Depth does not
exist: there are no shadows in the content layer at all, only rules of varying weight. The one
exception is the sheet itself, which at desk widths casts a single soft shadow because a page lying
on a bench is a physical object.

The system was chosen over the category default deliberately. It refuses the health-app card stack,
the rounded status pill, the friendly illustration, and above all the green tick — because a
register has no vocabulary for "safe". It can only say what is on record and what is not. That
constraint is the product's hardest safety rule (`CLAUDE.md` rule 2), and here it is enforced by the
medium rather than by anyone remembering it.

**Key Characteristics:**
- Ruled, never carded. Structure comes from horizontal rules and a vertical margin, not containers.
- Zero radius anywhere. Zero content-layer shadow.
- Two Latin faces with jobs: Archivo prints the form, Anonymous Pro records the values.
- Six inks, locked. Every other value is one of them at a stated proportion.
- Verdicts are struck, absences are printed. There is no stamp for "nothing found".

## Colors

A laboratory register: a faintly green-grey paper stock, ruled in ledger blue-green, written in
carbon, marked in the two inks Indian officialdom actually stamps with — oxide red and methyl
violet.

### Primary
- **Oxide Red** (`#b0342a`): The margin rule down every sheet, the entry numbers, the caret, link
  underlines, and the FLAGGED stamp. It is the only red in the system and it is never decorative.

### Secondary
- **Methyl Violet** (`#5b3e8e`): The VERIFY stamp and referred entries only. Chosen because a violet
  stamp pad is what a real Indian office marks a referral with, and because it is unmistakably not a
  warning red and unmistakably not a reassuring green.

### Neutral
- **Register Stock** (`#ecebe1`): The sheet. A warm grey-green paper, deliberately not cream — cream
  plus a serif is the single most common machine-made "editorial" default and this system refuses it.
- **Carbon** (`#16150f`): All body ink, headings, primary button fills, and the heavy rules.
- **Ledger Rule** (`#a3b3ac`): The horizontal ruling between entries. Structural, never text.
- **Iron** (`#12130f`): The substrate the enamel of the page sits on — the dark-mode ground, and the
  scrim behind a docket.

### Named Rules

**The Six Ink Rule.** There are six inks. Every other colour in the system is one of them at a
stated proportion via `color-mix`, never a value picked by eye. A new hex in this codebase is a bug.

**The Reserved Accent Rule.** Oxide red is the margin rule and the stamp. It is never a highlight, a
hover fill, a decorative underline, or a background. When a red thing appears on screen, it means
the register has an entry.

**The No Green Rule.** There is no green in this system and there will not be one. Green reads as
approval, and Asli is never permitted to approve a medicine.

**The Chroma Lift Rule.** Dark-mode stamps are lifted in `oklch` toward white, not toward the stock.
Mixing a saturated ink into a warm cream greys it out; the current ratios (oxide 76%, violet 68%)
are the most saturated that still hold 4.5:1 on iron.

## Typography

**Display Font:** Archivo (variable, `wdth 75–125`, `wght 400–800`), with Noto Sans Devanagari and
Noto Sans Kannada in the same stack.
**Body Font:** Archivo.
**Label/Mono Font:** Anonymous Pro.

**Character:** Archivo was drawn for printed forms and documents, which is exactly this register's
job; its width axis lets the same family set a monumental masthead at `wdth 118` and a tight tracked
legend at `wdth 88` without a second family. Anonymous Pro carries typewriter DNA and is used only
where a value was *recorded* — batch numbers, sample references, dates, counts. The two faces
encode the document's own distinction between what was printed on the form and what was typed into
it.

### Hierarchy
- **Display** (800, `clamp(2.1rem, 11vw, 2.9rem)`, 0.94, `wdth 118`, uppercase): The masthead. One
  per sheet, at the register's front.
- **Headline** (800, `clamp(1.5rem, 7vw, 1.62rem)`, 1.08, `wdth 112`, uppercase): Sub-sheet page
  heads and the verdict title.
- **Batch** (Anonymous Pro 700, `clamp(2rem, 13vw, 2.3rem)`, 1.02, `-0.025em`): The batch number on
  a result sheet. It is the largest ink on the page — larger than the verdict word itself.
- **Body** (400, 1rem/1.55, max 68ch): Prose, guidance, explanations. Sentence case, ordinary voice.
- **Record** (Anonymous Pro 400, 0.95rem): Any value read off a pack or returned by the register.
- **Label** (600, 0.82rem, `0.16em`, `wdth 88`, uppercase): Printed legends above fields and
  particulars keys.

### Named Rules

**The Printed / Recorded Rule.** If the form printed it, it is Archivo. If someone or something
wrote it into the form, it is Anonymous Pro. Never mix the two within one role.

**The Indic Stack Rule.** `Noto Sans Devanagari` and `Noto Sans Kannada` stay in the print stack
permanently, and Indic bands carry their own `lang` attribute. The masthead stacks scripts in
hairline-ruled bands the way an Indian station nameboard does.

**The 18px Floor.** Base text is 18px and scales to 22/26px via `data-text-size`. No tier-bearing
word may sit below `--step-small` (0.95rem). A verdict a 70-year-old cannot read is not a verdict.

## Layout

A single centred sheet with an asymmetric gutter: the left inset is the margin (`--margin-w`, 46px
on a phone) where entry numbers and the double oxide rule live; the right is ordinary padding. The
sheet is 480px on a phone, 600px from 40rem, and 760px from 64rem — at desk widths it becomes a
genuinely wider page rather than the phone layout in a gutter.

Vertical rhythm is the ruled line: `--line` is 56px and scales to 64/72px with text size. Entries
stack their designation, particulars and verdict on a phone, and become a two-column grid
(`1fr minmax(11rem, 13rem)`) from 30rem so the verdict column reads as a ruled column rather than a
ragged right margin. Spacing is generous above a heading and tight below it.

## Elevation & Depth

**This system has no elevation.** There are no shadows in the content layer, no z-layering, no
glass, no blur. Depth is conveyed entirely by rule weight: a hairline (1px `--rule`) separates
entries, a 1px `--text` rule opens a section, a 2px rule closes a primary action, and a `3px double`
rule marks the masthead and the head of a docket.

The single exception is the sheet itself at ≥40rem, which trades its 1px side borders for one soft
shadow — a page lying on a bench. Elevation is declared once: a surface has a border or a shadow,
never both.

### Shadow Vocabulary
- **Bench** (`box-shadow: 0 2px 28px color-mix(in srgb, var(--ink-iron) 16%, transparent)`): The
  sheet at desk widths only. Nothing else in the system may use it.

### Named Rules

**The Flat Record Rule.** Nothing in the content layer casts a shadow. If a thing needs to feel
separate, rule it.

## Shapes

Zero radius, everywhere, with no exceptions — buttons, fields, stamps, dockets and tabs are all
hard rectangles, because printed matter has corners. Borders carry meaning by weight rather than
colour: 1px is structural ruling, 2px is a closed boundary or a struck control, `3px double` is a
masthead.

The one non-rectangular gesture in the system is the stamp's **-4.5° rotation**, which is the only
rotated element anywhere and is therefore unmistakable.

## Components

### Buttons
- **Shape:** Hard rectangle, `0` radius, 1px border, `min-height: 48px`.
- **Primary:** Carbon fill, stock text. Exactly one per screen (`docs/UX.md`). Hovers to oxide.
- **Hover / Focus:** Secondary inverts to a carbon fill in 90ms; focus is a 2px oxide outline at 2px
  offset. Active nudges 1px down — a key being pressed, not a thing lifting.
- **Secondary:** Stock ground, carbon text and border. The default for anything that is not the one
  primary action.
- **Danger:** Stock ground, oxide text and border; inverts to an oxide fill on hover.
- **Label:** Always uppercase, `0.055em` tracked, `wdth 96`, 700.

### Cards / Containers
There are no cards. The container is `.reg-block`: a top rule and vertical padding, no background,
no border on three sides, no radius, no shadow. Nested blocks are just nested rules.

### Inputs / Fields
- **Style:** No box. A printed uppercase legend sits above a baseline rule; the value is typed on the
  rule in Anonymous Pro at `--step-lead`. Border is `2px solid var(--rule-strong)` on the bottom edge
  only, which is the one place a heavier bottom border is correct in this system.
- **Focus:** The rule turns oxide. No glow, no ring, no fill.
- **Low confidence:** The rule becomes dashed violet over a `--verify-wash` ground, and a violet note
  prints beneath — three signals, never colour alone.
- **Error:** The rule turns oxide and an oxide note prints beneath with `role="alert"`.

### Navigation
The register's thumb-index tabs, fixed to the foot inside the sheet's width, separated by a
`3px double` top rule. Always labelled in tracked uppercase beside a drawn icon — never icon-only.
The active tab inverts to a carbon fill.

### Signature Component: The Stamp
The verdict. A hard rectangle rotated -4.5° with a double-ruled border (2px outer, inset ring via
`box-shadow`), set in tracked uppercase Archivo at `wdth 88`/800 in oxide (FLAGGED) or violet
(VERIFY). It carries a drawn margin mark — a filled square, a half-banded square, an outline square
or a dashed square — so the tier survives greyscale, and it is accompanied by the reviewed tier
sentence printed beneath it.

On a resolving result it is *struck*: `reg-strike` runs 180ms, scaling 1.14→1 and rotating -9°→-4.5°
while an ink-bleed blur resolves 2.5px→0. Under `prefers-reduced-motion` it is simply present.

**`NO_ALERT_FOUND` and `PENDING` are never stamped.** They print `.reg-nil` — an outline mark plus
the words, on a rule. The absence of a stamp is the design carrying the product rule.

## Do's and Don'ts

### Do:
- **Do** derive every new colour with `color-mix` from one of the six inks, and state the proportion.
- **Do** give every screen exactly one `.reg-btn--primary`.
- **Do** pin every claim where it is made: alert month, reporting lab, batch and source link live on
  the entry in `.reg-particulars`, never behind a disclosure.
- **Do** print states into the record — `.reg-line` for loading, offline, error and empty.
- **Do** keep Archivo for printed matter and Anonymous Pro for recorded values, and give Indic bands
  their own `lang` attribute.
- **Do** number entries in the oxide margin; a bench register numbers its lines.

### Don't:
- **Don't** introduce a radius, a shadow in the content layer, a gradient, glass, or a pill.
- **Don't** use oxide red for anything but the margin rule and the stamp.
- **Don't** add green, a tick, or any word in the "safe / genuine / verified" family — and don't
  invent a stamp for an absence.
- **Don't** ship a toast, a snackbar, or a spinner. The only permitted overlay is `.reg-docket`, for
  a genuinely focus-protecting task.
- **Don't** set a tier-bearing word below `--step-small`, or let any tap target fall under 48px.
- **Don't** let colour alone carry a tier; the drawn mark and the words ride with it always.
- **Don't** use emoji or unicode glyphs as icons. Icons are authored SVG at 1.75px, square caps.
