# DEMO_SCRIPT.md — three-minute video

The notice is explicit: **3 minutes maximum, a screen recording or phone video is fine, upload it to
YouTube (unlisted or public) before starting the form, and there is no live demo, so the video is
what the judges see.** Anything the video does not show does not count. The judging rubric asks the
video to show three things: what it does, who it is for, and where AWS fits.

Record on a real Android phone (screen recording) plus a laptop for the AWS console. Captions on.
Total ≤ 3:00, so aim for 2:50 and leave slack. Every number below is a measured one from the repo or
the live `/dashboard`. Do not add a number that is not in this table.

| Time | Shot | Voice-over | Must show |
|---|---|---|---|
| 0:00–0:18 | A parent's medicine box; then the CDSCO alerts page and a PDF scrolling | "Every month India's drug regulator, CDSCO, lists medicine batches that failed quality tests. Almost no family ever sees those lists. This is Asli." | Real CDSCO page |
| 0:18–0:32 | Stat card: **3,326 flagged batches · 99.47% still within expiry when announced · median 9 months after manufacture** | "We ingested 21 months of CDSCO lists. Nearly all of these batches were still in date when the alert came out. They are probably still in someone's home." | The three numbers, from the real backfill |
| 0:32–0:58 | Phone: Check a medicine → strip photo → confirm fields → result card | "Take a photo of the strip. Asli reads the batch and checks it against every list." Result: **"No alert found for this batch."** | The neutral card. Never the word "safe" |
| 0:58–1:28 | Second strip → red result → tap the source link (opens CDSCO) → tap read-aloud in Hindi | "This batch matches a CDSCO alert. The match is on batch and manufacturer, and it is decided by our code, not by AI. Here is the month, the lab and the original source." | **On-screen caption: "Mock strip matching a real CDSCO alert, made for this demo."** Source link. "Do not stop a prescribed medicine without talking to your doctor" visible |
| 1:28–1:45 | Bill photo → per-line results | "Or photograph a pharmacy bill and check several medicines at once." | Per-line chips. Show a bill that reads well. Do not claim more than the 50% line recall |
| 1:45–2:05 | Save to "Mom's medicines". Second phone signed in as `vikram.demo@asli.internal` (the seeded **Editor**) sees the same cabinet, then tries to invite or manage members and is refused | "Save a medicine once and your sibling sees it too. Roles decide who can add, remove or manage." | The refused action. The seed has an Owner and an Editor only, so show the Editor refused on **members**, not on removing a medicine (Editors may remove). Rehearse this once to confirm the UI shows the refusal. Say "roles", not "Verified Permissions": sharing runs on a stub of the same Cedar rules |
| 2:05–2:35 | **Laptop, AWS console.** Trigger the demo replay → Step Functions execution graph runs green → phone buzzes and an email arrives | "When CDSCO publishes a new list, this pipeline ingests it and checks every saved medicine. Here we replay a real past alert, labelled as a demo." | The execution graph; the push on the phone; the "Demo replay of a real Feb 2026 CDSCO alert" label |
| 2:35–2:52 | Architecture diagram, then the public `/dashboard` | "Serverless on AWS: EventBridge, Step Functions, Lambda, DynamoDB Streams, S3, SNS, SES, Cognito and Amplify, all in Mumbai. 44 of 44 tier checks correct. Batch number read exactly on 12 of 15 real strip photos. A small sample, and we show it." | Diagram, then the dashboard's real figures |
| 2:52–3:00 | Title card: logo, live URL, "Try it: `asha.demo@asli.internal` / `AsliDemo!2026`, or open /insights with no sign-in" | "Asli. Know your batch." | Live URL |

## Say and show honestly
- **Photo reading is not Bedrock today.** Bedrock invocation is refused in our AWS account, so the
  live reader is the Gemini API, switchable to Bedrock by one SSM parameter. If you show the scan
  Lambda, say "the photo is read by a vision model; the match is our own code on DynamoDB". Never say
  "Bedrock reads the strip".
- **Sharing runs on a stub** of the Cedar role table, because Verified Permissions is blocked in the
  account. Say "roles". Do not say "Verified Permissions" on camera.
- **Never say safe, genuine or verified**, and never blame a brand. Say "this batch".
- **Mock strip and demo replay must be disclosed on screen**, not only spoken.
- **No cost-per-scan figure.** None is measured. If you mention cost, say only that everything
  scales to zero.

## The fallback if the live replay misbehaves (2:05–2:35)
Show the seeded "Mom's medicines" cabinet with its FLAGGED match already resolved, then open a past
successful ingestion execution in the Step Functions console and a CloudWatch alert-fan-out log line.
Say "a previous run", not "live".

## Before recording
- [ ] Open the live URL in a **private window with no cache** and confirm a judge can get in: the
      public pages load, and the demo login above signs in. The judges will not sign up.
- [ ] Reset demo data (`pnpm seed-demo --stage dev-shared`), notifications on, Do Not Disturb off
- [ ] Warm the scan Lambda once; confirm the SES recipient is verified
- [ ] Rehearse the replay twice on the phone (`plan/tasks/Z1-hardening-freeze.md` Handoff has the steps)
- [ ] Record each segment separately and keep the raw files
- [ ] Captions on; total length under 3:00 on the exported file, not the timeline
- [ ] **Upload to YouTube as unlisted or public first**, before opening the form, since uploads are
      slow. Put the link in `submission/WRITEUP.md` and `submission/FORM_ANSWERS.md`
