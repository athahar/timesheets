/**
 * PostHog Analytics SDK Wrapper
 *
 * Provides a clean interface for PostHog analytics with:
 * - Initialization and configuration
 * - Identity management (identify, alias)
 * - Group analytics (provider/client)
 * - Event capture with Zod validation (dev only)
 * - Feature flags
 * - Opt-out support
 *
 * @see /docs/analytics/POSTHOG_IMPLEMENTATION_PLAN.md
 */

import PostHog from 'posthog-react-native';
import { schemaMap, E } from './events';
import { getCachedGlobals } from './context';
import { isDryRunEnabled } from './qa';

let posthogClient: PostHog | null = null;
let isOptedOut = false;

// ============================================
// NORMALIZATION HELPERS
// ============================================

type EventName = string;

/**
 * Convert date to ISO 8601 string
 */
const toIso = (d: string | Date): string => (typeof d === 'string' ? d : d.toISOString());

/**
 * Calculate days between two ISO timestamps
 */
const daysBetween = (startIso: string, endIso: string): number => {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  return Math.max(0, Math.floor((e - s) / 86400000));
};

/**
 * Normalize payloads to canonical Tier-0 contract
 * - Maps drift fields (amount_paid → total_amount)
 * - Computes missing fields (days_since_session_completed)
 * - Normalizes share methods
 * - Removes PII (names)
 */
function normalizePayload(name: EventName, payload: Record<string, any>): Record<string, any> {
  const p = { ...payload };

  // 1) Payments: amount_paid -> total_amount
  if (p.amount_paid != null && p.total_amount == null) {
    p.total_amount = p.amount_paid;
    delete p.amount_paid;
  }

  // 2) Payment confirmed: compute days_since_session_completed if missing
  if (name === E.BUSINESS_PAYMENT_CONFIRMED) {
    if (p.confirmed_at && p.days_since_session_completed == null && p.session_end_time) {
      p.days_since_session_completed = daysBetween(String(p.session_end_time), String(p.confirmed_at));
    }
    // alias session_ids -> payment_ids if needed
    if (!p.payment_ids && Array.isArray(p.session_ids)) {
      p.payment_ids = p.session_ids;
    }
  }

  // 3) Session stopped: tolerate duration_minutes vs total_duration_minutes
  if (name === E.ACTION_SESSION_STOPPED) {
    if (p.duration_minutes != null && p.total_duration_minutes == null) {
      p.total_duration_minutes = p.duration_minutes;
      delete p.duration_minutes;
    }
  }

  // 4) Share method normalization: share_sheet/copy_code -> copy_link or add share_target
  if (name === E.BUSINESS_INVITE_CODE_SHARED && p.share_method) {
    const method = String(p.share_method);
    if (method === 'share_sheet') {
      // keep method as "copy_link" by default unless caller set a share_target
      if (!p.share_target) p.share_target = 'other';
    }
    if (method === 'copy_code') p.share_method = 'copy_link';
  }

  // 5) Remove PII names (compliance - names should be in group properties)
  delete p.client_name;
  delete p.provider_name;

  return p;
}

/**
 * Initialize PostHog SDK
 * Call this once on app startup (after i18n initialization)
 */
export function initPosthog(config: { key: string; host: string }): void {
  if (!config.key || !config.host) {
    if (__DEV__) {
      console.warn('[analytics] PostHog key or host missing, analytics disabled');
    }
    return;
  }

  try {
    posthogClient = new PostHog(config.key, {
      host: config.host,
      captureApplicationLifecycleEvents: true,
      captureDeviceInfo: true,
      enable: true,
    });

    if (__DEV__) {
      console.log('[analytics] PostHog initialized successfully');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] PostHog initialization failed:', error);
    }
  }
}

/**
 * Identify a user with properties
 * Call after login or registration (AFTER alias if needed)
 *
 * @example
 * await identify(user.id, {
 *   user_role: 'provider',
 *   language: 'en-US',
 *   timezone: 'America/Los_Angeles',
 * });
 */
