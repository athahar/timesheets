/**
 * PostHog Analytics Events - Tier 0
 *
 * This file defines all 21 Tier-0 events with Zod schemas for validation.
 *
 * Event Categories:
 * - Screen Views (6 events)
 * - Auth & Lifecycle (4 events)
 * - Sessions (3 events)
 * - Payments (5 events)
 * - Invites (3 events)
 *
 * @see /docs/analytics/POSTHOG_IMPLEMENTATION_PLAN.md
 */

import { z } from 'zod';

// ============================================
// EVENT NAME CONSTANTS
// ============================================

export const E = {
  // Screen Views (6)
  SCREEN_VIEW_CLIENT_LIST: 'screen_view_client_list',
  SCREEN_VIEW_SESSION_TRACKING: 'screen_view_session_tracking',
  SCREEN_VIEW_CLIENT_HISTORY: 'screen_view_client_history',
  SCREEN_VIEW_PROVIDER_LIST: 'screen_view_provider_list',
  SCREEN_VIEW_PROVIDER_SUMMARY: 'screen_view_provider_summary',
  SCREEN_VIEW_INVITE_CLAIM: 'screen_view_invite_claim',

  // Auth & Lifecycle (4)
  AUTH_REGISTER_SUBMITTED: 'auth_register_submitted',
  BUSINESS_USER_REGISTERED: 'business_user_registered',
  BUSINESS_USER_ACTIVATED: 'business_user_activated',
  AUTH_INVITE_CLAIMED: 'auth_invite_claimed',

  // Sessions (3)
  ACTION_SESSION_STARTED: 'action_session_started',
  ACTION_SESSION_STOPPED: 'action_session_stopped',
  BUSINESS_SESSION_COMPLETED: 'business_session_completed',

  // Payments (5)
  ACTION_PAYMENT_REQUESTED: 'action_payment_requested',
  BUSINESS_PAYMENT_REQUESTED: 'business_payment_requested',
  ACTION_PAYMENT_SENT_SUBMITTED: 'action_payment_sent_submitted', // CLIENT-SIDE
  ACTION_MARK_AS_PAID_SUBMITTED: 'action_mark_as_paid_submitted', // PROVIDER-SIDE
  BUSINESS_PAYMENT_CONFIRMED: 'business_payment_confirmed',

  // Invites (3)
  BUSINESS_INVITE_CODE_CREATED: 'business_invite_code_created',
  BUSINESS_INVITE_CODE_SHARED: 'business_invite_code_shared',
  BUSINESS_INVITE_CODE_CLAIMED: 'business_invite_code_claimed',

  // Growth Loop - Invite Modals (6 new events)
  INVITE_MODAL_SHOWN: 'invite_modal_shown',
  INVITE_MODAL_ACTION: 'invite_modal_action',
  INVITE_SHARE_INITIATED: 'invite_share_initiated',
  INVITE_REDEEMED: 'invite_redeemed',
  INVITE_REDEMPTION_FAILED: 'invite_redemption_failed',
  RELATIONSHIP_CREATED_FROM_INVITE: 'relationship_created_from_invite',

  // Client UX Events (6 new events)
  CLIENT_HOME_VIEWED: 'client.home.viewed',
  CLIENT_PROVIDER_CARD_TAPPED: 'client.provider.card_tapped',
  CLIENT_PROVIDER_DETAIL_VIEWED: 'client.provider_detail.viewed',
  CLIENT_LOGIN_SUCCESS: 'client.login.success',
  CLIENT_PAYMENT_OPEN_MARK_PAID: 'client.payment.open_mark_paid',
  CLIENT_PAYMENT_RECORDED: 'client.payment.recorded',
} as const;

// ============================================
// TIER-1 EVENTS (Landing Page & Language)
// ============================================

export const E_T1 = {
  SCREEN_VIEW_LANDING: 'screen_view_landing',
  ACTION_SIGNUP_CTA_CLICKED: 'action_signup_cta_clicked',
  ACTION_LOGIN_CTA_CLICKED: 'action_login_cta_clicked',
  ACTION_INVITE_CLAIM_CTA_CLICKED: 'action_invite_claim_cta_clicked',
  ACTION_LANGUAGE_CHANGED: 'action_language_changed',
} as const;

