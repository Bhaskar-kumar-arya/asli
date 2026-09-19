---
version: 1
slug: "apps-web-src-main-tsx"
primary_target: "apps/web/src/main.tsx"
related_targets: ["apps/web/src/theme/tokens.css","apps/web/src/shell/components","apps/web/src/app"]
---

Scope: the whole of `apps/web` — all 15 screens across sign-in, home, scan, cabinet, insights, dashboard, pharmacy, settings. Visitor mode: Operate.

Audience: a caregiver aged 25–45 checking a parent's medicine, often from another city; secondarily the parent aged 60+ reading it in Hindi or Kannada at extra-large text. Job: decide whether a batch in the house is on a CDSCO list. Proof: the alert month, the reporting lab, the batch, and a link to the CDSCO source. Constraints: 18px base, 48px tap targets, one primary action per screen, 360px wide, WCAG AA, tier never by colour alone, the negative result reads "No alert found for this batch", Noto Sans Devanagari and Noto Sans Kannada stay in the stack.

## Direction contract

THESIS: Asli is the drug-testing laboratory's own bench register, so a verdict arrives as a rubber stamp struck across a ruled line and an unlisted batch gets no stamp at all. It refuses the health-app card stack, the rounded status pill, and the green tick, because a register has no vocabulary for "safe" — only for what is on record.

OWN-WORLD: Register stock #ECEBE1 ruled in faint ledger blue-green #A3B3AC, carbon ink #16150F, an oxide-red #B0342A double margin rule down every screen, methyl-violet #5B3E8E for referred entries. Six locked inks; every tint is one of them at a stated opacity, never a colour picked by eye. Archivo for printed matter, Anonymous Pro for recorded values, Noto Devanagari and Noto Kannada for Indic bands. Fields are baseline rules written on, not boxes. Buttons are struck rectangles. Dark mode is the same register on a night bench: ground drops to iron #12130F, stamps stay saturated.

STORY: The visitor understands that a real laboratory tested this exact batch and recorded a finding; believes it because the alert month, lab and source link sit on the entry rather than behind a disclosure; and either stamps a new entry into the register or reads the one that already exists.

FIRST VIEWPORT: A double-ruled masthead block spans full width — ASLI in Archivo caps, a Devanagari band under a hairline, and along its lower edge in Anonymous Pro the register's currency: the CDSCO alert month and the entry count. Beneath it, the next blank line of the register at full width and 96px tall, its entry number in the oxide margin, CHECK A MEDICINE set large on the rule with a typewriter caret — the only primary action on the screen. Below that the family's medicines run as numbered ruled rows, each carrying its margin glyph, medicine name, batch in Anonymous Pro, and at the rule's end either a struck stamp or the printed words NO ENTRY ON RECORD. Index tabs sit at the foot.

FORM: The Analyst's Record — the government drug-testing lab's bench register and certificate of analysis. Candidate 5 of the round-1 grounded list, assigned by the roll and then pinned by the user over round 2. Seed key c412f33f.

Raises carried in from declined challengers: monumental scale, so the batch number is the largest ink on a result sheet; one reserved accent, so oxide red is only ever the margin rule and the stamp; a locked six-ink set; and states that print themselves, so no toast, spinner or floating modal exists anywhere in the app — offline, loading, error and empty each arrive as a printed line of record.

Signature interaction: the stamp. A resolved result writes its rows in at 40ms intervals, then the stamp lands — scale 1.12 to 1.0 with a −4.5° rotation and an ink-bleed blur resolving to sharp over 140ms, under the 300ms budget. Under prefers-reduced-motion the stamp is simply present. Motion grammar is paper and press: things are printed or struck, never floated, sprung or faded up from below.

Unresolved: whether the insights and dashboard charts read better as ruled tabulation or as the register's monthly return sheet; decide at build.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
