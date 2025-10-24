# TrackPay Technical Debt - Consolidated Action Plan
**Created**: 2025-10-23
**Authors**: Codex Investigation + Claude Code Analysis
**Status**: ✅ APPROVED - Ready for Execution

---

## Executive Summary

This plan consolidates findings from:
1. **Codex Investigation** (`20250212_alerts_data_architecture.md`)
2. **Claude Code Review** (`claude-review-response.md`)
3. **Product Owner Decisions** (React Query + Incremental Feedback + Service-layer scoping)

### Approved Strategic Decisions
- ✅ **Data Access Pattern**: React Query + Service Facades
- ✅ **Feedback System**: Incremental rollout (high-traffic flows first)
- ✅ **Service-Layer Filtering**: YES - enforce provider/client scoping (defense-in-depth)

---

## Priority Actions (From Codex)

1. **Tighten Supabase queries** - Scope by provider/client IDs to prevent cross-tenant data leaks
2. **Cache provider resolution** - Eliminate 3 queries per operation via AuthContext
3. **Standardize feedback UX** - Replace scattered Alert.alert with unified pattern
4. **Fix relationship lookups** - Resolve auth ID → profile ID mapping correctly
5. **Simplify data layer** - Single source of truth (React Query), remove hybrid storage remnants

---

## Phase 1: Security & Performance (Week 1) 🔴 CRITICAL

**Goal**: Eliminate cross-tenant security risks, reduce query overhead by 60%+

### P1.1 Cache Provider ID in AuthContext ⚡ CRITICAL

**Problem** (Codex + Claude):
- `getCurrentProviderId` runs **3 queries on EVERY data operation** (N+1 problem)
- Unsafe fallback to "first provider" if auth mapping fails (cross-tenant data leak)

**Files**:
- `ios-app/src/contexts/AuthContext.tsx`
- `ios-app/src/services/directSupabase.ts:151-181`

**Implementation**:
```typescript
// AuthContext.tsx - Add to state
interface AuthContextType {
  user: User | null;
  providerId: string | null; // ✅ NEW: Cached after login
  clientId: string | null;   // ✅ NEW: For client users
  // ... existing fields
}

// Hydrate on login/session restore
useEffect(() => {
  if (user && user.role === 'provider') {
    const pid = await resolveProviderId(user.auth_user_id);
    setProviderId(pid);
  }
}, [user]);

// directSupabase.ts - REMOVE unsafe fallback
async function resolveProviderId(authUserId: string): Promise<string> {
  const { data } = await supabase
    .from('trackpay_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('role', 'provider')
    .single();

  if (!data) {
    // ✅ THROW ERROR - no silent fallback to "first provider"
    throw new Error('Provider profile not found - auth mapping failed');
  }

  return data.id;
}
```

**Changes**:
- [ ] Add `providerId`, `clientId` to AuthContext state
- [ ] Create `resolveProviderId()`, `resolveClientId()` (throw on failure)
- [ ] Populate on login/session restore
- [ ] Update all service methods to accept `providerId` parameter
- [ ] Remove unsafe fallback logic (line 181)
- [ ] Add instrumentation (Codex recommendation: surface misconfigurations in QA)

**Success Metrics** (Claude):
- Query count reduced from 10-15 → 3-5 per screen
- Zero unsafe fallbacks (audit logs confirm)

---

### P1.2 Enforce Service-Layer Data Scoping ⚡ CRITICAL

**Problem** (Codex + Claude):
- Queries fetch ALL records, rely solely on RLS
- Exposes cross-tenant data if RLS policies fail or loosen

**Files**: `ios-app/src/services/directSupabase.ts`

**Methods to Fix**:

