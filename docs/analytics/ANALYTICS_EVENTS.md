# TrackPay Analytics Events Specification

**Version**: 1.0
**Last Updated**: October 22, 2025
**Scope**: iOS App Only (ios-app/)

---

## Table of Contents

1. [Overview](#overview)
2. [Event Naming Convention](#event-naming-convention)
3. [Screen View Events](#screen-view-events)
4. [User Action Events](#user-action-events)
5. [Business Events](#business-events)
6. [Event Properties Schema](#event-properties-schema)
7. [Implementation Guide](#implementation-guide)

---

## Overview

This document defines all analytics events for the TrackPay mobile application. Events are categorized into:

- **Screen Views** - Page/screen navigation tracking
- **User Actions** - Button clicks, form submissions, interactions
- **Business Events** - Key business metrics (sessions, payments, invites)

**Total Events**: 60+ trackable events

---

## Event Naming Convention

### Format
```
{category}_{object}_{action}
```

### Examples
- `screen_view_client_list`
- `action_session_started`
- `business_payment_requested`

### Categories
- `screen_view_*` - Navigation/page views
- `action_*` - User interactions
- `business_*` - Business logic events
- `auth_*` - Authentication events
- `error_*` - Error tracking

---

## Screen View Events

### Authentication Flow (5 screens)

| Event Name | Screen | Route | Triggered When |
|------------|--------|-------|----------------|
| `screen_view_welcome` | Welcome Screen | `Welcome` | User lands on app intro |
| `screen_view_login` | Login Screen | `Login` | User navigates to login |
| `screen_view_register` | Register Screen | `Register` | User navigates to registration |
| `screen_view_forgot_password` | Forgot Password | `ForgotPassword` | User clicks "Forgot Password" |
| `screen_view_invite_claim` | Invite Claim | `InviteClaim` | User opens invite deep link |

**Properties for all auth screens:**
```typescript
{
  screen_name: string;
  referrer?: string;          // Previous screen
  deep_link?: boolean;        // True if arrived via deep link
  invite_code?: string;       // For invite_claim only
}
```

---

### Provider Flow (4 screens)

| Event Name | Screen | Route | Triggered When |
|------------|--------|-------|----------------|
| `screen_view_client_list` | Client List | `ClientList` | Provider's default home screen |
| `screen_view_session_tracking` | Session Tracking | `SessionTracking` | Provider starts/views session |
| `screen_view_client_history` | Client History | `ClientHistory` | Provider views client's work history |
| `screen_view_client_profile` | Client Profile | `ClientProfile` | Provider views/edits client details |

**Properties:**
```typescript
{
  screen_name: string;
  user_role: "provider";
  client_id?: string;         // For client-specific screens
  client_name?: string;
  total_clients?: number;     // For client_list
  outstanding_balance?: number; // For client_list
}
```

---

### Client Flow (2 screens)

| Event Name | Screen | Route | Triggered When |
|------------|--------|-------|----------------|
| `screen_view_provider_list` | Service Provider List | `ServiceProviderList` | Client's default home screen |
| `screen_view_provider_summary` | Provider Summary | `ServiceProviderSummary` | Client views provider details |

**Properties:**
```typescript
{
  screen_name: string;
  user_role: "client";
  provider_id?: string;
  provider_name?: string;
  total_providers?: number;
  total_owed?: number;
}
```

---

### Shared Screens (2 screens)

| Event Name | Screen | Route | Triggered When |
|------------|--------|-------|----------------|
| `screen_view_settings` | Settings | `Settings` | User opens settings |
| `screen_view_account_selection` | Account Selection | `AccountSelection` | Role selection (rarely shown) |

**Properties:**
```typescript
{
  screen_name: string;
  user_role: "provider" | "client";
}
```

---

## User Action Events

### 1. Authentication Actions (5 events)

#### `auth_login_submitted`
**Triggered**: User submits login form
**Location**: `LoginScreen.tsx` → `handleLogin()`
```typescript
{
  method: "email_password";
  success: boolean;
  error_code?: string;        // "invalid_credentials", "network_error"
  error_message?: string;
}
```

#### `auth_register_submitted`
**Triggered**: User submits registration form
**Location**: `RegisterScreen.tsx` → `handleRegister()`
```typescript
{
  user_role: "provider" | "client";
  success: boolean;
  error_code?: string;
}
```

#### `auth_invite_claimed`
**Triggered**: Client successfully claims invite code
**Location**: `InviteClaimScreen.tsx` → `handleClaimInvite()`
```typescript
{
  invite_code: string;
  provider_id: string;
  success: boolean;
  error_code?: string;        // "invalid_code", "already_claimed"
}
```

#### `auth_password_reset_requested`
**Triggered**: User submits forgot password form
**Location**: `ForgotPasswordScreen.tsx`
```typescript
{
  email: string;              // Hashed for privacy
  success: boolean;
}
```

#### `auth_logout`
**Triggered**: User signs out
**Location**: `SettingsScreen.tsx` → `handleLogout()`
```typescript
{
  user_role: "provider" | "client";
  session_duration_minutes: number;
}
```

---

### 2. Provider Actions - Client Management (7 events)

#### `action_add_client_opened`
**Triggered**: Provider opens "Add Client" modal
**Location**: `ClientListScreen.tsx`
```typescript
{
  total_existing_clients: number;
}
```

#### `action_add_client_submitted`
**Triggered**: Provider submits new client form
**Location**: `AddClientModal.tsx` → `handleAddClient()`
```typescript
{
  has_email: boolean;
  hourly_rate: number;
  success: boolean;
  error_code?: string;
}
```

#### `action_invite_code_generated`
**Triggered**: Provider generates invite code for client
**Location**: `InviteClientModal.tsx` → `handleGenerateInvite()`
```typescript
{
  client_id: string;
  invite_code: string;
  success: boolean;
}
```

#### `action_invite_code_copied`
**Triggered**: Provider copies invite code to clipboard
**Location**: `InviteModal.tsx`
```typescript
{
  invite_code: string;
  method: "copy_button";
}
```

#### `action_invite_code_shared`
**Triggered**: Provider shares invite code via native share
**Location**: `InviteModal.tsx`
```typescript
{
  invite_code: string;
  method: "native_share";
}
```

#### `action_client_profile_viewed`
**Triggered**: Provider opens client profile
**Location**: `ClientListScreen.tsx` → Navigation
```typescript
{
  client_id: string;
  client_name: string;
  outstanding_balance: number;
}
```

#### `action_client_profile_updated`
**Triggered**: Provider updates client details
**Location**: `ClientProfileScreen.tsx`
```typescript
{
  client_id: string;
  fields_updated: string[];   // ["name", "hourly_rate", "email"]
  success: boolean;
}
```

---

### 3. Provider Actions - Session Tracking (9 events)

#### `action_session_started`
**Triggered**: Provider starts new work session
**Location**: `StyledSessionTrackingScreen.tsx` → `handleStart()`
```typescript
{
  client_id: string;
  client_name: string;
  crew_size: number;
  hourly_rate: number;
  start_time: string;         // ISO 8601
}
```

#### `action_session_paused`
**Triggered**: Provider pauses running session
**Location**: `StyledSessionTrackingScreen.tsx` → `handlePause()`
```typescript
{
  session_id: string;
  client_id: string;
  elapsed_minutes: number;
  crew_size: number;
}
```

#### `action_session_resumed`
**Triggered**: Provider resumes paused session
**Location**: `StyledSessionTrackingScreen.tsx` → `handleResume()`
```typescript
{
  session_id: string;
  client_id: string;
  paused_duration_minutes: number;
}
```

#### `action_session_stopped`
**Triggered**: Provider ends session
**Location**: `StyledSessionTrackingScreen.tsx` → `handleEnd()`
```typescript
{
  session_id: string;
  client_id: string;
  total_duration_minutes: number;
  crew_size: number;
  person_hours: number;       // duration * crew_size
  total_amount: number;
  hourly_rate: number;
}
```

#### `action_crew_size_increased`
**Triggered**: Provider increases crew count
**Location**: `StyledSessionTrackingScreen.tsx` → `handleCrewIncrease()`
```typescript
{
  session_id: string;
  previous_crew_size: number;
  new_crew_size: number;
  elapsed_minutes: number;
}
```

#### `action_crew_size_decreased`
**Triggered**: Provider decreases crew count
**Location**: `StyledSessionTrackingScreen.tsx` → `handleCrewDecrease()`
```typescript
{
  session_id: string;
  previous_crew_size: number;
  new_crew_size: number;
  elapsed_minutes: number;
}
```

#### `action_session_history_viewed`
**Triggered**: Provider opens client's session history
**Location**: `ClientListScreen.tsx` → Navigation
```typescript
{
  client_id: string;
  client_name: string;
  total_sessions?: number;
}
```

#### `action_session_details_viewed`
**Triggered**: Provider expands session card in history
**Location**: `ClientHistoryScreen.tsx`
```typescript
{
  session_id: string;
  client_id: string;
  session_status: "active" | "unpaid" | "requested" | "paid";
}
```

#### `action_timer_tick`
**Triggered**: Session timer updates (every 60 seconds)
**Location**: `StyledSessionTrackingScreen.tsx` → Timer
```typescript
{
  session_id: string;
  elapsed_minutes: number;
  crew_size: number;
  current_amount: number;
}
```
*Note*: Consider sampling this event (e.g., every 5 minutes) to reduce volume.

---

### 4. Provider Actions - Payment Requests (4 events)

#### `action_payment_request_opened`
**Triggered**: Provider opens payment request modal
**Location**: `ClientHistoryScreen.tsx`
```typescript
{
  session_id: string;
  client_id: string;
  amount: number;
}
```

#### `action_payment_requested`
**Triggered**: Provider requests payment from client
**Location**: `ClientHistoryScreen.tsx` → `handleRequestPayment()`
```typescript
{
  session_id: string;
  client_id: string;
  amount: number;
  success: boolean;
}
```

#### `action_mark_as_paid_opened`
**Triggered**: Provider opens "Mark as Paid" modal
**Location**: `ClientHistoryScreen.tsx`
```typescript
{
  session_ids: string[];      // Array if multiple sessions
  total_amount: number;
}
```

#### `action_mark_as_paid_submitted`
**Triggered**: Provider marks session(s) as paid
**Location**: `MarkAsPaidModal.tsx` → `handleMarkAsPaid()`
```typescript
{
  session_ids: string[];
  client_id: string;
  total_amount: number;
  payment_method?: string;    // Optional note
  success: boolean;
}
```

---

### 5. Client Actions (6 events)

#### `action_provider_viewed`
**Triggered**: Client opens provider summary
**Location**: `ServiceProviderListScreen.tsx` → Navigation
```typescript
{
  provider_id: string;
  provider_name: string;
  total_owed: number;
  unpaid_sessions: number;
}
```

#### `action_session_viewed_by_client`
**Triggered**: Client views session details
**Location**: `ServiceProviderSummaryScreen.tsx`
```typescript
{
  session_id: string;
  provider_id: string;
  amount: number;
  status: "unpaid" | "requested" | "paid";
}
```

#### `action_payment_sent_opened`
**Triggered**: Client opens "Mark Payment Sent" modal
**Location**: `ServiceProviderSummaryScreen.tsx`
```typescript
{
  session_ids: string[];
  provider_id: string;
  total_amount: number;
}
```

#### `action_payment_sent_submitted`
**Triggered**: Client marks payment as sent
**Location**: `ServiceProviderSummaryScreen.tsx` → `handleMarkPaymentSent()`
```typescript
{
  session_ids: string[];
  provider_id: string;
  total_amount: number;
  success: boolean;
}
```

#### `action_client_pull_to_refresh`
**Triggered**: Client pulls to refresh data
**Location**: `ServiceProviderListScreen.tsx`
```typescript
{
  screen_name: "provider_list";
  total_providers: number;
}
```

#### `action_outstanding_balance_viewed`
**Triggered**: Client views outstanding balance card
**Location**: `ServiceProviderSummaryScreen.tsx`
```typescript
{
  provider_id: string;
  total_owed: number;
  unpaid_sessions: number;
}
```

---

### 6. Settings Actions (3 events)

#### `action_language_changed`
**Triggered**: User switches language
**Location**: `SettingsScreen.tsx` → `handleLanguageChange()`
```typescript
{
  previous_language: "en" | "es";
  new_language: "en" | "es";
  user_role: "provider" | "client";
}
```

#### `action_profile_name_updated`
**Triggered**: User updates display name
**Location**: `SettingsScreen.tsx` → `handleUpdateProfile()`
```typescript
{
  user_role: "provider" | "client";
  success: boolean;
}
```

#### `action_how_it_works_opened`
**Triggered**: User opens tutorial modal
**Location**: `WelcomeScreen.tsx` or `SettingsScreen.tsx`
```typescript
{
  source_screen: string;      // "welcome", "settings"
}
```

---

### 7. Data Sync Actions (3 events)

#### `action_pull_to_refresh`
**Triggered**: User pulls to refresh screen
**Location**: Various screens with ScrollView
```typescript
{
  screen_name: string;
  user_role: "provider" | "client";
}
```

#### `action_sync_status_viewed`
**Triggered**: User taps sync status indicator
**Location**: `SimplifiedSyncStatus.tsx`
```typescript
{
  sync_status: "synced" | "syncing" | "error";
  last_sync_timestamp?: string;
}
```

#### `action_retry_sync`
**Triggered**: User retries failed sync operation
**Location**: Error modals/toasts
```typescript
{
  operation: string;          // "fetch_clients", "save_session", etc.
  retry_attempt: number;
}
```

---

## Business Events

Business events track key metrics and workflows that impact revenue and product health.

### 1. User Lifecycle Events (4 events)

#### `business_user_registered`
**Triggered**: New user successfully registers
**Location**: `RegisterScreen.tsx` + `InviteClaimScreen.tsx`
```typescript
{
  user_id: string;
  user_role: "provider" | "client";
  registration_method: "email" | "invite_code";
  invite_code?: string;       // If via invite
  provider_id?: string;       // If client via invite
  timestamp: string;
}
```

#### `business_user_activated`
**Triggered**: User completes first key action after registration
**Location**: Various screens
```typescript
{
  user_id: string;
  user_role: "provider" | "client";
  activation_action: "first_session_started" | "first_payment_sent";
  days_since_registration: number;
}
```

#### `business_relationship_created`
**Triggered**: Provider-client relationship established
**Location**: `AddClientModal.tsx` (manual) or `InviteClaimScreen.tsx` (invite)
```typescript
{
  relationship_id: string;
  provider_id: string;
  client_id: string;
  creation_method: "manual" | "invite_accepted";
  hourly_rate: number;
}
```

#### `business_user_churned`
**Triggered**: User hasn't logged in for 30 days
**Location**: Backend/scheduled job (not in-app)
```typescript
{
  user_id: string;
  user_role: "provider" | "client";
  last_login_date: string;
  days_inactive: number;
  total_sessions?: number;    // If provider
  total_payments?: number;
}
```

---

### 2. Session Lifecycle Events (4 events)

#### `business_session_completed`
**Triggered**: Provider ends session (status: active → unpaid)
**Location**: `StyledSessionTrackingScreen.tsx` → `handleEnd()`
```typescript
{
  session_id: string;
  provider_id: string;
  client_id: string;
  duration_minutes: number;
  crew_size: number;
  person_hours: number;
  hourly_rate: number;
  total_amount: number;
  start_time: string;
  end_time: string;
}
```

#### `business_session_cancelled`
**Triggered**: Session deleted before completion
**Location**: `SessionTrackingScreen.tsx` (if implemented)
```typescript
{
  session_id: string;
  provider_id: string;
  client_id: string;
  elapsed_minutes: number;
  cancellation_reason?: string;
}
```

#### `business_long_session_alert`
**Triggered**: Session exceeds 8 hours
**Location**: `StyledSessionTrackingScreen.tsx` → Timer
```typescript
{
  session_id: string;
  provider_id: string;
  client_id: string;
  duration_minutes: number;
  current_amount: number;
}
```

#### `business_crew_size_changed`
**Triggered**: Crew size modified mid-session
**Location**: `StyledSessionTrackingScreen.tsx`
```typescript
{
  session_id: string;
  provider_id: string;
  client_id: string;
  previous_crew_size: number;
  new_crew_size: number;
  elapsed_minutes: number;
  impact_on_rate: number;     // % change in hourly rate
}
```

---

### 3. Payment Events (5 events)

#### `business_payment_requested`
**Triggered**: Provider requests payment from client (unpaid → requested)
**Location**: `ClientHistoryScreen.tsx` → `handleRequestPayment()`
```typescript
{
  payment_request_id: string;
  session_id: string;
  provider_id: string;
  client_id: string;
  amount: number;
  requested_at: string;
}
```

#### `business_payment_marked_sent`
**Triggered**: Client marks payment as sent (requested/unpaid → paid)
**Location**: `ServiceProviderSummaryScreen.tsx` → `handleMarkPaymentSent()`
```typescript
{
  payment_ids: string[];      // Can be multiple sessions
  provider_id: string;
  client_id: string;
  total_amount: number;
  payment_method?: string;
  marked_at: string;
}
```

#### `business_payment_confirmed`
**Triggered**: Provider confirms payment received (paid status)
**Location**: `ClientHistoryScreen.tsx` → `handleMarkAsPaid()`
```typescript
{
  payment_ids: string[];
  provider_id: string;
  client_id: string;
  total_amount: number;
  confirmed_at: string;
  days_since_session_completed: number;
}
```

#### `business_payment_overdue`
**Triggered**: Session unpaid for >30 days
**Location**: Backend/scheduled job
```typescript
{
  session_id: string;
  provider_id: string;
  client_id: string;
  amount: number;
  days_overdue: number;
  session_completed_at: string;
}
```

#### `business_payment_velocity`
**Triggered**: Aggregated payment metrics (daily/weekly)
**Location**: Backend analytics job
```typescript
{
  period: "daily" | "weekly" | "monthly";
  total_sessions_completed: number;
  total_payments_requested: number;
  total_payments_received: number;
  total_amount: number;
  avg_payment_cycle_days: number;
  provider_id?: string;       // Optional: per-provider
}
```

---

### 4. Invite & Onboarding Events (4 events)

#### `business_invite_code_created`
**Triggered**: Provider generates invite code
**Location**: `InviteClientModal.tsx` → `handleGenerateInvite()`
```typescript
{
  invite_code: string;
  provider_id: string;
  client_id: string;          // Client stub ID
  created_at: string;
}
```

#### `business_invite_code_shared`
**Triggered**: Provider shares invite via native share
**Location**: `InviteModal.tsx`
```typescript
{
  invite_code: string;
  provider_id: string;
  share_method: "native_share" | "copy_clipboard";
}
```

#### `business_invite_code_claimed`
**Triggered**: Client successfully claims invite
**Location**: `InviteClaimScreen.tsx` → `handleClaimInvite()`
```typescript
{
  invite_code: string;
  provider_id: string;
  client_id: string;          // Now real user ID
  days_since_invite_created: number;
  claimed_at: string;
}
```

#### `business_invite_conversion_rate`
**Triggered**: Aggregated invite metrics (daily)
**Location**: Backend analytics job
```typescript
{
  period: "daily" | "weekly";
  total_invites_created: number;
  total_invites_claimed: number;
  conversion_rate: number;    // claimed / created
  avg_time_to_claim_hours: number;
}
```

---

### 5. Error & Edge Case Events (5 events)

#### `error_app_crashed`
**Triggered**: Unhandled error caught by ErrorBoundary
**Location**: `ErrorBoundary.tsx` → `componentDidCatch()`
```typescript
{
  error_message: string;
  error_stack: string;
  component_stack: string;
  screen_name: string;
  user_role?: "provider" | "client";
  timestamp: string;
}
```

#### `error_network_failure`
**Triggered**: Network request fails
**Location**: `supabase.ts` + `storageService.ts`
```typescript
{
  operation: string;          // "fetch_clients", "save_session"
  error_code: string;         // "NETWORK_ERROR", "TIMEOUT"
  retry_count: number;
  user_role: "provider" | "client";
}
```

#### `error_auth_session_expired`
**Triggered**: User session expires
**Location**: `AuthContext.tsx`
```typescript
{
  user_id: string;
  user_role: "provider" | "client";
  session_duration_minutes: number;
}
```

#### `error_storage_sync_failed`
**Triggered**: Hybrid storage sync fails
**Location**: `hybridStorage.ts`
```typescript
{
  operation: string;
  error_message: string;
  local_data_preserved: boolean;
  user_role: "provider" | "client";
}
```

#### `error_invalid_state`
**Triggered**: Data integrity issue detected
**Location**: Various screens
```typescript
{
  issue_type: string;         // "missing_client_id", "negative_amount"
  screen_name: string;
  user_role: "provider" | "client";
  details: object;
}
```

---

## Event Properties Schema

### Global Properties (sent with every event)

```typescript
{
  // User Context
  user_id: string;
  user_role: "provider" | "client";
  display_name?: string;

  // App Context
  app_version: string;        // e.g., "1.0.5"
  build_number: number;       // e.g., 9
  platform: "ios" | "android" | "web";
  os_version: string;
  device_model: string;

  // Session Context
  session_id: string;         // Analytics session ID (not work session)
  session_start_time: string;

  // Locale
  language: "en" | "es";
  timezone: string;           // e.g., "America/New_York"

  // Feature Flags
  storage_mode: "hybrid" | "supabase_only" | "local_only";

  // Timestamp
  event_timestamp: string;    // ISO 8601
}
```

---

### Common Property Types

```typescript
// Payment Status
type PaymentStatus = "active" | "unpaid" | "requested" | "paid";

// User Role
type UserRole = "provider" | "client";

// Screen Names (for navigation tracking)
type ScreenName =
  | "welcome"
  | "login"
  | "register"
  | "forgot_password"
  | "invite_claim"
  | "client_list"
  | "session_tracking"
  | "client_history"
  | "client_profile"
  | "provider_list"
  | "provider_summary"
  | "settings"
  | "account_selection";

// Error Codes
type ErrorCode =
  | "invalid_credentials"
  | "network_error"
  | "invalid_code"
  | "already_claimed"
  | "session_expired"
  | "insufficient_permissions"
  | "unknown_error";
```

---

## Implementation Guide

### 1. Analytics Service Setup

Create `src/services/analyticsService.ts`:

```typescript
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { getCurrentTrackPayUser } from './storageService';

interface AnalyticsEvent {
  event_name: string;
  properties: Record<string, any>;
}

class AnalyticsService {
  private sessionId: string;
  private userId?: string;
  private userRole?: 'provider' | 'client';

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async initialize() {
    const user = await getCurrentTrackPayUser();
    if (user) {
      this.userId = user.id;
      this.userRole = user.role;
    }
  }

  private getGlobalProperties() {
    return {
      user_id: this.userId,
      user_role: this.userRole,
      app_version: Constants.expoConfig?.version || '1.0.0',
      build_number: Constants.expoConfig?.ios?.buildNumber || 0,
      platform: Device.osName || 'unknown',
      os_version: Device.osVersion || 'unknown',
      device_model: Device.modelName || 'unknown',
      session_id: this.sessionId,
      event_timestamp: new Date().toISOString(),
    };
  }

  trackEvent(eventName: string, properties: Record<string, any> = {}) {
    const event: AnalyticsEvent = {
      event_name: eventName,
      properties: {
        ...this.getGlobalProperties(),
        ...properties,
      },
    };

    // Send to analytics provider (e.g., Amplitude, Mixpanel, Firebase)
    this.sendToProvider(event);
  }

  trackScreenView(screenName: string, additionalProps: Record<string, any> = {}) {
    this.trackEvent(`screen_view_${screenName}`, {
      screen_name: screenName,
      ...additionalProps,
    });
  }

  private sendToProvider(event: AnalyticsEvent) {
    if (__DEV__) {
      console.log('[Analytics]', event.event_name, event.properties);
    }

    // TODO: Integrate with analytics provider
    // Example: amplitude.track(event.event_name, event.properties);
    // Example: mixpanel.track(event.event_name, event.properties);
  }
}

export const analytics = new AnalyticsService();
```

---

### 2. Screen View Tracking with React Navigation

Update `src/navigation/AppNavigator.tsx`:

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { analytics } from '../services/analyticsService';

export default function AppNavigator() {
  const routeNameRef = React.useRef<string>();
  const navigationRef = React.useRef<any>();

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
      }}
      onStateChange={async () => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

        if (previousRouteName !== currentRouteName) {
          // Track screen view
          analytics.trackScreenView(currentRouteName || 'unknown', {
            previous_screen: previousRouteName,
          });
        }

        routeNameRef.current = currentRouteName;
      }}
    >
      {/* Your navigators */}
    </NavigationContainer>
  );
}
```

---

### 3. Action Event Tracking Examples

#### Example 1: Session Started

In `StyledSessionTrackingScreen.tsx`:

```typescript
import { analytics } from '../services/analyticsService';

const handleStart = async () => {
  try {
    const sessionId = await startSession(clientId);

    // Track analytics
    analytics.trackEvent('action_session_started', {
      client_id: clientId,
      client_name: clientData.name,
      crew_size: crewSize,
      hourly_rate: clientData.hourlyRate,
      start_time: new Date().toISOString(),
    });

    // Business event
    analytics.trackEvent('business_session_created', {
      session_id: sessionId,
      provider_id: currentUser.id,
      client_id: clientId,
      crew_size: crewSize,
      hourly_rate: clientData.hourlyRate,
    });

    // Continue with UI updates...
  } catch (error) {
    analytics.trackEvent('error_session_start_failed', {
      client_id: clientId,
      error_message: error.message,
    });
  }
};
```

#### Example 2: Payment Requested

In `ClientHistoryScreen.tsx`:

```typescript
const handleRequestPayment = async (sessionId: string) => {
  try {
    await requestPayment(sessionId);

    analytics.trackEvent('action_payment_requested', {
      session_id: sessionId,
      client_id: clientId,
      amount: sessionData.totalAmount,
      success: true,
    });

    analytics.trackEvent('business_payment_requested', {
      payment_request_id: `req_${Date.now()}`,
      session_id: sessionId,
      provider_id: currentUser.id,
      client_id: clientId,
      amount: sessionData.totalAmount,
      requested_at: new Date().toISOString(),
    });
  } catch (error) {
    analytics.trackEvent('action_payment_requested', {
      session_id: sessionId,
      success: false,
      error_code: error.code,
    });
  }
};
```

#### Example 3: Language Changed

In `SettingsScreen.tsx`:

```typescript
const handleLanguageChange = async (newLanguage: 'en' | 'es') => {
  const previousLanguage = i18n.language;

  await changeLanguageSimple(newLanguage);

  analytics.trackEvent('action_language_changed', {
    previous_language: previousLanguage,
    new_language: newLanguage,
    user_role: currentUser.role,
  });
};
```

---

### 4. Error Tracking

In `ErrorBoundary.tsx`:

```typescript
import { analytics } from '../services/analyticsService';

componentDidCatch(error: Error, errorInfo: any) {
  analytics.trackEvent('error_app_crashed', {
    error_message: error.message,
    error_stack: error.stack,
    component_stack: errorInfo.componentStack,
    screen_name: this.getCurrentScreen(), // Implement helper
  });

  // Send to error tracking service (e.g., Sentry)
  if (!__DEV__) {
    // Sentry.captureException(error);
  }
}
```

---

### 5. Recommended Analytics Providers

| Provider | Best For | Pricing |
|----------|----------|---------|
| **Amplitude** | Product analytics, user behavior | Free tier: 10M events/month |
| **Mixpanel** | Funnel analysis, retention | Free tier: 100K users/month |
| **Firebase Analytics** | Mobile-first, Google ecosystem | Free (unlimited) |
| **Segment** | Multi-destination routing | Starts at $120/month |
| **PostHog** | Open-source, self-hosted | Free tier: 1M events/month |

**Recommendation**: Start with **Firebase Analytics** (free, easy integration) + **Amplitude** (powerful analysis).

---

### 6. Priority Implementation Phases

#### Phase 1: Foundation (Week 1)
- ✅ Set up analytics service
- ✅ Implement screen view tracking
- ✅ Track authentication events (5 events)
- ✅ Track core business events (session completed, payment requested)

#### Phase 2: Core Actions (Week 2)
- ✅ Session tracking events (9 events)
- ✅ Client management events (7 events)
- ✅ Payment events (5 events)

#### Phase 3: Advanced Tracking (Week 3)
- ✅ Error tracking (5 events)
- ✅ Invite funnel tracking (4 events)
- ✅ User lifecycle events (4 events)

#### Phase 4: Optimization (Week 4)
- ✅ Implement event sampling (timer ticks)
- ✅ Add custom dashboards
- ✅ Set up alerts for critical metrics

---

## Key Metrics Dashboard

### North Star Metrics

1. **Weekly Active Sessions** (Provider engagement)
   - Track: `business_session_completed`
   - Goal: 10+ sessions/provider/week

2. **Payment Cycle Time** (Platform efficiency)
   - Track: Days between `business_session_completed` → `business_payment_confirmed`
   - Goal: <7 days average

3. **Invite Conversion Rate** (Growth)
   - Track: `business_invite_code_claimed` / `business_invite_code_created`
   - Goal: >40% conversion

4. **User Retention** (Product stickiness)
   - Track: D7, D30 retention via `screen_view_*` events
   - Goal: D7 >50%, D30 >30%

---

### Funnel Analysis

#### Provider Onboarding Funnel
```
Registration → Add First Client → Start First Session → Request Payment
     100%            80%                  60%                 40%
```

**Events to track:**
1. `auth_register_submitted` (role: provider)
2. `action_add_client_submitted`
3. `action_session_started`
4. `action_payment_requested`

#### Client Onboarding Funnel
```
Invite Link Click → Account Created → First Payment Sent
      100%               70%                40%
```

**Events to track:**
1. `screen_view_invite_claim`
2. `auth_invite_claimed`
3. `action_payment_sent_submitted`

---

## Privacy & Compliance

### PII Handling

**DO NOT TRACK**:
- ❌ Email addresses (hash if needed)
- ❌ Phone numbers
- ❌ Full names (use `user_id` instead)
- ❌ Precise GPS coordinates

**SAFE TO TRACK**:
- ✅ User IDs (anonymized)
- ✅ Aggregated amounts (not per-user breakdowns without consent)
- ✅ Session durations
- ✅ Crew sizes
- ✅ Feature usage

### GDPR Compliance

- Implement data export functionality
- Support data deletion requests
- Include analytics opt-out in settings
- Document data retention policy (suggest 90 days)

---

## Testing Checklist

Before production deployment:

- [ ] Analytics service initializes on app launch
- [ ] Screen views tracked on navigation
- [ ] All auth events fire correctly
- [ ] Session lifecycle events complete (start → stop)
- [ ] Payment events trigger on status changes
- [ ] Error events captured by ErrorBoundary
- [ ] Global properties included in all events
- [ ] No PII leakage in event properties
- [ ] Events batched/throttled appropriately
- [ ] Dev mode console logging works
- [ ] Production mode sends to provider

---

## Appendix: Quick Reference

### Event Count Summary

- **Screen Views**: 13 events
- **Authentication**: 5 events
- **Provider Actions**: 20 events
- **Client Actions**: 6 events
- **Settings**: 3 events
- **Data Sync**: 3 events
- **Business Events**: 22 events
- **Error Events**: 5 events

**Total**: 77 unique events

---

**Document Version**: 1.0
**Last Updated**: October 22, 2025
**Maintained By**: TrackPay Engineering Team
