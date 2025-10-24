/**
 * Analytics Event Deduplication
 *
 * Prevents duplicate event tracking in React StrictMode and other
 * scenarios where components mount/unmount rapidly.
 *
 * React StrictMode intentionally double-invokes effects in development,
 * which can cause duplicate analytics events. This utility provides
 * time-based deduplication to ensure each logical event is tracked once.
 */

/**
 * In-flight event tracking map
 * Key: Unique event identifier (e.g., "screen.viewed.ClientHome")
 * Value: Timestamp of last event with this key
 */
const inflightEvents = new Map<string, number>();

/**
 * Check if an event should be tracked or deduplicated
 *
 * Uses time-based deduplication: if the same event key was tracked
 * within the TTL window, it's considered a duplicate and should be skipped.
 *
 * @param key - Unique identifier for the event (e.g., "screen.viewed.ClientHome")
 * @param ttl - Time-to-live in milliseconds (default 500ms)
 * @returns true if event should be tracked, false if it's a duplicate
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   if (dedupeEventOnce('screen.viewed.ClientHome')) {
 *     trackEvent('screen.viewed', { screen: 'ClientHome' });
 *   }
 * }, []);
 * ```
 *
 * @example
 * // Custom TTL for rapid user actions
 * if (dedupeEventOnce('button.tapped.submit', 2000)) {
 *   trackEvent('button.tapped', { button: 'submit' });
 * }
 */
export const dedupeEventOnce = (key: string, ttl: number = 500): boolean => {
  const now = Date.now();
  const lastTracked = inflightEvents.get(key);

  // If event was tracked recently (within TTL), it's a duplicate
  if (lastTracked && now - lastTracked < ttl) {
    if (__DEV__) {
      console.log(`[Analytics] Dedupe: Skipping duplicate event "${key}"`);
    }
    return false;
  }

  // Track this event
  inflightEvents.set(key, now);
  return true;
};

/**
 * Clear deduplication state for a specific event
 *
 * Useful when you want to force an event to be tracked again
 * before the TTL expires.
 *
 * @param key - Event key to clear
 */
export const clearDedupeState = (key: string): void => {
  inflightEvents.delete(key);
};

/**
 * Clear all deduplication state
 *
 * Useful for testing or when user logs out.
 */
export const clearAllDedupeState = (): void => {
  inflightEvents.clear();
};

/**
 * Get current deduplication state (for debugging)
 *
 * @returns Map of event keys to their last tracked timestamps
 */
export const getDedupeState = (): ReadonlyMap<string, number> => {
  return new Map(inflightEvents);
};