#### A) `getSessions` (Line ~321)
```typescript
// ❌ BEFORE: No provider filter
export async function getSessions(): Promise<Session[]> {
  const { data } = await supabase
    .from('trackpay_sessions')
    .select('*');
  return data || [];
}

// ✅ AFTER: Explicit scoping (defense-in-depth)
export async function getSessions(providerId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('trackpay_sessions')
    .select('*')
    .eq('provider_id', providerId); // Service-layer filter

  if (error) throw error;
  return data || [];
}
```

#### B) `getActivities` (Line ~818)
```typescript
// ❌ BEFORE: Returns all rows
export async function getActivities(): Promise<Activity[]> {
  const { data } = await supabase
    .from('trackpay_activities')
    .select('*');
  return data || [];
}

// ✅ AFTER: Scope by provider
export async function getActivities(providerId: string): Promise<Activity[]> {
  const { data } = await supabase
    .from('trackpay_activities')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  return data || [];
}
```

#### C) `getClientSessionsForProvider` (storageService.ts:309)
```typescript
// ❌ BEFORE: Fetch all, filter in JS
export async function getClientSessionsForProvider(
  providerId: string,
  clientId: string
): Promise<Session[]> {
  const sessions = await getSessions(); // Gets EVERYTHING
  return sessions.filter(
    s => s.provider_id === providerId && s.client_id === clientId
  );
}

// ✅ AFTER: Filter in database
export async function getClientSessionsForProvider(
  providerId: string,
  clientId: string
): Promise<Session[]> {
  const { data } = await supabase
    .from('trackpay_sessions')
    .select('*')
    .eq('provider_id', providerId)
    .eq('client_id', clientId);
  return data || [];
}
```

**Changes**:
- [ ] Add provider/client ID parameters to all query methods
- [ ] Add `.eq('provider_id', ...)` filters to all queries
- [ ] Remove in-memory filtering (do it in SQL)
- [ ] Update all callers to pass scoping IDs
- [ ] Add unit tests to prevent regressions (Codex recommendation)

**Success Metrics** (Claude):
- Cross-tenant access prevented even with RLS disabled
- Query payload sizes reduced 10x

---

### P1.3 Fix Relationship Lookup Logic ⚡ CRITICAL

**Problem** (Codex + Claude):
- `getServiceProviders` may compare wrong ID types (auth.uid vs trackpay_users.id)
- Client views may not load correctly

**Files**: `ios-app/src/services/directSupabase.ts:1216`

**Current Issue**:
```typescript
export async function getServiceProviders(userId: string) {
  const { data } = await supabase
    .from('trackpay_relationships')
    .select('*, provider:trackpay_users!provider_id(*)')
    .eq('client_id', userId); // ❓ What is userId?
  return data || [];
}
```

**Fix**:
```typescript
// ✅ Resolve client profile ID first
export async function getServiceProviders(authUserId: string): Promise<Provider[]> {
  // Step 1: Map auth ID to profile ID
  const { data: client } = await supabase
    .from('trackpay_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .eq('role', 'client')
    .single();

  if (!client) {
    throw new Error('Client profile not found');
  }

  // Step 2: Lookup relationships
  const { data } = await supabase
    .from('trackpay_relationships')
    .select('*, provider:trackpay_users!provider_id(*)')
    .eq('client_id', client.id);

  return data?.map(r => r.provider) || [];
}
```

**Changes**:
- [ ] Investigate caller context (what is `userId`?)
- [ ] Add auth-to-profile mapping
- [ ] Add guard rails for mismatched IDs (Codex recommendation)
- [ ] Test with real client account (athmash247@gmail.com)

**Success Metrics** (Claude):
- ServiceProviderListScreen loads correctly for clients

---

### Phase 1 Exit Criteria (Codex)

✅ **All security tickets merged**
✅ **Regression tests green**
✅ **Observability alerts configured** for provider cache misses
✅ **Cross-tenant access prevented** (security audit passes)

**Deliverable**: PR with Phase 1 changes + test report

---

## Phase 2: UX Consistency (Week 2) 🟡 HIGH

**Goal**: Replace scattered Alert.alert with unified feedback system

