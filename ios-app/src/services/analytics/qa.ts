/**
 * QA Utilities for Analytics Testing
 *
 * Provides dry-run mode for testing analytics events without sending to PostHog.
 * Events are logged to console with console.table() for easy verification.
 *
 * Usage:
 * - Enable dry-run mode in App.tsx during development
 * - Check console logs to verify events fire correctly
 * - Verify global properties are attached
 * - Test event payloads match schemas
 *
 * @see /docs/analytics/POSTHOG_IMPLEMENTATION_PLAN.md
 */

let DRY_RUN = false;

/**
 * Enable or disable dry-run mode
 * When enabled, events are logged to console instead of sent to PostHog
 *
 * @example
 * // In App.tsx (development only):
 * if (__DEV__) {
 *   enableDryRun(true);
 * }
 */
export function enableDryRun(v = true): void {
  DRY_RUN = v;

  if (__DEV__) {
    console.log(`[analytics] Dry-run mode: ${v ? 'ENABLED' : 'DISABLED'}`);
  }
}

/**
 * Check if dry-run mode is enabled
 */
export function isDryRunEnabled(): boolean {
  return DRY_RUN;
}

/**
 * Wrap a capture function with dry-run logging
 * This is the implementation from the PostHog spec
 *
 * @example
 * const wrappedCapture = withDryRun(capture);
 * wrappedCapture('action_session_started', { ... });
 */
export function withDryRun(
  captureFn: (name: string, payload: Record<string, any>) => void
): (name: string, payload: Record<string, any>) => void {
  return (name: string, payload: Record<string, any>) => {
    if (DRY_RUN && __DEV__) {
      // eslint-disable-next-line no-console
      console.log('[analytics][dry-run]', name);
      console.table(payload);
      return; // Don't call actual capture
    }

    captureFn(name, payload);
  };
}

/**
 * Log event without capturing (for testing)
 * Useful for manual verification of event payloads
 */
export function logEvent(name: string, payload: Record<string, any>): void {
  if (!__DEV__) return;

  console.log('═══════════════════════════════════════════');
  console.log(`📊 Event: ${name}`);
  console.log('═══════════════════════════════════════════');
  console.table(payload);
  console.log('═══════════════════════════════════════════\n');
}

/**
 * Validate event payload against schema (dev only)
 * Returns validation result without capturing event
 *
 * @example
 * const result = validateOnly('action_session_started', { ... });
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 */
export function validateOnly(
  name: string,
  payload: Record<string, any>
): { valid: boolean; errors?: string[] } {
  if (!__DEV__) {
    return { valid: true };
  }

  // Import here to avoid circular dependency
  const { validateEventPayload } = require('./events');
  return validateEventPayload(name, payload);
}

/**
 * Capture event with enhanced logging (dev only)
 * Shows event name, payload, and validation result
 */
export function captureWithLogging(
  captureFn: (name: string, payload: Record<string, any>) => void,
  name: string,
  payload: Record<string, any>
): void {
  if (!__DEV__) {
    captureFn(name, payload);
    return;
  }

  const validation = validateOnly(name, payload);

  console.log('═══════════════════════════════════════════');
  console.log(`📊 Capturing Event: ${name}`);
  console.log('═══════════════════════════════════════════');

  if (validation.valid) {
    console.log('✅ Validation: PASSED');
  } else {
    console.warn('⚠️  Validation: FAILED');
    console.warn('  Issues:', validation.errors);
  }

  console.table(payload);
  console.log('═══════════════════════════════════════════\n');

  // Always capture, even if validation fails
  captureFn(name, payload);
}
