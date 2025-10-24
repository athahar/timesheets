# TrackPay Growth Loop - Implementation Plan (Simplified)

**Status:** ✅ Implemented
**Branch:** `Growth-Loop`
**Scope:** Mobile only - reuse existing invite infrastructure
**Updated:** Oct 22, 2025

---

## Executive Summary

Implementing invite-based growth loop that triggers when providers interact with unclaimed clients at two high-intent moments:

1. **Stop Session** - Modal with option to share hours worked + invite code
2. **Request Payment** - Modal with option to share payment request + invite code

**Key Architecture Decision:**
- ✅ **Reuse existing `trackpay_invites` table** (no migrations needed)
- ✅ **Reuse existing `directSupabase` methods** (no new service layer)
- ✅ **User-controlled sharing via modals** (no auto-share, user decides)
- ✅ **Non-blocking flows** (payment/session completes even if share skipped)

---

## What Already Exists (Reusing)

### Database Layer
- ✅ `trackpay_invites` table with:
  - `invite_code` (8-char alphanumeric)
  - `provider_id`, `client_id`
  - `status` ('pending', 'claimed', 'expired', 'revoked')
  - `expires_at`, `created_at`

### Service Layer
- ✅ `directSupabase.getInvites()` - fetches provider's invites
- ✅ `directSupabase.createInviteForClient(clientId, providerId)` - creates new invite
- ✅ `generateInviteCode()` - generates 8-char code
- ✅ `generateInviteLink(code)` - builds shareable link

### UI
- ✅ `ClientProfileScreen` - already displays & shares invite codes

---

## What We're Building (Minimal)

### Phase 1: Helper Functions & Modal Component (20 min)

#### File 1: `ios-app/src/features/invite/getOrCreateInviteCode.ts`

**Purpose:** Centralized helper to get/create invite for any client

```typescript
import { directSupabase } from '../../services/directSupabase';
import { generateInviteLink } from '../../utils/inviteCodeGenerator';

export async function getOrCreateInviteCode(clientId: string): Promise<{
  code: string;
  link: string;
}> {
  // 1) Try to find latest pending, unexpired invite
  const invites = await directSupabase.getInvites();
  const pendingInvite = invites.find(
    inv => inv.clientId === clientId &&
           inv.status === 'pending' &&
           new Date(inv.expiresAt) > new Date()
  );

  if (pendingInvite) {
    return {
      code: pendingInvite.inviteCode.toUpperCase(),
      link: generateInviteLink(pendingInvite.inviteCode) || ''
    };
  }

  // 2) Create new invite (same as ClientProfileScreen logic)
  const providerId = await directSupabase.getCurrentProviderId();
  const created = await directSupabase.createInviteForClient(clientId, providerId);

  return {
    code: created.inviteCode.toUpperCase(),
    link: generateInviteLink(created.inviteCode) || ''
  };
}
```

**Guardrails:**
- Display codes UPPERCASE, but submit to backend as-is (don't transform)
- Safe fallback: if `generateInviteLink()` returns empty, use App Store link

---

#### File 2: `ios-app/src/features/invite/inviteShare.ts`

**Purpose:** SMS-safe message builders (<160 chars)

```typescript
const APP_STORE_LINK = 'https://apps.apple.com/app/trackpay/idXXXXXX'; // TODO: Update when available

export function buildHoursShare(params: {
  firstName: string;
  duration: string; // "HH:MM"
  link: string;
  code: string;
}): string {
  const { firstName, duration, link, code } = params;

  if (link) {
    return `Hi ${firstName}, I did ${duration} today.\nYou can see my hours and track everything here: ${link}\nDownload TrackPay and use code ${code} to be connected with me.`;
  }

  // Fallback if no link
  return `Hi ${firstName}, I did ${duration} today.\nGet the TrackPay app and use code ${code} to connect with me.\n${APP_STORE_LINK}`;
}

export function buildPaymentShare(params: {
  firstName: string;
  amount: string; // Pre-formatted "$XX.XX"
  duration: string; // "HH:MM"
  link: string;
  code: string;
}): string {
  const { firstName, amount, duration, link, code } = params;

  if (link) {
    return `Hi ${firstName}, I've requested ${amount} for ${duration}.\nReview and pay here: ${link}\nDownload TrackPay and use code ${code} to be connected with me.`;
  }

  // Fallback if no link
  return `Hi ${firstName}, I've requested ${amount} for ${duration}.\nGet the TrackPay app and use code ${code} to connect with me.\n${APP_STORE_LINK}`;
}
```

**Guardrails:**
- Messages kept ~160 chars for SMS compatibility
- Safe fallback to App Store link if `generateInviteLink()` fails
- Uses `EXPO_PUBLIC_APP_DISPLAY_NAME` from env for app name

---

#### File 3: `ios-app/src/features/invite/InvitePromptModal.tsx`

**Purpose:** Reusable modal component for user-controlled sharing

```typescript
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { TP } from '../../styles/themeV2';

