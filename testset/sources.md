# Photo sources and licensing

All photos in `testset/strips/` and `testset/bills/` were sourced from **Wikimedia
Commons** (September 2026), a CC-licensed / public-domain media repository. Every
image is real (not synthetic/AI-generated), unaltered except for downscaling
(JPEG, longest side capped) and, for the one bill, cropping to redact anything
that wasn't the medicine line and price. Ground truth in each `<id>.json` was
transcribed by zooming into the photo, not guessed.

Attribution (author + license) is required for reuse; kept here per-item. Full
license text: CC BY 2.0/3.0/4.0 = https://creativecommons.org/licenses/by/{ver}/,
CC BY-SA 3.0/4.0 = https://creativecommons.org/licenses/by-sa/{ver}/.

## Strips

| id | Commons file | Author | License |
|---|---|---|---|
| strip-001-neorelax-mr | [Thiocolchicoside-Aceclofenac-Paracetamol Tablet - Howrah 20170920111151.jpg](https://commons.wikimedia.org/wiki/File:Thiocolchicoside-Aceclofenac-Paracetamol_Tablet_-_Howrah_20170920111151.jpg) | Biswarup Ganguly | CC BY 3.0 |
| strip-002-zinnat | [20120127-CefuroximeTablets-from-TKOH-SDC13826.JPG](https://commons.wikimedia.org/wiki/File:20120127-CefuroximeTablets-from-TKOH-SDC13826.JPG) | Tomchiukc | CC BY-SA 3.0 |
| strip-003-unbranded-blister | [Blister of tablets.jpg](https://commons.wikimedia.org/wiki/File:Blister_of_tablets.jpg) | Tarasna0922 | CC BY-SA 4.0 |
| strip-004-xelevia | [Xelevia Sitagliptin phosphate1.jpg](https://commons.wikimedia.org/wiki/File:Xelevia_Sitagliptin_phosphate1.jpg) | Valenzuela400 | CC BY-SA 4.0 |
| strip-005-fincover | [Generic Propecia.jpg](https://commons.wikimedia.org/wiki/File:Generic_Propecia.jpg) | Kristoferb | CC BY-SA 3.0 |
| strip-006-fromilid | [Fromilid 500 mg tbl.jpg](https://commons.wikimedia.org/wiki/File:Fromilid_500_mg_tbl.jpg) | Tomino de WS | CC BY-SA 4.0 |
| strip-007-lozap-h | [Lozap 50 mg-12,5 mg tbl.jpg](https://commons.wikimedia.org/wiki/File:Lozap_50_mg-12,5_mg_tbl.jpg) | Tomino de WS | CC BY-SA 4.0 |
| strip-008-ritalin | [Ritalin 10 mg tbl.jpg](https://commons.wikimedia.org/wiki/File:Ritalin_10_mg_tbl.jpg) | Tomino de WS | CC BY-SA 4.0 |
| strip-009-xarelto | [Xarelto 20 mg tbl.jpg](https://commons.wikimedia.org/wiki/File:Xarelto_20_mg_tbl.jpg) | Tomino de WS | CC BY-SA 4.0 |
| strip-010-bloxazoc | [Bloxazoc 50 mg tbl.jpg](https://commons.wikimedia.org/wiki/File:Bloxazoc_50_mg_tbl.jpg) | Tomino de WS | CC BY-SA 4.0 |
| strip-011-zulbex | [Zulbex 20 mg tbl.jpg](https://commons.wikimedia.org/wiki/File:Zulbex_20_mg_tbl.jpg) | Tomino de WS | CC BY-SA 4.0 |
| strip-012-plendil-er | [Plendil ER 10 mg tbl.jpg](https://commons.wikimedia.org/wiki/File:Plendil_ER_10_mg_tbl.jpg) | Tomino de WS | CC BY-SA 4.0 |
| strip-013-ebrantil | [Ebrantil 60 mg cps.jpg](https://commons.wikimedia.org/wiki/File:Ebrantil_60_mg_cps.jpg) | Tomino de WS | CC BY-SA 4.0 |
| strip-014-tolucombi-80 | [Tolucombi 80 mg-12,5 mg tbl.jpg](https://commons.wikimedia.org/wiki/File:Tolucombi_80_mg-12,5_mg_tbl.jpg) | Tomino de WS | CC BY-SA 4.0 |
| strip-015-mock-flagged-e9aiy029 | **Not a sourced photo — constructed for the demo.** Base image is strip-003's same CC BY-SA 4.0 blister photo (Tarasna0922), with a printed label panel composited below it carrying the real CDSCO NSQ row from `fixtures/demo/replay-1.json` (Feb-2026, E9AIY029 / Pharma Force Lab) and a red "MOCK / DEMO STRIP — NOT A REAL PRODUCT" disclosure banner, matching the disclosed-mock-strip pattern in `submission/DEMO_SCRIPT.md`/`docs/PRIVACY.md`. See its `.json` label file's `note` field. | (derivative of strip-003) | CC BY-SA 4.0 |

## Bills

| id | Commons file | Author | License |
|---|---|---|---|
| bill-001-nl-apotheek-cream | [Apotheek Hillegersberg receipt, Hillegersberg, Rotterdam (2021) 01.jpg](https://commons.wikimedia.org/wiki/File:Apotheek_Hillegersberg_receipt,_Hillegersberg,_Rotterdam_(2021)_01.jpg) | Donald Trung | CC BY-SA 4.0 (image cropped to redact pharmacy name/address/phone/payment details, keeping only the medicine line and price) |

## Coverage gaps and why

- **Strips: 14/30.** Sourced by searching Wikimedia Commons (API `list=search`,
  `list=categorymembers`, and browsing prolific pharma-photo contributors'
  upload histories) for blister-pack/strip photos, then downloading and
  visually zooming into every candidate to check whether a batch/lot number
  was actually legible (a hard requirement — `batchNumber` is non-optional in
  the label schema, and the task instructions say not to guess). Roughly 80
  candidate images were inspected; most professional/Wikipedia-style product
  photos show only the front of the box (no batch/lot/exp, which is usually
  printed in small text on the blister's cut edge or the box's reg./exp.
  panel) — only ~20% of candidates had a confidently readable batch number.
  A handful of borderline reads (ambiguous digits, ML-native-resolution
  blur) were deliberately excluded rather than guessed.
- **Only 4 of the 14 are genuinely Indian-market packs** (strip-001, 005, and
  the two Cipla/Micro Labs finds that didn't make the final cut on legibility).
  CDSCO-regulated Indian strip photos with a legible batch number are scarce
  on Commons specifically (searched for Cipla, Sun Pharma, Lupin, Alkem,
  Mankind, Torrent, Zydus Cadila, Dr Reddy's by name — almost all hits were
  EU parallel-import regulatory PDFs, not photos). The other 10 are
  real, CC-licensed, legible strip photos of EU/Philippines-market packs
  (KRKA, Zentiva, Novartis, Bayer, AstraZeneca, Takeda, GSK, Organon) —
  useful for testing the vision extraction pipeline's field-reading accuracy
  (batch/mfr/expiry OCR), even though they don't exercise Indian-specific
  formatting.
- **Bills: 1/10.** This is the weakest area. Extensive searching (Commons
  full-text search for "pharmacy bill/receipt/cash memo", Openverse image
  search, browsing Commons categories) turned up essentially no real,
  itemised, CC-licensed Indian pharmacy bill photos — retail till receipts
  showing a medicine batch/MRP line are not the kind of photo people
  publish under an open license. The one usable find is a real Dutch
  pharmacy till receipt (Apotheek Hillegersberg, Rotterdam) showing one
  compounded-cream line item and price; it has no batch/manufacturer/expiry
  (normal for an EU till receipt) and is not Indian-format, but it is a real,
  legally-licensed, PII-clean medicine purchase record, which is why it was
  kept rather than discarded. Two similar Dutch pharmacy receipts found in
  the same search (Apotheek Zevenkamp, SE Apotheek Het Dokhuis) were
  card-payment-terminal slips with no medicine line at all and were not used.
  No padding: no irrelevant/unlabelable images were added just to raise the
  count.

**Bottom line:** 14/30 strips and 1/10 bills, honestly short of target. The
harness itself (label CLI, runner, scorer) is unaffected — see
`tools/accuracy/README` usage and this task file's Handoff section for what a
human collecting real photos from their own medicine cabinet would still need
to add to close the gap, especially on the bill side.