### P2.1 Shared Feedback Primitives

**Problem** (Codex):
- Success toasts, error alerts, confirmation sheets are inconsistent
- Flows interrupt custom modals with native alerts
- No centralized error tracking or analytics

**Decision** (Product Owner):
- Incremental rollout starting with high-traffic flows

**Implementation** (Codex + Claude patterns):

```typescript
// FeedbackContext.tsx
interface FeedbackContextType {
  toast: (message: string, type?: 'success' | 'error') => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (title: string, message: string) => void;
  withLoader: <T>(fn: () => Promise<T>, message?: string) => Promise<T>;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  destructive?: boolean;
}

// Usage
const { toast, confirm } = useFeedback();

// Success feedback
toast(t('client.addSuccess'), 'success'); // 3-4s auto-dismiss

// Confirmation
const confirmed = await confirm({
  title: t('client.deleteTitle'),
  message: t('client.deleteWarning'),
  destructive: true
});

// Error with analytics (Codex requirement)
toast(t('client.deleteFailed'), 'error');
// Internally: emit to Sentry/PostHog
```

**Components** (Claude):
1. `FeedbackContext.tsx` - State management
2. `ConfirmationModal.tsx` - iOS-native confirmation dialog
3. `SuccessToast.tsx` - Green toast (auto-dismiss 3s)
4. `ErrorToast.tsx` - Red toast with optional "Report" CTA (Codex)

**Changes**:
- [ ] Create FeedbackContext + Provider
- [ ] Build confirmation modal component
- [ ] Build toast components
- [ ] Wrap App.tsx with FeedbackProvider
- [ ] Add analytics instrumentation (Codex: emit events for all confirmations)

---

### P2.2 High-Traffic Flow Migration (Incremental)

**Migration Waves** (Codex):

| Wave | Screens | Priority | Files |
|------|---------|----------|-------|
| 1 | Client creation/management | CRITICAL | AddClientModal, ClientListScreen, ClientProfileScreen |
| 2 | Payment flows | HIGH | SessionTrackingScreen, MarkAsPaidModal |
| 3 | Invite flows | MEDIUM | InviteModal, InviteClientModal |
| 4 | Auth flows | LOW | LoginScreen, RegisterScreen, ForgotPasswordScreen |

**Wave 1 - Client Management** (Claude):
- `AddClientModal.tsx:45, 105` - Validation + success
- `ClientListScreen.tsx:224` - Quick add errors
- `ClientProfileScreen.tsx:205, 240` - Delete confirmation

**Migration Pattern**:
```typescript
// ❌ BEFORE
Alert.alert('Error', 'Please enter a name');

// ✅ AFTER
const { toast } = useFeedback();
toast(t('validation.nameRequired'), 'error');
```

**Changes**:
- [ ] Migrate Wave 1 (client flows)
- [ ] Migrate Wave 2 (payment flows)
- [ ] Migrate Wave 3 (invite flows)
- [ ] Add i18n keys for all feedback messages
- [ ] Add ESLint rule to prevent future Alert.alert usage
- [ ] Demo new UX after Wave 1 (Codex: gather feedback before continuing)

---

### Phase 2 Exit Criteria (Codex)

✅ **Priority screens free of raw Alert.alert**
✅ **Analytics events emitted** for confirmations
✅ **Accessibility review signed off** (VoiceOver testing)

**Deliverable**: PR with Phase 2 changes + screenshots + accessibility audit

---

## Phase 3: Architecture Alignment (Weeks 3-4) 🟢 MEDIUM

**Goal**: Single source of truth for data access (React Query + Service Facades)

### P3.1 React Query Foundation

**Decision** (Product Owner):
- React Query + Service Facades as canonical pattern

**Implementation** (Codex + Claude):

#### Step 1: Install Dependencies
```bash
cd ios-app
npm install @tanstack/react-query
```