// ============================================
// COMMON ENUMS & TYPES
// ============================================

export const UserRole = z.enum(['provider', 'client', 'guest']);
export type UserRole = z.infer<typeof UserRole>;

export const RegistrationMethod = z.enum(['email_password', 'invite_code']);
export type RegistrationMethod = z.infer<typeof RegistrationMethod>;

// Accept both sets during migration (canonical: imessage, whatsapp, copy_link)
export const ShareMethod = z.enum(['imessage', 'whatsapp', 'copy_link', 'share_sheet', 'copy_code']);
export type ShareMethod = z.infer<typeof ShareMethod>;

export const ActivationAction = z.enum(['first_session_started', 'first_payment_sent']);
export type ActivationAction = z.infer<typeof ActivationAction>;

// ============================================
// SCREEN VIEW SCHEMAS (6 events)
// ============================================

export const zScreenViewClientList = z.object({
  previous_screen: z.string().nullable().optional(),
});
export type ScreenViewClientList = z.infer<typeof zScreenViewClientList>;

export const zScreenViewSessionTracking = z.object({
  previous_screen: z.string().nullable().optional(),
  client_id: z.string().optional(),
});
export type ScreenViewSessionTracking = z.infer<typeof zScreenViewSessionTracking>;

export const zScreenViewClientHistory = z.object({
  client_id: z.string(),
  client_name: z.string().optional(),
  previous_screen: z.string().nullable().optional(),
});
export type ScreenViewClientHistory = z.infer<typeof zScreenViewClientHistory>;

export const zScreenViewProviderList = z.object({
  previous_screen: z.string().nullable().optional(),
});
export type ScreenViewProviderList = z.infer<typeof zScreenViewProviderList>;

export const zScreenViewProviderSummary = z.object({
  provider_id: z.string(),
  previous_screen: z.string().nullable().optional(),
});
export type ScreenViewProviderSummary = z.infer<typeof zScreenViewProviderSummary>;

export const zScreenViewInviteClaim = z.object({
  deep_link: z.boolean(),
  invite_code: z.string(),
  previous_screen: z.string().nullable().optional(),
});
export type ScreenViewInviteClaim = z.infer<typeof zScreenViewInviteClaim>;

// ============================================
// AUTH & LIFECYCLE SCHEMAS (4 events)
// ============================================

export const zAuthRegisterSubmitted = z.object({
  user_role: UserRole,
  success: z.boolean(),
  error_code: z.string().optional(),
});
export type AuthRegisterSubmitted = z.infer<typeof zAuthRegisterSubmitted>;

export const zBusinessUserRegistered = z.object({
  user_id: z.string(),
  user_role: UserRole,
  registration_method: RegistrationMethod,
  invite_code: z.string().optional(), // Present if registration_method = 'invite_code'
  provider_id: z.string().optional(), // Present if client via invite
  timestamp: z.string(), // ISO 8601
});
export type BusinessUserRegistered = z.infer<typeof zBusinessUserRegistered>;

export const zBusinessUserActivated = z.object({
  user_id: z.string(),
  user_role: UserRole,
  activation_action: ActivationAction,
  days_since_registration: z.number().int().nonnegative(),
});
export type BusinessUserActivated = z.infer<typeof zBusinessUserActivated>;

export const zAuthInviteClaimed = z.object({
  invite_code: z.string(),
  provider_id: z.string(),
  success: z.boolean(),
  error_code: z.string().optional(),
});
export type AuthInviteClaimed = z.infer<typeof zAuthInviteClaimed>;

// ============================================
// SESSION SCHEMAS (3 events)
// ============================================

export const zActionSessionStarted = z.object({
  client_id: z.string(),
  client_name: z.string().optional(),
  crew_size: z.number().int().positive(),
  hourly_rate: z.number().nonnegative(),
  start_time: z.string(), // ISO 8601
});
export type ActionSessionStarted = z.infer<typeof zActionSessionStarted>;

