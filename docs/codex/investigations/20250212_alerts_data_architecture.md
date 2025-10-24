# TrackPay UI & Data Investigation – 2025-02-12

## 1. Native Alerts & Confirmation Dialogues
- **Add Client (modal flow)** – Validation and success feedback rely on `Alert.alert` despite being inside a custom modal (`ios-app/src/components/AddClientModal.tsx:45`, `ios-app/src/components/AddClientModal.tsx:105`).
- **Quick Add Client (legacy inline form)** – Error handling for name/rate still uses alerts in the list screen (`ios-app/src/screens/ClientListScreen.tsx:224`).
- **Request Payment** – Provider session screens show alerts for “no unpaid sessions”, success, and failure (`ios-app/src/screens/SessionTrackingScreen.tsx:132`, `ios-app/src/screens/SessionTrackingScreen.tsx:137`; `ios-app/src/screens/StyledSessionTrackingScreen.tsx:292`).
- **Mark as Paid** – The modal mixes custom UI with alerts for validation errors and completion (`ios-app/src/components/MarkAsPaidModal.tsx:117`, `ios-app/src/components/MarkAsPaidModal.tsx:244`).
- **Client Deletion** – Confirmation uses `ActionSheetIOS` on iOS and alerts on other platforms, plus blockers for unpaid work (`ios-app/src/screens/ClientProfileScreen.tsx:205`, `ios-app/src/screens/ClientProfileScreen.tsx:240`).
- **Invite sharing/copy actions** – Alerts surface “Copied!” confirmations in invite components (`ios-app/src/components/InviteModal.tsx:39`, `ios-app/src/components/InviteClientModal.tsx:135`).
- **Auth flows (login/register/forgot password)** – Alerts remain the primary error handling (`ios-app/src/screens/LoginScreen.tsx:72`, `ios-app/src/screens/RegisterScreen.tsx:187`, `ios-app/src/screens/ForgotPasswordScreen.tsx:34`).
- **Global errors** – App initialization and settings use alerts for configuration issues (`ios-app/App.tsx:30`, `ios-app/src/screens/SettingsScreen.tsx:122`).

_Observation_: Success toasts, error alerts, and confirmation sheets are inconsistent. Flows like client creation and payment requests interrupt custom modals with native alerts. A shared feedback layer (unified toast/confirmation components) would improve continuity.

## 2. Database Query & Batching Opportunities
- **Provider ID lookups** – `getCurrentProviderId` runs up to three queries every time a storage call executes (`ios-app/src/services/directSupabase.ts:151`). Cache/memoise per session or pull provider ID from the auth context.
- **Session fetching** – `getSessions` loads every session with no provider filter (`ios-app/src/services/directSupabase.ts:321`); `getClientSessionsForProvider` fetches that list then filters in JS (`ios-app/src/services/storageService.ts:309`). Add `eq('provider_id', …)` / `eq('client_id', …)` to the Supabase query.
- **Activities feed** – `getActivities` returns all rows (`ios-app/src/services/directSupabase.ts:818`). Scope by provider or rely on row-level security; otherwise clients may fetch unrelated teams.
- **Payment workflows** – `requestPayment` and `markPaid` update sessions then re-query them to compute totals (`ios-app/src/services/directSupabase.ts:618`, `ios-app/src/services/directSupabase.ts:706`). Either compute from the in-memory sessions provided by the caller or restrict the follow-up select to required fields once.
- **Invite code uniqueness** – `createInviteForClient` performs a select in a loop until it finds a free code (`ios-app/src/services/directSupabase.ts:870`). Let the unique constraint handle this and retry on conflict, halving round trips.
- **Client summaries** – Batching already exists, but the select pulls `*`. Trim to only `status`, `amount_due`, `duration_minutes`, `crew_size`, etc. to reduce payload (`ios-app/src/services/directSupabase.ts:100`). 
- **Debug health check** – `healthCheck` triggers full client/session/activity fetches whenever invoked (`ios-app/src/services/storageService.ts:446`). Swap for `select('id', { head: true, count: 'exact' })` or guard behind `__DEV__`.

## 3. Architectural Questions / Misalignments
- **Data scoping vs. RLS** – Should service-layer methods enforce provider/client filters instead of trusting Supabase policies? Current implementations expose cross-tenant data if policies loosen.
- **Fallback provider selection** – `getCurrentProviderId` defaults to the first provider if the authenticated user cannot be mapped (`ios-app/src/services/directSupabase.ts:181`). This is unsafe in production; confirm the intended behaviour.
- **Relationship lookups for clients** – `getServiceProviders` uses `eq('client_id', user.id)` (`ios-app/src/services/directSupabase.ts:1216`), but relationship rows store `trackpay_users.id`. Should we resolve the client profile first or align IDs?
- **Multiple data-access patterns** – Screens mix direct Supabase calls, storageService helpers, and custom hooks. Do we plan to centralise on one data layer (e.g., React Query + service facades) to avoid duplication?
- **Hybrid storage remnants** – `storageService` still exports no-op sync/seed helpers (`ios-app/src/services/storageService.ts:400`). Decide whether to remove or reintroduce hybrid storage.
- **Feedback components** – With alerts/toasts/modals scattered, align on a shared UX pattern before layering invite growth loops and more marketing flows.

---

Prepared: 2025-02-12 by Codex for TrackPay maintainers.
