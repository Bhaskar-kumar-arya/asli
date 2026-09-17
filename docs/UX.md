# UX.md — Elderly-first design

## Principles
1. One primary action per screen.
2. Base font 18 px, headings 28 px, tap targets ≥ 48 px, contrast ≥ WCAG AA (aim AAA for result cards).
3. Status never by colour alone: icon + title text + colour.
4. Plain words, no jargon ("batch number" with a picture of where to find it).
5. Every result has "Read aloud" and a language switch (English / हिन्दी / ಕನ್ನಡ).
6. Works one-handed on a 360 px wide Android phone.
7. Offline-tolerant shell (PWA); clear message when offline.

## Visual system
- Colours as CSS variables with light/dark variants. Result tiers: FLAGGED red, VERIFY amber, NO_ALERT_FOUND neutral blue-grey (not green, to avoid implying "safe").
- Icons: FLAGGED ⚠ shield-alert, VERIFY help-circle, NO_ALERT_FOUND search-check.
- Font: Noto Sans + Noto Sans Devanagari + Noto Sans Kannada (Google Fonts, with system fallbacks).

## Screens
| # | Screen | Key elements | Lane |
|---|---|---|---|
| 1 | Welcome / sign in | What Asli does in one sentence; sign in with email | D1 |
| 2 | Home | Big "Check a medicine" button; "My family's medicines" list with status chips; last CDSCO update date | D1 (shell), D3 (list) |
| 3 | Choose method | Photo of strip · Photo of bill · Scan QR (K) · Type details | D2 |
| 4 | Capture | Camera input, "where is the batch number" illustration | D2 |
| 5 | Confirm details | Editable fields, low-confidence fields highlighted, "Looks right" button | D2 |
| 6 | Result card | Tier title, body, matched alert details, "What to do next", "View CDSCO source", "Read aloud", "Save to family medicines" | D2 |
| 7 | Bill results | List of lines, each with a tier chip; lines without batch show "Add strip photo" | D2 |
| 8 | Cabinet | Medicines grouped by person, status chips, add button, members | D3 |
| 9 | Medicine detail | Identity, latest check, match history, remove (permission aware) | D3 |
| 10 | Members and invites | Roles, invite code/link, alert toggle | D3 |
| 11 | Settings | Language, notifications on/off + test push, text size (normal/large/extra large) | D1 |
| 12 | Notification opened | Deep link to medicine detail with the new match highlighted | D3 |
| 13 | Insights (public) | Charts and stats (M) | M |
| 14 | Dashboard (public) | Accuracy and cost (J) | J |
| 15 | Pharmacy mode | Upload CSV or invoice photo, results table, flagged units | N |

## Result card states to design and test
FLAGGED NSQ · FLAGGED SPURIOUS · VERIFY (near batch) · VERIFY (manufacturer unknown) · VERIFY (low read confidence) · NO_ALERT_FOUND · extraction failed → manual entry · not a medicine photo · offline.

## Demo-friendly details
- Result card animates in (under 300 ms, respects reduced-motion).
- Demo replay rows show "Demo replay of a real <Month YYYY> CDSCO alert".