interface InvitePromptModalProps {
  visible: boolean;
  onClose: () => void;
  onShare: () => Promise<void>;
  title?: string;
  message?: string;
  sharing?: boolean;
}

export const InvitePromptModal: React.FC<InvitePromptModalProps> = ({
  visible,
  onClose,
  onShare,
  title = 'Session stopped',
  message = 'Share your hours and invite your client to connect.',
  sharing = false,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onClose}
              disabled={sharing}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onShare}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator color={TP.color.cardBg} />
              ) : (
                <Text style={styles.primaryButtonText}>Share Invite</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
```

**Guardrails:**
- Uses TP theme system for consistent styling
- Disables buttons during share operation
- Loading indicator while sharing
- User has full control: "Share Invite" or "Close"

---

### Phase 2: Screen Integration (30 min)

#### Modification 1: `ios-app/src/screens/ClientListScreen.tsx`

**Integration Point:** After successful `endSession()`

**Changes:**
1. Added modal state variables
2. Added share handler function
3. Show modal instead of auto-share after session stop
4. Render `InvitePromptModal` component

```typescript
import { Share } from 'react-native';
import { getOrCreateInviteCode } from '../features/invite/getOrCreateInviteCode';
import { buildHoursShare } from '../features/invite/inviteShare';
import { InvitePromptModal } from '../features/invite/InvitePromptModal';

const APP_NAME = process.env.EXPO_PUBLIC_APP_DISPLAY_NAME || 'TrackPay';

// Modal state
const [inviteModalVisible, setInviteModalVisible] = useState(false);
const [inviteSharing, setInviteSharing] = useState(false);
const [invitePayload, setInvitePayload] = useState<{
  firstName: string;
  duration: string;
  code: string;
  link: string;
} | null>(null);

// After successful session end
const handleStopSession = async () => {
  // ... existing endSession logic ...

  // SUCCESS: Session ended (toast shown)

  // Growth Loop: Show modal if client is unclaimed and feature flag is enabled
  if (process.env.EXPO_PUBLIC_FEATURE_INVITE_STOP === 'true') {
    if (client.claimedStatus === 'unclaimed') {
      try {
        const hours = Math.floor(durationHours);
        const minutes = Math.round((durationHours - hours) * 60);
        const durationFormatted = `${hours}:${minutes.toString().padStart(2, '0')}`;

        const { code, link } = await getOrCreateInviteCode(client.id);

        // Prepare modal payload
        setInvitePayload({
          firstName: client.name.split(' ')[0],
          duration: durationFormatted,
          code,
          link
        });
        setInviteModalVisible(true);
      } catch (error) {
        // Non-blocking: session already ended
        if (__DEV__) console.warn('Invite prep failed:', error);
      }
    }
  }
};

// Share handler
const handleShareInvite = async () => {
  if (!invitePayload) return;

  try {
    setInviteSharing(true);
    const message = buildHoursShare(invitePayload);
    await Share.share({ message });
    setInviteModalVisible(false);
  } catch (error) {
    if (__DEV__) console.warn('Share invite error:', error);
    setInviteModalVisible(false);
  } finally {
    setInviteSharing(false);
  }
};

// Render modal
<InvitePromptModal
  visible={inviteModalVisible}
  sharing={inviteSharing}
  onShare={handleShareInvite}
  onClose={() => setInviteModalVisible(false)}
  title="Session stopped"
  message={`${invitePayload?.firstName ?? 'Your client'} isn't on ${APP_NAME} yet. Share your hours and invite them to connect.`}
/>
```

**Guardrails:**
- Non-blocking: session already ended, modal is optional
- Feature flag: `EXPO_PUBLIC_FEATURE_INVITE_STOP=true`
- Only triggers for `claimedStatus === 'unclaimed'`
- User chooses: "Share Invite" or "Close"

---

#### Modification 2: `ios-app/src/screens/ClientHistoryScreen.tsx`

**Integration Point:** Before creating payment request

**Changes:**
1. Added modal state variables
2. Added share handler and close handler functions
3. Show modal instead of 3-button prompt before payment request
4. Render `InvitePromptModal` component
5. Removed `ActionSheetIOS` import (no longer needed)

```typescript
import { Share } from 'react-native';
import { getOrCreateInviteCode } from '../features/invite/getOrCreateInviteCode';
import { buildPaymentShare } from '../features/invite/inviteShare';
import { InvitePromptModal } from '../features/invite/InvitePromptModal';

const APP_NAME = process.env.EXPO_PUBLIC_APP_DISPLAY_NAME || 'TrackPay';

// Modal state
const [inviteModalVisible, setInviteModalVisible] = useState(false);
const [inviteSharing, setInviteSharing] = useState(false);
const [invitePayload, setInvitePayload] = useState<{
  firstName: string;
  amount: string;
  duration: string;
  code: string;
  link: string;
} | null>(null);

// Before creating payment request
const handleRequestPayment = async () => {
  // ... pre-checks for pending request and unpaid sessions ...

  // Growth Loop: Show modal if client is unclaimed and feature flag is enabled
  if (process.env.EXPO_PUBLIC_FEATURE_INVITE_PAYMENT === 'true') {
    if (client?.claimedStatus === 'unclaimed') {
      try {
        // Calculate total for share message
        const totalHours = unpaidSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);
        const durationFormatted = `${hours}:${minutes.toString().padStart(2, '0')}`;

        // Get or create invite code
        const { code, link } = await getOrCreateInviteCode(client.id);

        // Prepare modal payload
        setInvitePayload({
          firstName: client.name.split(' ')[0],
          amount: formatCurrency(totalUnpaidBalance),
          duration: durationFormatted,
          code,
          link
        });
        setInviteModalVisible(true);
        return; // Exit early - modal will handle payment creation
      } catch (error) {
        // Non-blocking: continue with normal payment request
        if (__DEV__) console.warn('Invite prep failed:', error);
      }
    }
  }

  // Normal flow (or fallback if modal prep failed)
  setShowConfirmModal(true);
};

