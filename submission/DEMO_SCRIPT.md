# DEMO_SCRIPT.md — three-minute video

Record on a real Android phone (screen recording) plus a laptop for the AWS console. Captions on. Total ≤ 3:00. Replace every {{placeholder}} with measured numbers before recording.

| Time | Shot | Voice-over (draft) | Must show |
|---|---|---|---|
| 0:00–0:20 | Parent's medicine box; then a CDSCO alert PDF scrolling | "Every month, India's drug regulator lists medicine batches that failed quality tests. Almost no family ever sees these lists." | Real CDSCO document |
| 0:20–0:30 | Stat card | "We analysed {{N}} flagged batches. {{X}}% were still within expiry when announced, about {{M}} months after manufacture. They're likely still in someone's home." | Numbers from lane S |
| 0:30–0:55 | Phone: Check a medicine → strip photo → confirm → result | "Take a photo of the strip." Result: "No alert found for this batch, checked against {{K}} CDSCO lists." | Neutral card, not "safe" |
| 0:55–1:25 | Second strip (mock) → red card → source link opens CDSCO | "This one matches a batch CDSCO reported as Not of Standard Quality. The match is exact on batch and manufacturer, and decided by code, not AI." On-screen text: "Mock strip matching a real CDSCO alert, created for this demo." | Source link, what to do next, read aloud in Hindi (2 s) |
| 1:25–1:45 | Bill photo → several lines checked | "Or photograph the pharmacy bill and check a whole month's medicines at once." | Per-line chips |
| 1:45–2:05 | Save to "Mom's medicines"; sibling's phone shows shared cabinet; viewer can't remove | "Save them once. Your brother gets alerts too, and permissions decide who can change what." | Verified Permissions moment |
| 2:05–2:35 | Laptop: trigger demo replay → Step Functions graph runs → phone buzzes → email | "When CDSCO publishes a new list, our pipeline ingests it and checks every saved medicine. Here we replay a real past alert." | Execution graph, push arriving |
| 2:35–2:50 | Architecture diagram; dashboard | "Serverless on AWS: Step Functions, DynamoDB Streams, Bedrock, Verified Permissions. {{A}}% batch accuracy on {{P}} real photos, about ₹{{C}} per 1,000 scans." | Measured numbers |
| 2:50–3:00 | Logo, URL, insights/pharmacy glimpse | "Asli. Know your batch." | Live URL |

## Recording checklist
- Demo data reset, notifications enabled, Do Not Disturb off, battery/clock tidy
- Scan Lambda warmed; SES recipient verified
- Record each segment separately; keep raw files
- Rough draft recorded Saturday morning; final Sunday