export async function identify(
  userId: string,
  properties?: Record<string, any>
): Promise<void> {
  if (!posthogClient || isOptedOut) return;

  try {
    await posthogClient.identify(userId, properties);

    if (__DEV__) {
      console.log('[analytics] User identified:', userId, properties);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] identify() failed:', error);
    }
  }
}

/**
 * Alias: Stitch anonymous user to authenticated user
 * CRITICAL: Call this BEFORE identify() after registration
 *
 * @example
 * await alias(newUser.id);           // Step 1: Stitch anon → authed
 * await identify(newUser.id, {...}); // Step 2: Set person props
 */
export async function alias(userId: string): Promise<void> {
  if (!posthogClient || isOptedOut) return;

  try {
    await posthogClient.alias(userId);

    if (__DEV__) {
      console.log('[analytics] User aliased:', userId);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] alias() failed:', error);
    }
  }
}

/**
 * Set group context for two-sided analytics
 * CRITICAL: Call this BEFORE capturing business events
 *
 * @param type - 'provider' | 'client'
 * @param id - The provider or client ID
 *
 * @example
 * group('provider', providerId);
 * group('client', clientId);
 * capture('business_payment_confirmed', { ... });
 */
export function group(type: 'provider' | 'client', id: string): void {
  if (!posthogClient || isOptedOut) return;

  try {
    posthogClient.group(type, id);

    if (__DEV__) {
      console.log(`[analytics] Group set: ${type} = ${id}`);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] group() failed:', error);
    }
  }
}

/**
 * Set group properties (names, metadata)
 * Call this once per provider/client to set readable labels in PostHog
 * This avoids sending PII in every event
 *
 * @param type - 'provider' | 'client'
 * @param id - The provider or client ID
 * @param properties - Group properties (name, created_at, etc.)
 *
 * @example
 * // After login/registration:
 * group('provider', providerId);
 * setGroupProperties('provider', providerId, {
 *   name: 'John Doe Landscaping',
 *   created_at: new Date().toISOString(),
 * });
 */
export function setGroupProperties(
  type: 'provider' | 'client',
  id: string,
  properties: Record<string, any>
): void {
  if (!posthogClient || isOptedOut) return;

  try {
    // @ts-ignore - PostHog RN SDK supports setGroupProperties
    posthogClient.setGroupProperties?.(type, id, properties);

    if (__DEV__) {
      console.log(`[analytics] Group properties set: ${type} = ${id}`, properties);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] setGroupProperties() failed:', error);
    }
  }
}

/**
 * Reset groups (useful for account switching)
 */
export function resetGroups(): void {
  // PostHog doesn't have explicit resetGroups(), but you can re-set them
  // This is a placeholder for when you switch contexts
  if (__DEV__) {
    console.log('[analytics] Groups reset - re-set them before next business event');
  }
}

/**
 * Capture an analytics event
 * - Validates payload with Zod in dev mode (warns, never throws)
 * - Merges with global properties from context
 * - Respects opt-out state
 *
 * @param name - Event name (use constants from events.ts)
 * @param payload - Event-specific properties
 *
 * @example
 * capture('action_session_started', {
 *   client_id: 'abc123',
 *   crew_size: 2,
 *   hourly_rate: 25,
 *   start_time: new Date().toISOString(),
 * });
 */