export const zActionSessionStopped = z.object({
  session_id: z.string(),
  client_id: z.string(),
  total_duration_minutes: z.number().int().nonnegative(),
  crew_size: z.number().int().positive(),
  person_hours: z.number().nonnegative(),
  hourly_rate: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  // drift-friendly extras (optional)
  client_name: z.string().optional(),
  duration_minutes: z.number().int().nonnegative().optional(), // alias tolerated
});
export type ActionSessionStopped = z.infer<typeof zActionSessionStopped>;

export const zBusinessSessionCompleted = z.object({
  session_id: z.string(),
  provider_id: z.string(),
  client_id: z.string(),
  duration_minutes: z.number().nonnegative(),
  crew_size: z.number().int().positive(),
  person_hours: z.number().nonnegative(),
  hourly_rate: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  start_time: z.string(), // ISO 8601
  end_time: z.string(), // ISO 8601
  // drift extras tolerated
  client_name: z.string().optional(),
  completed_at: z.string().optional(), // ISO 8601
});
export type BusinessSessionCompleted = z.infer<typeof zBusinessSessionCompleted>;

// ============================================
// PAYMENT SCHEMAS (5 events)
// ============================================

export const zActionPaymentRequested = z.object({
  session_id: z.string(),
  client_id: z.string(),
  amount: z.number().nonnegative(),
  success: z.boolean(),
  // drift extras tolerated
  session_count: z.number().int().nonnegative().optional(),
  total_person_hours: z.number().nonnegative().optional(),
  total_amount: z.number().nonnegative().optional(), // if UI bundles multiple sessions
  client_name: z.string().optional(),
});
export type ActionPaymentRequested = z.infer<typeof zActionPaymentRequested>;

export const zBusinessPaymentRequested = z.object({
  payment_request_id: z.string(),
  session_id: z.string(),
  provider_id: z.string(),
  client_id: z.string(),
  amount: z.number().nonnegative(),
  requested_at: z.string(), // ISO 8601
  // drift extras tolerated
  unpaid_session_ids: z.array(z.string()).optional(),
  session_count: z.number().int().nonnegative().optional(),
  total_person_hours: z.number().nonnegative().optional(),
  total_amount: z.number().nonnegative().optional(),
  client_name: z.string().optional(),
});
export type BusinessPaymentRequested = z.infer<typeof zBusinessPaymentRequested>;

export const zActionPaymentSentSubmitted = z.object({
  session_ids: z.array(z.string()).min(1),
  provider_id: z.string(),
  total_amount: z.number().nonnegative(),
  success: z.boolean(),
  // drift extras tolerated / mapped
  amount_paid: z.number().nonnegative().optional(),
  payment_method: z.string().optional(),
  provider_name: z.string().optional(),
});
export type ActionPaymentSentSubmitted = z.infer<typeof zActionPaymentSentSubmitted>;

export const zActionMarkAsPaidSubmitted = z.object({
  session_ids: z.array(z.string()).min(1),
  client_id: z.string(),
  total_amount: z.number().nonnegative(),
  payment_method: z.string().optional(),
  success: z.boolean(),
});
export type ActionMarkAsPaidSubmitted = z.infer<typeof zActionMarkAsPaidSubmitted>;

export const zBusinessPaymentConfirmed = z.object({
  payment_ids: z.array(z.string()).min(1),
  provider_id: z.string(),
  client_id: z.string(),
  total_amount: z.number().nonnegative(),
  confirmed_at: z.string(), // ISO 8601
  days_since_session_completed: z.number().int().nonnegative(),
  // drift extras tolerated
  session_ids: z.array(z.string()).optional(), // alias
  session_count: z.number().int().nonnegative().optional(),
  total_person_hours: z.number().nonnegative().optional(),
  payment_method: z.string().optional(),
  amount_paid: z.number().nonnegative().optional(),
  provider_name: z.string().optional(),
});
export type BusinessPaymentConfirmed = z.infer<typeof zBusinessPaymentConfirmed>;

