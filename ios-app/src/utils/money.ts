/**
 * Money Utility Functions
 *
 * Provides locale-aware currency formatting and parsing.
 * Handles different decimal separators (comma vs period) across locales.
 */

/**
 * Format cents as currency string using locale conventions
 *
 * @param cents - Amount in cents (e.g., 1885 = $18.85)
 * @param currency - ISO 4217 currency code (e.g., "USD", "EUR")
 * @param locale - BCP 47 locale code (e.g., "en-US", "es-ES")
 * @returns Formatted currency string (e.g., "$18.85" or "18,85 €")
 *
 * @example
 * moneyFormat(1885, "USD", "en-US") // "$18.85"
 * moneyFormat(1885, "EUR", "es-ES") // "18,85 €"
 */
export const moneyFormat = (
  cents: number,
  currency: string,
  locale: string
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

/**
 * Parse localized money string to cents
 *
 * Handles both comma and period decimal separators based on locale.
 * Strips currency symbols and thousands separators.
 *
 * @param s - Money string (e.g., "$18.85", "18,85 €", "1.234,56")
 * @param locale - BCP 47 locale code to determine decimal separator
 * @param currency - ISO 4217 currency code (not currently used, reserved for future)
 * @returns Amount in cents, or 0 if invalid input
 *
 * @example
 * parseLocalizedMoney("$18.85", "en-US", "USD") // 1885
 * parseLocalizedMoney("18,85 €", "es-ES", "EUR") // 1885
 * parseLocalizedMoney("1.234,56", "de-DE", "EUR") // 123456
 */
export const parseLocalizedMoney = (
  s: string,
  locale: string,
  currency: string
): number => {
  // Detect decimal separator for this locale
  // Format a test number (1.1) and extract the separator character
  const decimalSeparator = (1.1).toLocaleString(locale).substring(1, 2);

  // Remove all characters except digits and the decimal separator
  // Then normalize decimal separator to period for Number parsing
  const normalized = s
    .replace(new RegExp(`[^0-9\\${decimalSeparator}]`, 'g'), '')
    .replace(decimalSeparator, '.');

  const num = Number(normalized);

  // Return cents (multiply by 100 and round to avoid floating point issues)
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
};

/**
 * Validate that an amount in cents is within reasonable bounds
 *
 * @param cents - Amount to validate
 * @param maxCents - Maximum allowed amount in cents (default 1 million dollars = 100000000 cents)
 * @returns true if valid, false otherwise
 */
export const isValidAmount = (
  cents: number,
  maxCents: number = 100000000
): boolean => {
  return Number.isFinite(cents) && cents >= 0 && cents <= maxCents;
};
