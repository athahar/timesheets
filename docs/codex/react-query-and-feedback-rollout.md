# React Query & Feedback System Rollout Guide

## Goals
1. Standardise data fetching/caching on React Query backed by service facades.
2. Replace ad-hoc `Alert.alert` calls with a consistent feedback layer (toasts, confirmations, blocking alerts).

## Guiding Principles
- **Single source of truth:** service facades remain responsible for Supabase interactions; React Query handles caching and mutations.
- **Incremental migration:** adopt per-screen to avoid blowing up PR size.
- **Instrumentation-first:** every new feedback action should emit analytics + surface errors to Sentry/PostHog.

## Implementation Steps

### 1. Foundation (Sprint 0)
- Add React Query dependencies and wrap the app in `QueryClientProvider`.
- Create `src/services/queryClient.ts` exporting a configured `QueryClient`.
- Introduce `FeedbackProvider`:
  - Provides `useFeedback()` hook returning `toast`, `confirm`, `alert`, `withLoader`.
  - Backed by a single screen-level portal to render UI components.

### 2. Data Layer Patterns
- **Queries**
  - `useQuery(['clients'], fetchClients)` where `fetchClients` delegates to `storageService`.
  - Include `enabled` guards when provider ID is missing.
- **Mutations**
  - Wrap service calls (e.g., `addClient`, `requestPayment`) with `useMutation`.
  - Use `onSuccess` to invalidate relevant queries (`queryClient.invalidateQueries(['clients'])`).
  - Use optimistic updates only after the base integration is stable.
- **Error Handling**
  - Route `mutation.error` and `query.error` through `useFeedback().alert` for user visibility and analytics.

### 3. Migration Waves (Incremental)
| Wave | Screens / Modules | Notes |
| ---- | ----------------- | ----- |
| 1 | ClientList, ClientHistory, StyledSessionTracking | High-traffic & already under investigation. |
| 2 | Auth flows (login/register/forgot) | Simplify to use React Query mutations for Supabase auth calls. |
| 3 | Provider summary + activity feed | Ensure scoped queries apply provider filters. |
| 4 | Remaining settings/invite screens | Final sweep; remove legacy hooks. |

For each wave:
1. Replace local state fetching with React Query.
2. Swap raw `Alert.alert` usage for `useFeedback()` calls (toasts for success, confirmation modal for destructive actions).
3. Add regression tests (React Testing Library or Detox) to ensure new UX flows behave as expected.

### 4. Deprecation Cleanup
- Remove `useClients` hook once its consumers migrate.
- Delete modal-specific alert wrappers that are no longer needed.
- Update documentation (`ENVIRONMENT_GUIDE.md`, developer onboarding) to highlight the new patterns.

## Feedback UX Guidelines
- **Success** → toast (non-blocking, 3–4s).
- **Errors** → modal alert with optional “Report” CTA.
- **Confirmations** → single reusable component with customizable title/description and analytics tracking.
- **Loading states** → `withLoader` helper that wraps async operations and emits spinner state.

## Tracking & Communication
- Add a table in `issues.md` capturing each screen, migration status, and PR link.
- Demo the new feedback experience after Wave 1 to gather UX feedback before continuing.

## Risks & Mitigations
- **Large query cache** → monitor memory usage; set `cacheTime`/`staleTime` defaults to sane values (e.g., 5 min/30 sec).
- **Inconsistent scoping** → lint rule / unit tests to ensure React Query keys include provider/client IDs.
- **Regression surface** → roll out by feature flag if necessary (e.g., toggling new feedback provider).

## Deliverables
- PR 1: React Query/Feedback scaffolding + provider wiring.
- PR 2+: One PR per migration wave (keep under 500LOC diff).
- Updated runbook describing debugging steps for cache issues or feedback provider failure.