export function capture(name: string, payload: Record<string, any> = {}): void {
  if (isOptedOut) {
    if (__DEV__) {
      console.log('[analytics] Event blocked (opted out):', name);
    }
    return;
  }

  // Normalize payload to canonical Tier-0 contract
  const normalized = normalizePayload(name, payload);

  // Merge global properties with normalized payload
  // Event-specific properties take precedence over globals
  const globals = getCachedGlobals();
  const mergedPayload = { ...globals, ...normalized };

  // Dry-run mode: log to console instead of sending
  if (__DEV__ && isDryRunEnabled()) {
    console.log(`[analytics][dry-run] ${name}`);
    console.table(mergedPayload);

    // Still validate in dry-run mode
    const schema = schemaMap[name];
    if (schema) {
      const result = schema.safeParse(normalized);
      if (!result.success) {
        console.warn('[analytics] ⚠️  Schema validation failed:');
        console.warn('  Issues:', result.error.issues);
      } else {
        console.log('[analytics] ✅ Schema validation passed');
      }
    }
    return; // Don't send to PostHog in dry-run mode
  }

  // Validate normalized payload in dev mode (non-dry-run)
  if (__DEV__) {
    const schema = schemaMap[name];
    if (schema) {
      const result = schema.safeParse(normalized);
      if (!result.success) {
        console.warn('[analytics] Schema mismatch:', name);
        console.warn('  Issues:', result.error.issues);
        console.warn('  Payload (normalized):', normalized);
        // Continue anyway - still send event
      }
    }
  }

  // Send to PostHog
  if (!posthogClient) {
    if (__DEV__) {
      console.warn('[analytics] PostHog client not initialized');
    }
    return;
  }

  try {
    posthogClient.capture(name, mergedPayload);

    if (__DEV__) {
      console.log(`[analytics] Event captured: ${name}`);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] capture() failed:', error);
    }
  }
}

/**
 * Check if a feature flag is enabled
 * CRITICAL: Call identify() BEFORE checking flags
 *
 * @example
 * const showModal = await isFeatureEnabled('invite_modal_on_stop');
 */
export async function isFeatureEnabled(flagName: string): Promise<boolean> {
  if (!posthogClient || isOptedOut) return false;

  try {
    const enabled = await posthogClient.isFeatureEnabled(flagName);
    return !!enabled;
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] isFeatureEnabled() failed:', error);
    }
    return false;
  }
}

/**
 * Get feature flag payload (for multivariate flags)
 *
 * @example
 * const modalConfig = await getFeatureFlagPayload<{ title: string }>('invite_modal_on_stop');
 */
export async function getFeatureFlagPayload<T = unknown>(
  flagName: string
): Promise<T | null> {
  if (!posthogClient || isOptedOut) return null;

  try {
    // @ts-ignore - PostHog types may not include getFeatureFlagPayload
    const payload = await posthogClient.getFeatureFlagPayload?.(flagName);
    return (payload as T) ?? null;
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] getFeatureFlagPayload() failed:', error);
    }
    return null;
  }
}

/**
 * Opt out of analytics tracking
 * This makes all capture() calls no-ops
 */
export function optOut(): void {
  isOptedOut = true;
  posthogClient?.optOut();

  if (__DEV__) {
    console.log('[analytics] User opted out');
  }
}

/**
 * Opt in to analytics tracking
 */
export function optIn(): void {
  isOptedOut = false;
  posthogClient?.optIn();

  if (__DEV__) {
    console.log('[analytics] User opted in');
  }
}

/**
 * Check if user is opted out
 */
export function isOptedOutStatus(): boolean {
  return isOptedOut;
}

/**
 * Reset PostHog state (call on logout)
 * Clears distinctId, person props, and groups
 */
export async function reset(): Promise<void> {
  if (!posthogClient) return;

  try {
    await posthogClient.reset();

    if (__DEV__) {
      console.log('[analytics] PostHog reset (logout)');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] reset() failed:', error);
    }
  }
}

/**
 * Flush queued events (call on app background)
 */
export async function flush(): Promise<void> {
  if (!posthogClient) return;

  try {
    await posthogClient.flush();

    if (__DEV__) {
      console.log('[analytics] Events flushed');
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[analytics] flush() failed:', error);
    }
  }
}

/**
 * Get PostHog client instance (for advanced usage)
 * Use with caution
 */
export function getPostHogClient(): PostHog | null {
  return posthogClient;
}
