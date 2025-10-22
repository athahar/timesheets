/**
 * PostHog Feature Flags
 *
 * Provides helpers for feature flag evaluation.
 *
 * IMPORTANT: Call identify() BEFORE checking feature flags
 * PostHog evaluates flags per user, so identity must be set first.
 *
 * Flags defined in PostHog:
 * - invite_modal_on_stop (bool/multivariate): Gate stop-session growth modal
 * - sample_timer_ticks (bool): Enable timer tick sampling (not used in Phase 1)
 *
 * @see /docs/analytics/POSTHOG_IMPLEMENTATION_PLAN.md
 */

import { getPostHogClient } from './posthog';

/**
 * Check if a feature flag is enabled
 *
 * CRITICAL: Call identify() BEFORE checking flags
 *
 * @example
 * const showModal = await isEnabled('invite_modal_on_stop');
 * if (showModal && !clientIsRegistered) {
 *   // Show invite modal
 * }
 */
export async function isEnabled(name: string): Promise<boolean> {
  const posthog = getPostHogClient();

  if (!posthog) {
    if (__DEV__) {
      console.warn('[analytics] PostHog not initialized, flag check failed:', name);
    }
    return false;
  }

  try {
    const enabled = await posthog.isFeatureEnabled(name);
    return !!enabled;
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] isEnabled() failed:', name, error);
    }
    return false;
  }
}

/**
 * Get feature flag payload (for multivariate flags)
 *
 * Use this for flags with additional configuration data.
 * For example, invite_modal_on_stop could return { title, cta, variant }
 *
 * @example
 * const modalConfig = await getFlagPayload<{ title: string; cta: string }>('invite_modal_on_stop');
 * if (modalConfig) {
 *   showModal(modalConfig.title, modalConfig.cta);
 * }
 */
export async function getFlagPayload<T = unknown>(name: string): Promise<T | null> {
  const posthog = getPostHogClient();

  if (!posthog) {
    if (__DEV__) {
      console.warn('[analytics] PostHog not initialized, flag payload check failed:', name);
    }
    return null;
  }

  try {
    // @ts-ignore - PostHog types may not include getFeatureFlagPayload
    const payload = await posthog.getFeatureFlagPayload?.(name);
    return (payload as T) ?? null;
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] getFlagPayload() failed:', name, error);
    }
    return null;
  }
}

// ============================================
// KNOWN FLAGS (for type safety & documentation)
// ============================================

/**
 * Known feature flags in PostHog
 * Use these constants to avoid typos
 */
export const FLAGS = {
  /**
   * invite_modal_on_stop
   * Type: Boolean or Multivariate
   * Controls whether to show invite modal after session stop for unregistered clients
   */
  INVITE_MODAL_ON_STOP: 'invite_modal_on_stop',

  /**
   * sample_timer_ticks
   * Type: Boolean
   * Enable session timer tick sampling (not used in Phase 1)
   */
  SAMPLE_TIMER_TICKS: 'sample_timer_ticks',
} as const;
