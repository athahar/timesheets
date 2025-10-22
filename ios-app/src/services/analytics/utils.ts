/**
 * Utility Helpers for Analytics
 *
 * Common helpers for consistent data formatting:
 * - ISO timestamp generation
 * - Date calculations
 *
 * @see /docs/analytics/POSTHOG_IMPLEMENTATION_PLAN.md
 */

/**
 * Get current timestamp in ISO 8601 format
 * Use this for all timestamp fields (created_at, requested_at, etc.)
 *
 * @example
 * capture('business_payment_requested', {
 *   requested_at: nowIso(),
 * });
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Calculate days between two dates
 * Useful for metrics like days_since_registration, days_since_session_completed
 *
 * @param start - Start date (Date object or ISO string)
 * @param end - End date (Date object or ISO string)
 * @returns Number of days (floored)
 *
 * @example
 * const daysSince = daysBetween(sessionEndTime, new Date());
 */
export function daysBetween(start: Date | string, end: Date | string = new Date()): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;

  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Generate a payment request ID
 * Format: req_{timestamp}_{random}
 *
 * @example
 * const requestId = generatePaymentRequestId();
 * // => "req_1729622400000_abc123"
 */
export function generatePaymentRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6);
  return `req_${timestamp}_${random}`;
}

/**
 * Calculate person-hours from duration and crew size
 * person_hours = (duration_minutes / 60) * crew_size
 *
 * @param durationMinutes - Session duration in minutes
 * @param crewSize - Number of crew members
 * @returns Person-hours (rounded to 2 decimals)
 *
 * @example
 * const personHours = calculatePersonHours(120, 2); // 4.0
 */
export function calculatePersonHours(durationMinutes: number, crewSize: number): number {
  const hours = durationMinutes / 60;
  const personHours = hours * crewSize;
  return Math.round(personHours * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate total amount from person-hours and hourly rate
 * total_amount = person_hours * hourly_rate
 *
 * @param personHours - Person-hours worked
 * @param hourlyRate - Rate per hour
 * @returns Total amount (rounded to 2 decimals)
 *
 * @example
 * const amount = calculateAmount(4.5, 25); // 112.50
 */
export function calculateAmount(personHours: number, hourlyRate: number): number {
  const amount = personHours * hourlyRate;
  return Math.round(amount * 100) / 100; // Round to 2 decimals
}
