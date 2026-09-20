# DEMO_SCRIPT.md — three-minute video

The notice is explicit: **3 minutes maximum, a screen recording or a phone video is fine, upload it to
YouTube (unlisted or public) before starting the form, and there is no live demo, so the video is
what the judges see.** Anything the video does not show does not count. The judging rubric asks the
video to show three things: what it does, who it is for, and where AWS fits. Learning is a fourth
criterion the video can also earn, so the script closes on it.

Record on a real Android phone (screen recording) plus a laptop for the AWS console. Captions on.
The timings below total **3:00**, exactly at the cap — no slack left.

| Time | Shot | Voice-over | Must show |
|---|---|---|---|
| 0:00–0:12 | A parent's medicine box, then the CDSCO alerts page and a PDF scrolling | "These are my mother's tablets. Every month India's drug regulator, CDSCO, lists medicine batches that failed quality tests. Almost no family ever sees the list. This is Asli." | Real CDSCO page. **Say the first sentence only if it is true for you.** If not, open on the box and start at "Every month…" |
| 0:12–0:28 | Stat card: **3,326 flagged batches · 99.47% still within expiry when announced · median 9 months after manufacture** | "We ingested 21 months of CDSCO lists. Nearly all of these batches were still in date when the alert came out — still in an elderly parent's cabinet, while the adult child managing their medicines has no way to know." | The three numbers, from the real backfill. This is the "who it is for" line, so do not cut it |
| 0:28–0:54 | Phone: Check a medicine → strip photo → **jump-cut the wait** → confirm fields → result card | "Take a photo of the strip. Asli reads the batch and checks it against every list." Result: **"No alert found for this batch."** | **Caption during the cut: "upload + extraction, about 6 s".** The neutral card, never the word "safe" |
| 0:54–1:22 | Second strip → red result → tap the source link (opens CDSCO) → tap read-aloud in Hindi | "This batch matches a CDSCO alert. The match is on batch and manufacturer, and it is decided by our code, not by AI. Here is the month, the lab and the original source." | **On-screen caption: "Mock strip matching a real CDSCO alert, made for this demo."** Source link. "Do not stop a prescribed medicine without talking to your doctor" visible |
| 1:22–1:34 | Bill photo → per-line results | "Or photograph a pharmacy bill and check several medicines at once." | Per-line chips. **Use a bill that reads well.** Optional caption: "6 real bills tested, 50% of lines read". Claim no more than that |
| 1:34–1:54 | Save to "Mom's medicines". Second phone signed in as `vikram.demo@asli.internal` (the seeded **Editor**) sees the same cabinet, then tries to invite or manage members and is refused | "Save a medicine once and your sibling sees it too. Roles decide who can add, remove or manage." | The refusal message actually rendering. The seed has an Owner and an Editor only, so show the Editor refused on **members**, not on removing a medicine (Editors may remove). Say "roles", not "Verified Permissions": sharing runs on a stub of the same Cedar rules. **If it does not render cleanly on the second try, cut this segment** |
| 1:54–2:20 | **Laptop, AWS console.** Trigger the demo replay → Step Functions execution graph runs green → an email arrives | "When CDSCO publishes a new list, this pipeline ingests it and checks every saved medicine. Here we replay a real past alert, labelled as a demo." | The execution graph; the "Demo replay of a real Feb 2026 CDSCO alert" label |
| 2:20–2:43 | Architecture diagram, held for the full 23 s | "Serverless on AWS, in Mumbai: EventBridge, Step Functions, Lambda, DynamoDB Streams, and SNS and SES for that alert email you just saw. Our matching logic decided the right tier on all 44 test cases. And when we tested it by hand against 53 real medicine-strip photos, it read the batch number exactly on 49 of them." | Say **six** services aloud. Let the diagram's labels carry the rest, plus a caption: "Also S3 · Cognito · Amplify · CloudWatch · CDK" |
| 2:43–2:53 | `submission/learning-card.html`, full-screen in a browser. Eight entries rule in one at a time over ~6 s, then hold | "Every test passed. Lint passed. CDK synth passed. None of these showed up until real traffic hit real AWS — that's where the actual learning was." | The card carries the content; no captions needed. Every entry is sourced from `submission/LEARNING_LOG.md`. This is the Learning criterion |
| 2:53–3:00 | Title card: logo, live URL, and the line "Press **Continue as guest**. No sign-up." | "Asli. Know your batch." | Live URL and that one line. Hold it long enough to read, about 3 s |

## Say and show honestly
- **Photo reading is not Bedrock today.** Bedrock invocation is refused in our AWS account, so the
  live reader is the Gemini API, switchable to Bedrock by one SSM parameter. If you show the scan
  Lambda, say "the photo is read by a vision model; the match is our own code on DynamoDB". Never say
  "Bedrock reads the strip".
- **Sharing runs on a stub** of the Cedar role table, because Verified Permissions is blocked in the
  account. Say "roles". Do not say "Verified Permissions" on camera.
- **Never say safe, genuine or verified**, and never blame a brand. Say "this batch".
- **Mock strip and demo replay must be disclosed on screen**, not only spoken.
- **Do not hide the scan wait.** Jump-cut it, and caption the cut with the real figure.
- **No cost-per-scan figure.** None is measured. If you mention cost, say only that everything
  scales to zero.
- **The learning line is true to the log**, not a flourish: `submission/LEARNING_LOG.md`, entry
  "The live deployed site had never actually worked in a real browser".

## The fallback if the live replay misbehaves (1:54–2:20)
Show the seeded "Mom's medicines" cabinet with its FLAGGED match already resolved, then open a past
successful ingestion execution in the Step Functions console and a CloudWatch alert-fan-out log line.
Say "a previous run", not "live".

## Before recording
- [ ] Open the live URL in a **private window with no cache** and confirm a judge can get in: the
      sign-in page loads, **the "Continue as guest" button signs in and opens "Mom's medicines"**, and
      the "Open to anyone" links open the public pages. **Also open `/insights` and `/dashboard` directly.** If those return 404, the Amplify
      rewrite rule is missing (see `plan/tasks/Z2-submission-package.md`, Remaining). Until it is added,
      do not show or say a bare `/insights` URL anywhere in the video
- [ ] **Second phone: signed in as the Editor (`vikram.demo@asli.internal`), and the members refusal
      renders.** Try it twice. If it is not clean on the second try, cut the 1:34–1:54 segment and
      keep the rest; the video stays under 3:00
- [ ] Reset demo data (`pnpm seed-demo --stage dev-shared`)
- [ ] Warm the scan Lambda once; confirm the SES recipient is verified
- [ ] Rehearse the replay twice (`plan/tasks/Z1-hardening-freeze.md` Handoff has the steps)
- [ ] **Read each voice-over line aloud with a stopwatch** against its slot. If a line runs over,
      cut words, not shots
- [ ] Record each segment separately and keep the raw files
- [ ] Captions on; total length under 3:00 on the exported file, not the timeline
- [ ] **Upload to YouTube as unlisted or public first**, before opening the form, since uploads are
      slow. Put the link in `README.md`, `submission/WRITEUP.md` and `submission/FORM_ANSWERS.md`
