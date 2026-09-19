# D1 — Web shell: auth, layout, settings, push subscription, i18n frame
**Priority:** P0 · **Wave 1** · **Sessions:** 1 · **Depends on:** T02

## Read first
CLAUDE.md, docs/UX.md, docs/API.md, docs/ALERTS.md (Web push), docs/SAFETY_AND_CONTENT.md (Languages)

## Goal
The app frame every screen lives in, usable by an elderly user, with sign-in and push working.

## Owns
`apps/web/src/{app,shell,auth,settings,i18n,api,mocks,sw.ts,theme}/**`, `apps/web/index.html`, `apps/web/vite.config.ts`

## Must not touch
`apps/web/src/features/{scan,cabinet,insights,dashboard,pharmacy}/**` (D2, D3, M, J, N)

## Deliverables
1. Theme tokens and components: Button, Card, StatusChip (tier), Field, Page, BottomNav; font sizes and contrast per docs/UX.md; text-size setting (normal/large/extra large) via root CSS variable.
2. Cognito email sign-in (Amplify JS v6 Auth only) with a friendly flow; protected routes.
3. `api/` typed client generated from contracts (fetch wrapper with JWT, error mapping), and **MSW mocks** returning contract fixtures, enabled with `VITE_MOCK=1`. D2/D3/others use this.
4. i18next setup with `en`, `hi`, `kn` resource loading from `packages/content` (fallback to `en`), language switch persisted to profile/localStorage.
5. Service worker (`sw.ts`): precache shell, `push` handler (show notification from payload), `notificationclick` opens `url`.
6. Settings screen: language, text size, notifications toggle (subscribe/unsubscribe via `/v1/push/subscriptions`), "Send test notification".
7. Routes registry file `app/routes.tsx` where D2/D3/M/J/N add one line each (the only shared edit point; keep lines sorted to avoid conflicts).
8. Offline banner.

## Acceptance criteria
- [ ] With `VITE_MOCK=1` every screen route renders without a backend
- [ ] Sign-in works against `int` Cognito on the Amplify URL
- [ ] Test notification arrives on Android Chrome (once G1 is deployed; until then against T01 spike sender)
- [ ] Lighthouse accessibility ≥ 95 on shell pages
- [ ] Language switch changes shell text

## Out of scope
Feature screens.

---
## Handoff (the session updates this before stopping)
**Status:** IN PROGRESS (built opportunistically from lane/D2 so D2 wasn't blocked; human approved doing both in one session - see plan/tasks/D2-scan-result-screens.md)
**Stage deployed:** none (frontend only, not yet pointed at a real `int` API)
**Done:**
- Theme tokens (`theme/tokens.css`, light/dark via `prefers-color-scheme` + `data-theme`, text-size via `data-text-size`, reduced-motion respected) and `theme/textSize.ts`.
- Shared components: `Button`, `Card`, `StatusChip`, `Field`, `Page`, `BottomNav`, `OfflineBanner` in `shell/components/**`.
- Cognito email sign-in (`auth/**`) using Amplify JS v6 (`aws-amplify` added as a dependency), gated by `VITE_COGNITO_USER_POOL_ID`/`VITE_COGNITO_USER_POOL_CLIENT_ID` build env vars; `ProtectedRoute` + `AuthProvider`.
- `api/client.ts` (typed fetch wrapper, JWT attach, `ApiError` → `ApiRequestError` mapping) and `api/endpoints.ts` (uploads, scans, checks, alerts, push, cabinets/medicines).
- MSW mocks (`mocks/**`) driven by `@asli/contracts/fixtures/scan-responses.json`, enabled with `VITE_MOCK=1`; `public/mockServiceWorker.js` generated via `npx msw init`.
- i18next setup (`i18n/**`) with `en`/`hi`/`kn` shell-chrome strings only (language switch persisted to localStorage) - guidance/result copy is separate, see D2 Handoff.
- Service worker (`sw.ts`): precache (unchanged from T00 scaffold) + `push` handler (shows notification from the docs/ALERTS.md payload shape) + `notificationclick` (focuses/opens `url`).
- Settings screen (language, text size, notification subscribe/unsubscribe via `/v1/push/subscriptions`, test push button).
- `app/routes.tsx` registry (D2 already added its one line for `scanRoutes`).
- `OfflineBanner` wired globally in `AppRoot`.
**Remaining:**
- **Real Cognito sign-in against the live Amplify Hosting site: done (2026-09-19, follow-up session).** Set `VITE_COGNITO_USER_POOL_ID`/`VITE_COGNITO_USER_POOL_CLIENT_ID`/`VITE_API_BASE_URL` on the real Amplify app (`aws amplify update-app --environment-variables ...` + `start-job --job-type RELEASE`) and verified end-to-end with a real headless-browser (Playwright) session signed in as the seeded demo user. This surfaced and fixed three more real, stacked bugs along the way (API Gateway CORS never allowing the real origin, a double `/v1/v1` path prefix in the cabinet API client, and the cabinet client never actually using D1's real auth session) - full writeup in `submission/LEARNING_LOG.md`'s 2026-09-19 entry. Real screenshots from this session are now in `docs/screenshots/`, linked from `README.md`.
- Lighthouse accessibility audit not run - please run manually before the demo.
- Confirm-signup / forgot-password flows are not built (only sign-in) - add if the demo needs new user self-signup instead of pre-created test accounts.
**Gotchas / decisions:**
- Content package (`packages/content`, lane I) is still a placeholder, so shell i18n only carries chrome strings (nav labels, settings). Result-card guidance copy lives in D2's own `features/scan/lib/content.ts` as a stand-in - see D2 Handoff for the swap-over plan.
- `App.tsx`/`App.test.tsx` (T00 scaffold placeholders) were replaced by `app/AppRoot.tsx`/`app/AppRoot.test.tsx`; `main.tsx` now bootstraps theme CSS, i18n, text size and MSW before rendering.
- Used `useRoutes()` with a flat `RouteObject[]` (static routes + `...featureRoutes`) instead of nested JSX `<Route>` elements, so a lane's route entry can itself be a parent route with `children` (D2's `/scan/*` needs this for its shared `ScanFlowProvider`) without D1 having to special-case it.
**Contract change requests:**
- none from D1 itself (see D2's request below, which affects `CheckRequestSchema`).
**Learning log entries added:** yes
