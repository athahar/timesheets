# TrackPay Remediation Plan (Security & Architecture)

## Context
Following the joint Codex × Claude investigation, we agreed on three strategic decisions:
- Adopt React Query with service facades as the canonical data-access pattern.
- Roll out a unified feedback system incrementally, starting with high-traffic flows.
- Enforce provider/client scoping in the service layer in addition to Supabase RLS.

This document translates those decisions into a phased plan with owners and checkpoints.

## Phase 1 – Security & Data Integrity (Week 1)
- **P1.1 Eliminate provider fallback** (`src/services/directSupabase.ts:181`)
  - Replace “first provider” fallback with an explicit failure.
  - Add instrumentation to surface misconfigurations in QA.
- **P1.2 Cache provider identity**
  - Hydrate provider ID once via `AuthContext` after login.
  - Memoise inside `directSupabase` as a defensive backup.
- **P1.3 Enforce service-layer scoping**
  - Update session/activity/payment fetches to require provider/client filters.
  - Add unit coverage to prevent regressions.
- **P1.4 Fix relationship lookups**
  - Ensure client-facing queries join through `trackpay_users.id`.
  - Add guard rails for mismatched auth IDs.

_Exit criteria:_ all security tickets merged, regression tests green, and observability alerts configured for unexpected provider cache misses.

## Phase 2 – UX Consistency (Week 2)
- **P2.1 Shared feedback primitives**
  - Implement `useFeedback()` hook exposing toast, confirm, alert wrappers.
  - Backed by a single provider rendered near the root navigator.
- **P2.2 High-traffic flow migration**
  - Add Client, Mark as Paid, Payment Request, Invite Copy use the new system.
  - Deprecate inline `Alert.alert` usage in these components.

_Exit criteria:_ priority screens free of raw `Alert.alert`, analytics events emitted for confirmations, accessibility review signed off.

## Phase 3 – Architecture Alignment (Weeks 3–4)
- **P3.1 React Query integration guide**
  - Provide patterns for list/detail screens, invalidation rules, optimistic updates.
- **P3.2 Service facade hardening**
  - Ensure every screen imports data operations via `storageService` (or wrapper).
  - Remove hybrid-storage legacy helpers (`initializeWithSeedData`, sync queue stubs).
- **P3.3 Migration execution**
  - Convert client list/history/session tracking modules to React Query.
  - Stage remaining screens in a migration backlog.

_Exit criteria:_ core dashboards using React Query, service layer documented, legacy API surface marked deprecated.

## Phase 4 – Cleanup & Observability (Ongoing)
- Remove redundant payload trimming tasks that offer negligible wins.
- Create dashboards for Supabase policy denials vs. service-layer filters.
- Document recovery steps if provider cache or feedback provider fails.

## Ownership & Tracking
- Security lead: `_assign` → ensure Phase 1 completion.
- UX lead: `_assign` → own feedback system foundation.
- Frontend lead: `_assign` → coordinate React Query rollout.
- Project tracker: add these phases to `issues.md` with status updates each Friday.

## Next Steps
1. File individual tickets (one per bullet) with this plan as parent epic.
2. Schedule a brief kickoff to confirm resourcing.
3. Begin Phase 1 implementation immediately; block new feature work that depends on secure data access until completed.

