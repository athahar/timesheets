/**
 * Error Tracking for Analytics
 *
 * Minimal error tracking for Phase 1:
 * - App crashes (from ErrorBoundary)
 * - Network failures (basic)
 *
 * Deferred to Tier 1+:
 * - Axios/fetch interceptors
 * - Error boundary HOC
 * - Detailed error capture
 *
 * @see /docs/analytics/POSTHOG_IMPLEMENTATION_PLAN.md
 */

import { capture } from './posthog';

/**
 * Capture app crash event
 * Call from ErrorBoundary.componentDidCatch()
 *
 * @param e - Error object
 * @param screen_name - Optional: current screen where error occurred
 *
 * @example
 * // In ErrorBoundary.tsx:
 * componentDidCatch(error: Error, errorInfo: any) {
 *   captureAppCrash(error, this.getCurrentScreen());
 *   // Also send to Sentry if configured
 * }
 */
export function captureAppCrash(e: unknown, screen_name?: string): void {
  capture('error_app_crashed', {
    screen_name,
    fatal: true,
    stack: String(e),
  });
}

/**
 * Capture network failure event
 * Call when API requests fail
 *
 * @param info - Network error information
 *
 * @example
 * try {
 *   await fetch('/api/sessions');
 * } catch (error) {
 *   captureNetworkError({
 *     screen_name: 'ClientList',
 *     operation: 'fetch_sessions',
 *     status_code: error.status,
 *     retryable: error.status >= 500,
 *   });
 * }
 */
export function captureNetworkError(info: {
  screen_name?: string;
  operation?: string;
  status_code?: number;
  retryable?: boolean;
}): void {
  capture('error_network_failure', info);
}
