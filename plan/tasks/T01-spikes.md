# T01 — Spikes: remove external risks
**Priority:** P0 · **Stage:** 0 · **Sessions:** 1 · **Depends on:** T00

## Read first
CLAUDE.md, docs/DATA_SOURCES.md, docs/ALERTS.md, docs/SCANNING.md, docs/PERMISSIONS.md, docs/SAFETY_AND_CONTENT.md (Read-aloud)

## Goal
Answer every "will this work from AWS in ap-south-1?" question in the first hours, with evidence, and write the answers into this file's Handoff and into the named SSM parameters.

## Owns
`spikes/` (throwaway code, kept for the learning log), `infra/lib/lanes/t01-spikes.ts` (deleted or disabled at the end)

## Spikes
1. **CDSCO endpoint from Lambda (ap-south-1).**
   - Call `filteredNsqDrugTable` for 3 months, with and without: browser User-Agent, `Referer` of the public NSQ page, `X-Requested-With: XMLHttpRequest`, cookies obtained by first loading the parent page.
   - Find the Spurious tab value and `publicReportingMonths` exact parameters from the page's network requests (use a browser dev tools session and record the requests).
   - Record: status codes, the minimum request that works, response format (HTML fragment/JSON), columns, date formats, pagination, row count for one month. Save 3 sample responses to `packages/contracts/fixtures/cdsco/` (hand to T02).
   - **Verdict:** `ENDPOINT_OK` or `ENDPOINT_FAILS` (then A3 becomes P0).
2. **PDF listing.** Find the listing page URL for NSQ alerts and confirm links can be discovered; download 2 PDFs from Lambda. Save to fixtures.
3. **Bedrock.** Which Claude vision models are invokable from ap-south-1 (direct or via an inference profile)? Enable model access. Run one strip image through Converse with a tool schema. Write the model/profile ID to SSM `/asli/dev/bedrock/visionModelId` and in Handoff.
4. **Web push to Android.** Minimal page + service worker on the Amplify URL, VAPID keys, one push from a Lambda to a real Android Chrome. Note iOS limitations.
5. **SES.** Verify sender address/domain and the team's demo recipient emails; submit production access request; record status.
6. **Verified Permissions.** Create a policy store in ap-south-1, load the schema from docs/PERMISSIONS.md, run one IsAuthorized call with inline entities.
7. **Polly and Translate.** List voices for `hi-IN`, `en-IN`, `kn-IN` (engine support). Translate one template to `hi` and `kn`.
8. **Textract.** Run AnalyzeDocument (TABLES) on one CDSCO PDF page; note quality of batch number cells.

## Acceptance criteria
- [ ] Each spike has a result, evidence (status codes, IDs, screenshots path) and a decision in Handoff
- [ ] Endpoint verdict written, and human told immediately if `ENDPOINT_FAILS`
- [ ] Fixture files saved for T02
- [ ] SES production access requested
- [ ] Learning log has at least 3 entries

## Out of scope
Production-quality code.

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
