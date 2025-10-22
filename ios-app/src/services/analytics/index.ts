/**
 * PostHog Analytics - Barrel Export
 *
 * Central export point for all analytics functionality.
 *
 * @see /docs/analytics/POSTHOG_IMPLEMENTATION_PLAN.md
 */

// Core SDK
export {
  initPosthog,
  identify,
  alias,
  group,
  setGroupProperties,
  resetGroups,
  capture,
  isFeatureEnabled,
  getFeatureFlagPayload,
  optOut,
  optIn,
  isOptedOutStatus,
  reset,
  flush,
  getPostHogClient,
} from './posthog';

// Event constants and types
export { E, E_T1, UserRole, RegistrationMethod, ShareMethod, ActivationAction } from './events';
export type {
  ScreenViewClientList,
  ScreenViewSessionTracking,
  ScreenViewClientHistory,
  ScreenViewProviderList,
  ScreenViewProviderSummary,
  ScreenViewInviteClaim,
  AuthRegisterSubmitted,
  BusinessUserRegistered,
  BusinessUserActivated,
  AuthInviteClaimed,
  ActionSessionStarted,
  ActionSessionStopped,
  BusinessSessionCompleted,
  ActionPaymentRequested,
  BusinessPaymentRequested,
  ActionPaymentSentSubmitted,
  ActionMarkAsPaidSubmitted,
  BusinessPaymentConfirmed,
  BusinessInviteCodeCreated,
  BusinessInviteCodeShared,
  BusinessInviteCodeClaimed,
  // Tier-1 types
  ScreenViewLanding,
  ActionSignupCtaClicked,
  ActionLoginCtaClicked,
  ActionInviteClaimCtaClicked,
  ActionLanguageChanged,
} from './events';

// Global properties context
export {
  AnalyticsProvider,
  useAnalytics,
  getGlobals,
  getCachedGlobals,
  clearGlobalPropertiesCache,
} from './context';
export type { GlobalProperties } from './context';

// Navigation tracking
export { trackNavigation, isTrackedRoute, getTrackedRoutes } from './navigation';

// Feature flags
export { isEnabled, getFlagPayload, FLAGS } from './flags';

// QA utilities
export {
  enableDryRun,
  isDryRunEnabled,
  withDryRun,
  logEvent,
  validateOnly,
  captureWithLogging,
} from './qa';

// Error tracking
export { captureAppCrash, captureNetworkError } from './error';

// Utility helpers
export {
  nowIso,
  daysBetween,
  generatePaymentRequestId,
  calculatePersonHours,
  calculateAmount,
} from './utils';