// ============================================
// INVITE SCHEMAS (3 events)
// ============================================

export const zBusinessInviteCodeCreated = z.object({
  invite_code: z.string(),
  provider_id: z.string(),
  client_id: z.string().optional(), // May be undefined pre-registration
  created_at: z.string(), // ISO 8601
});
export type BusinessInviteCodeCreated = z.infer<typeof zBusinessInviteCodeCreated>;

export const zBusinessInviteCodeShared = z.object({
  invite_code: z.string(),
  provider_id: z.string(),
  client_id: z.string().optional(),
  client_name: z.string().optional(),
  share_method: ShareMethod,
  shared_at: z.string(), // ISO 8601
});
export type BusinessInviteCodeShared = z.infer<typeof zBusinessInviteCodeShared>;

export const zBusinessInviteCodeClaimed = z.object({
  invite_code: z.string(),
  provider_id: z.string(),
  client_id: z.string(),
  days_since_invite_created: z.number().int().nonnegative(),
  claimed_at: z.string(), // ISO 8601
});
export type BusinessInviteCodeClaimed = z.infer<typeof zBusinessInviteCodeClaimed>;

// ============================================
// TIER-1 SCHEMAS (Landing & Language)
// ============================================

const zPlacement = z.enum(['hero', 'footer', 'modal']);
const zLang = z.enum(['en', 'es', 'en-US', 'es-US']); // Support both formats

export const zScreenViewLanding = z.object({
  previous_screen: z.string().optional().nullable(),
  experiment_variant: z.string().optional(), // e.g., "usp_a" | "usp_b"
});
export type ScreenViewLanding = z.infer<typeof zScreenViewLanding>;

export const zActionSignupCtaClicked = z.object({ placement: zPlacement });
export type ActionSignupCtaClicked = z.infer<typeof zActionSignupCtaClicked>;

export const zActionLoginCtaClicked = z.object({ placement: zPlacement });
export type ActionLoginCtaClicked = z.infer<typeof zActionLoginCtaClicked>;

export const zActionInviteClaimCtaClicked = z.object({ placement: zPlacement });
export type ActionInviteClaimCtaClicked = z.infer<typeof zActionInviteClaimCtaClicked>;

export const zActionLanguageChanged = z.object({
  from_lang: zLang,
  to_lang: zLang,
  source: z.literal('landing'),
});
export type ActionLanguageChanged = z.infer<typeof zActionLanguageChanged>;

// ============================================
// CLIENT UX EVENTS SCHEMAS (6 events)
// ============================================

export const zClientHomeViewed = z.object({
  providerCount: z.number().int().nonnegative(),
});
export type ClientHomeViewed = z.infer<typeof zClientHomeViewed>;

export const zClientProviderCardTapped = z.object({
  providerId: z.string(),
  providerName: z.string(),
  totalBalance: z.number().nonnegative(),
});
export type ClientProviderCardTapped = z.infer<typeof zClientProviderCardTapped>;

export const zClientProviderDetailViewed = z.object({
  providerId: z.string(),
  providerName: z.string(),
  unpaidBalance: z.number().nonnegative(),
});
export type ClientProviderDetailViewed = z.infer<typeof zClientProviderDetailViewed>;

export const zClientLoginSuccess = z.object({
  method: z.enum(['email_password', 'invite_claim']),
  hasSeenWelcome: z.boolean(),
});
export type ClientLoginSuccess = z.infer<typeof zClientLoginSuccess>;

export const zClientPaymentOpenMarkPaid = z.object({
  providerId: z.string(),
  providerName: z.string(),
  unpaidBalance: z.number().nonnegative(),
});
export type ClientPaymentOpenMarkPaid = z.infer<typeof zClientPaymentOpenMarkPaid>;

export const zClientPaymentRecorded = z.object({
  providerId: z.string(),
  providerName: z.string(),
  amount: z.number().positive(),
  currency: z.string(),
});
export type ClientPaymentRecorded = z.infer<typeof zClientPaymentRecorded>;

