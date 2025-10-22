/**
 * Navigation Tracking for PostHog Analytics
 *
 * Tracks screen view events for the 6 Tier-0 screens:
 * - ClientList, SessionTracking, ClientHistory (Provider)
 * - ServiceProviderList, ServiceProviderSummary (Client)
 * - InviteClaim (Deep link)
 *
 * Features:
 * - Maps route names to event names
 * - Includes previous_screen property
 * - De-dupes (ignores if previous === current)
 *
 * @see /docs/analytics/POSTHOG_IMPLEMENTATION_PLAN.md
 */

import { E } from './events';
import { capture } from './posthog';

/**
 * Tier-0 Screen Mapping
 * ONLY these 6 screens are tracked in Phase 1
 */
const TIER_0_SCREEN_MAP: Record<string, string> = {
  ClientList: E.SCREEN_VIEW_CLIENT_LIST,
  SessionTracking: E.SCREEN_VIEW_SESSION_TRACKING,
  ClientHistory: E.SCREEN_VIEW_CLIENT_HISTORY,
  ServiceProviderList: E.SCREEN_VIEW_PROVIDER_LIST,
  ServiceProviderSummary: E.SCREEN_VIEW_PROVIDER_SUMMARY,
  InviteClaim: E.SCREEN_VIEW_INVITE_CLAIM,
};

/**
 * Track navigation event
 * Call this from React Navigation's onStateChange listener
 *
 * @param previousRouteName - Previous route name (null if first screen)
 * @param currentRouteName - Current route name
 * @param params - Optional route params (e.g., clientId, providerId)
 *
 * @example
 * // In AppNavigator.tsx:
 * onStateChange={() => {
 *   const prev = routeNameRef.current;
 *   const current = navigationRef.current?.getCurrentRoute()?.name;
 *   const params = navigationRef.current?.getCurrentRoute()?.params;
 *   if (prev !== current && current) {
 *     trackNavigation(prev || null, current, params);
 *   }
 *   routeNameRef.current = current;
 * }}
 */
export function trackNavigation(
  previousRouteName: string | null,
  currentRouteName: string,
  params?: Record<string, any>
): void {
  // De-dupe: Ignore if navigating to same screen
  if (previousRouteName === currentRouteName) {
    if (__DEV__) {
      console.log('[analytics] Navigation de-duped (same screen):', currentRouteName);
    }
    return;
  }

  // Check if this is a Tier-0 screen
  const eventName = TIER_0_SCREEN_MAP[currentRouteName];

  if (!eventName) {
    // Not a Tier-0 screen, don't track
    if (__DEV__) {
      console.log('[analytics] Screen not tracked (not Tier-0):', currentRouteName);
    }
    return;
  }

  // Build payload
  const payload: Record<string, any> = {
    previous_screen: previousRouteName,
  };

  // Add screen-specific params
  if (currentRouteName === 'SessionTracking' && params?.clientId) {
    payload.client_id = params.clientId;
  }

  if (currentRouteName === 'ClientHistory') {
    if (params?.clientId) {
      payload.client_id = params.clientId;
    }
    // Removed client_name (PII) - use PostHog Groups for readable labels
  }

  if (currentRouteName === 'ServiceProviderSummary' && params?.providerId) {
    payload.provider_id = params.providerId;
  }

  if (currentRouteName === 'InviteClaim') {
    payload.deep_link = true;
    if (params?.inviteCode) {
      payload.invite_code = params.inviteCode;
    }
  }

  // Capture event
  capture(eventName, payload);
}

/**
 * Helper to check if a route is tracked
 * Useful for debugging
 */
export function isTrackedRoute(routeName: string): boolean {
  return routeName in TIER_0_SCREEN_MAP;
}

/**
 * Get list of all tracked routes
 * Useful for documentation/debugging
 */
export function getTrackedRoutes(): string[] {
  return Object.keys(TIER_0_SCREEN_MAP);
}