**Changes**:
- [ ] Install React Query
- [ ] Create `src/services/queryClient.ts` (Codex)
- [ ] Wrap App.tsx with QueryClientProvider

```typescript
// services/queryClient.ts (Codex pattern)
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30s cache
      cacheTime: 300000, // 5min (Codex: monitor memory usage)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

---

#### Step 2: Service Facades (Claude structure)

**New Directory Structure**:
```
ios-app/src/
├── api/                    # ✅ NEW: Service facades
│   ├── clients.ts
│   ├── sessions.ts
│   ├── payments.ts
│   └── activities.ts
├── hooks/                  # ✅ NEW: React Query hooks
│   ├── useClients.ts
│   ├── useSessions.ts
│   └── useActivities.ts
```

**Example: Service Facade** (`api/sessions.ts`):
```typescript
import { supabase } from '@/services/supabase';
import type { Session, SessionInput } from '@/types';

export const sessionApi = {
  getSessions: async (providerId: string): Promise<Session[]> => {
    const { data, error } = await supabase
      .from('trackpay_sessions')
      .select('*')
      .eq('provider_id', providerId) // Scoped query (Phase 1)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  createSession: async (input: SessionInput): Promise<Session> => {
    const { data, error } = await supabase
      .from('trackpay_sessions')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
```

**Example: React Query Hook** (`hooks/useSessions.ts`):
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '@/api/sessions';
import { useFeedback } from '@/contexts/FeedbackContext';

export function useSessions(providerId: string) {
  return useQuery({
    queryKey: ['sessions', providerId],
    queryFn: () => sessionApi.getSessions(providerId),
    enabled: !!providerId, // Codex: guard when provider ID missing
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const { toast } = useFeedback();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: sessionApi.createSession,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', session.provider_id] });
      toast(t('session.createSuccess'), 'success');
    },
    onError: (error) => {
      toast(t('session.createFailed'), 'error');
      // Codex: emit to Sentry/PostHog
    },
  });
}
```

**Example: Component Usage**:
```typescript
// ✅ AFTER: React Query
const { providerId } = useAuth();
const { data: sessions, isLoading } = useSessions(providerId);
const createSession = useCreateSession();

if (isLoading) return <LoadingSpinner />;

return (
  <FlatList
    data={sessions}
    renderItem={({ item }) => <SessionCard session={item} />}
  />
);
```

---

### P3.2 Migration Execution (Incremental)

**Migration Waves** (Codex):

| Wave | Screens | Notes |
|------|---------|-------|
| 1 | ClientList, ClientHistory, StyledSessionTracking | High-traffic (Codex priority) |
| 2 | Auth flows | Login/register mutations |
| 3 | Activity feed, Provider summary | Scoped queries |
| 4 | Settings, Invite screens | Final sweep |

**Process** (Codex):
1. Replace local state fetching with React Query
2. Swap raw Alert.alert for useFeedback
3. Add regression tests (React Testing Library or Detox)

**Changes**:
- [ ] Create service facades for all domains
- [ ] Create React Query hooks
- [ ] Migrate Wave 1 screens (read-only)
- [ ] Migrate Wave 2 screens (simple mutations)
- [ ] Migrate Wave 3 screens (complex mutations)
- [ ] Add lint rule: ensure query keys include provider/client IDs (Codex)

---

### P3.3 Deprecation Cleanup (Codex)

**Remove Legacy Code**:
- [ ] Delete `useClients` hook (Codex: after consumers migrate)
- [ ] Delete `directSupabase.ts` (no longer used)
- [ ] Delete `storageService.ts` (no longer used)
- [ ] Remove hybrid storage remnants (Codex: `initializeWithSeedData`, sync queue stubs)
- [ ] Update CLAUDE.md with new patterns

**Documentation** (Codex):
- [ ] Integration guide for React Query patterns
- [ ] Developer onboarding updated
- [ ] Runbook for cache issues / feedback provider failure

---

### Phase 3 Exit Criteria (Codex)

✅ **Core dashboards using React Query**
✅ **Service layer documented**
✅ **Legacy API surface marked deprecated**
✅ **Consistent scoping (lint rules enforced)**

**Deliverable**: PR with Phase 3 changes + migration playbook + updated docs

---

## Phase 4: Observability & Cleanup (Ongoing) 🔵 LOW

**Goals** (Codex):
- Monitor production data access patterns
- Surface errors/misconfigurations early

**Tasks**:
- [ ] Create dashboards for Supabase policy denials vs service-layer filters (Codex)
- [ ] Document recovery steps if provider cache fails (Codex)
- [ ] Optimize invite code uniqueness check (Claude: use insert-retry pattern)
- [ ] Remove payload trimming tasks (Claude: negligible wins)
- [ ] Guard debug health check behind `__DEV__` (Codex)

---

## Ownership & Tracking (Codex)

**Roles**:
- **Security lead**: Own Phase 1 completion
- **UX lead**: Own feedback system foundation
- **Frontend lead**: Coordinate React Query rollout
- **Project tracker**: Update `issues.md` every Friday

**Tracking**:
- [ ] File individual tickets (one per bullet) in `issues.md`
- [ ] Create parent epic for this plan
- [ ] Schedule kickoff to confirm resourcing
- [ ] Block new features until Phase 1 complete (Codex: secure data access required)

---

## Success Metrics (Consolidated)

### Phase 1:
- [x] Query count reduced 60%+ (10-15 → 3-5 per screen)
- [x] Cross-tenant access prevented (security audit passes)
- [x] Zero unsafe provider fallbacks
- [x] All screens load <500ms

### Phase 2:
- [x] Zero raw Alert.alert calls (grep + ESLint enforcement)
- [x] 100% i18n coverage for feedback
- [x] Analytics events emitted for all confirmations
- [x] Accessibility audit passes

### Phase 3:
- [x] All screens use React Query (no direct Supabase)
- [x] Single data access pattern enforced
- [x] Caching works (navigate away/back, no refetch)
- [x] Optimistic updates feel instant

---

## Risk Mitigation (Codex + Claude)

### Phase 1 Risks:
- **Risk**: Breaking existing screens during provider ID refactor
- **Mitigation**: Incremental changes, test after each method

### Phase 2 Risks:
- **Risk**: Missing Alert.alert during migration
- **Mitigation**: Global grep before/after, ESLint rule

### Phase 3 Risks:
- **Risk**: Large query cache memory usage (Codex)
- **Mitigation**: Monitor memory, set sane cacheTime/staleTime
- **Risk**: Inconsistent scoping (Codex)
- **Mitigation**: Lint rule + unit tests for query keys

---

## Next Steps

**Immediate Actions**:
1. ✅ Review and approve this consolidated plan
2. ⏳ Create feature branch: `git checkout -b tech-debt/phase-1-security`
3. ⏳ File tickets in `issues.md` (one per task)
4. ⏳ Schedule kickoff (confirm resourcing)
5. ⏳ Begin Phase 1 implementation

**Communication**:
- Demo Wave 1 feedback UX before continuing (Codex)
- Update `issues.md` every Friday with status
- Add migration tracking table (Codex: screen, status, PR link)

---

## Consolidated References

**Codex Documents**:
- `docs/codex/investigations/20250212_alerts_data_architecture.md` - Original findings
- `docs/codex/react-query-and-feedback-rollout.md` - Implementation guide
- `docs/codex/security-ux-remediation-plan.md` - Phased plan

**Claude Documents**:
- `docs/codex/claude-review-response.md` - Validation + prioritization

**Approvals**:
- Product Owner: React Query (A), Incremental Feedback (C), Service-layer scoping (YES)

---

**Status**: 📋 APPROVED - Ready to execute on your command

**Authors**: Codex (Investigation) + Claude Code (Analysis) + Product Owner (Decisions)
**Date**: 2025-10-23