// ============================================
// SCHEMA MAP (for runtime validation)
// ============================================

export const schemaMap: Record<string, z.ZodTypeAny | undefined> = {
  // Screen Views
  [E.SCREEN_VIEW_CLIENT_LIST]: zScreenViewClientList,
  [E.SCREEN_VIEW_SESSION_TRACKING]: zScreenViewSessionTracking,
  [E.SCREEN_VIEW_CLIENT_HISTORY]: zScreenViewClientHistory,
  [E.SCREEN_VIEW_PROVIDER_LIST]: zScreenViewProviderList,
  [E.SCREEN_VIEW_PROVIDER_SUMMARY]: zScreenViewProviderSummary,
  [E.SCREEN_VIEW_INVITE_CLAIM]: zScreenViewInviteClaim,

  // Auth & Lifecycle
  [E.AUTH_REGISTER_SUBMITTED]: zAuthRegisterSubmitted,
  [E.BUSINESS_USER_REGISTERED]: zBusinessUserRegistered,
  [E.BUSINESS_USER_ACTIVATED]: zBusinessUserActivated,
  [E.AUTH_INVITE_CLAIMED]: zAuthInviteClaimed,

  // Sessions
  [E.ACTION_SESSION_STARTED]: zActionSessionStarted,
  [E.ACTION_SESSION_STOPPED]: zActionSessionStopped,
  [E.BUSINESS_SESSION_COMPLETED]: zBusinessSessionCompleted,

  // Payments
  [E.ACTION_PAYMENT_REQUESTED]: zActionPaymentRequested,
  [E.BUSINESS_PAYMENT_REQUESTED]: zBusinessPaymentRequested,
  [E.ACTION_PAYMENT_SENT_SUBMITTED]: zActionPaymentSentSubmitted,
  [E.ACTION_MARK_AS_PAID_SUBMITTED]: zActionMarkAsPaidSubmitted,
  [E.BUSINESS_PAYMENT_CONFIRMED]: zBusinessPaymentConfirmed,

  // Invites
  [E.BUSINESS_INVITE_CODE_CREATED]: zBusinessInviteCodeCreated,
  [E.BUSINESS_INVITE_CODE_SHARED]: zBusinessInviteCodeShared,
  [E.BUSINESS_INVITE_CODE_CLAIMED]: zBusinessInviteCodeClaimed,

  // Tier-1: Landing & Language
  [E_T1.SCREEN_VIEW_LANDING]: zScreenViewLanding,
  [E_T1.ACTION_SIGNUP_CTA_CLICKED]: zActionSignupCtaClicked,
  [E_T1.ACTION_LOGIN_CTA_CLICKED]: zActionLoginCtaClicked,
  [E_T1.ACTION_INVITE_CLAIM_CTA_CLICKED]: zActionInviteClaimCtaClicked,
  [E_T1.ACTION_LANGUAGE_CHANGED]: zActionLanguageChanged,

  // Client UX Events
  [E.CLIENT_HOME_VIEWED]: zClientHomeViewed,
  [E.CLIENT_PROVIDER_CARD_TAPPED]: zClientProviderCardTapped,
  [E.CLIENT_PROVIDER_DETAIL_VIEWED]: zClientProviderDetailViewed,
  [E.CLIENT_LOGIN_SUCCESS]: zClientLoginSuccess,
  [E.CLIENT_PAYMENT_OPEN_MARK_PAID]: zClientPaymentOpenMarkPaid,
  [E.CLIENT_PAYMENT_RECORDED]: zClientPaymentRecorded,
};

/**
 * Helper to validate event payload against schema
 * Used in development mode only
 */
export function validateEventPayload(
  eventName: string,
  payload: Record<string, any>
): { valid: boolean; errors?: string[] } {
  const schema = schemaMap[eventName];

  if (!schema) {
    return { valid: true }; // No schema defined = assume valid
  }

  const result = schema.safeParse(payload);

  if (result.success) {
    return { valid: true };
  }

  return {
    valid: false,
    errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`),
  };
}