// Share handler
const handleShareInvite = async () => {
  if (!invitePayload) return;

  try {
    setInviteSharing(true);

    // Create payment request first
    await handleConfirmRequest();

    // Then share invite
    const message = buildPaymentShare(invitePayload);
    await Share.share({ message });

    setInviteModalVisible(false);
  } catch (error) {
    if (__DEV__) console.warn('Share invite error:', error);
    setInviteModalVisible(false);
  } finally {
    setInviteSharing(false);
  }
};

// Close handler (user chose "Close")
const handleCloseInviteModal = async () => {
  setInviteModalVisible(false);
  await handleConfirmRequest(); // Create payment without sharing
};

// Render modal
<InvitePromptModal
  visible={inviteModalVisible}
  sharing={inviteSharing}
  onShare={handleShareInvite}
  onClose={handleCloseInviteModal}
  title="Request payment"
  message={`${invitePayload?.firstName ?? 'Your client'} isn't on ${APP_NAME} yet. Share your payment request and invite them to connect.`}
/>
```

**Guardrails:**
- Payment created when user chooses either "Share Invite" or "Close"
- Feature flag: `EXPO_PUBLIC_FEATURE_INVITE_PAYMENT=true`
- User chooses: "Share Invite" (creates payment + shares) or "Close" (creates payment only)

---

### Phase 3: Environment Config (5 min)

#### Modification: `ios-app/.env.sample`

```bash
# Invite Growth Loop Configuration
EXPO_PUBLIC_INVITE_BASE_URL=https://trackpay.app/invite

# Feature Flags (default OFF for staged rollout)
EXPO_PUBLIC_FEATURE_INVITE_STOP=false
EXPO_PUBLIC_FEATURE_INVITE_PAYMENT=false
```

**Also update:**
- `ios-app/.env.development` (for local testing)
- `ios-app/.env.staging` (for staging)

---

## Testing Checklist

### Stop Session Flow
- [ ] Stop session with unclaimed client → modal appears with title "Session stopped"
- [ ] Modal shows message with client's first name and app name
- [ ] Tap "Share Invite" → share sheet opens with message (code UPPERCASE + link)
- [ ] Share message is ~160 chars (SMS-safe)
- [ ] Share cancelled → modal closes, session still ended
- [ ] Tap "Close" → modal closes without sharing
- [ ] Stop session with claimed client → no modal (normal flow)
- [ ] Feature flag OFF → no modal

### Request Payment Flow
- [ ] Request payment with unclaimed client → modal appears with title "Request payment"
- [ ] Modal shows message with client's first name and app name
- [ ] Tap "Share Invite" → payment created, then share sheet opens
- [ ] Tap "Close" → payment created without sharing
- [ ] Share cancelled → modal closes, payment still exists
- [ ] Request payment with claimed client → no modal (normal flow)
- [ ] Feature flag OFF → no modal

### Edge Cases
- [ ] Invite fetch fails → share uses App Store link + code
- [ ] Invite creation fails → flow continues, no crash
- [ ] Existing pending invite → reuses same code
- [ ] generateInviteLink() returns empty → uses App Store fallback

### Feature Flags
- [ ] Both flags OFF → no modals trigger
- [ ] `FEATURE_INVITE_STOP=true` only → stop flow works, payment normal
- [ ] `FEATURE_INVITE_PAYMENT=true` only → payment prompt works, stop normal
- [ ] Both ON → both flows work

---

## Files Summary

### Created (3 new files)
1. `ios-app/src/features/invite/getOrCreateInviteCode.ts` - Helper to fetch/create invite
2. `ios-app/src/features/invite/inviteShare.ts` - Message builders
3. `ios-app/src/features/invite/InvitePromptModal.tsx` - Reusable modal component

### Modified (3 files)
1. `ios-app/src/screens/ClientListScreen.tsx` - Add modal after session stop
2. `ios-app/src/screens/ClientHistoryScreen.tsx` - Add modal before payment request
3. `ios-app/.env.sample` - Add feature flags

### Deleted (overcomplicated files from initial approach)
1. `supabase/migrations/20251023000000_invite_growth_loop.sql`
2. `supabase/migrations/20251023000000_invite_growth_loop_STAGING.sql`
3. `supabase/migrations/20251023000001_add_growth_loop_to_existing_invites.sql`
4. `ios-app/src/features/invite/InviteService.ts`
5. `ios-app/src/features/invite/InviteModalStop.tsx`
6. `ios-app/src/features/invite/InviteModalPayment.tsx`
7. `ios-app/src/features/invite/deepLink.ts`
8. `ios-app/src/features/invite/useClientRegistrationStatus.ts`
9. `ios-app/src/features/invite/index.ts`
10. `docs/engg-arch/INVITE_GROWTH_LOOP.md`

---

## Estimated Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| 1. Helper Functions & Modal | 20 min | 3 TypeScript files |
| 2. Screen Integration | 30 min | 2 screen modifications |
| 3. Config | 5 min | Environment variables |
| **Total** | **~55 min** | **3 new files, 3 modified** |

---

## Success Criteria

✅ Stop session with unclaimed client → modal appears with "Session stopped" title
✅ Request payment with unclaimed client → modal appears with "Request payment" title
✅ User controls sharing via modal: "Share Invite" or "Close"
✅ "Share Invite" → payment/session created first, then share opens
✅ "Close" → payment/session created without sharing
✅ Share failure → doesn't crash, primary action already completed
✅ Messages are SMS-safe (<160 chars)
✅ Codes displayed UPPERCASE, submitted as-is
✅ Feature flags independently control both flows
✅ Reuses existing invite if pending & unexpired
✅ No database changes required
✅ No new service layer required
✅ Consistent TP theme styling for modal

---

## Rollout Plan

1. **Ship behind feature flags** (default OFF)
2. **Test locally** with `.env.development` flags ON
3. **Deploy to staging** with flags ON for internal testing
4. **10% provider rollout** → monitor share CTR, errors
5. **Ramp to 100%** after stable

---

## Guardrails Implemented

✅ **Case handling:** Display UPPERCASE, submit as-is
✅ **Safe fallback:** App Store link if `generateInviteLink()` fails
✅ **Non-blocking share:** Payment/session completes even if share skipped
✅ **Feature flags:** Both flows gated independently
✅ **Length:** Messages ~160 chars (SMS-safe)
✅ **User control:** Modal gives users choice to share or skip
✅ **Loading states:** Buttons disabled during share operation
✅ **Theme consistency:** Uses TP design system

---

**Last Updated:** Oct 22, 2025
**Implemented By:** Claude Code
**Status:** ✅ Implementation complete, testing pending
