// Invite Share Message Builders
// SMS-safe messages (<160 chars) for hours tracking and payment requests

// TODO: Update with actual App Store link when available
const APP_STORE_LINK = 'https://apps.apple.com/app/trackpay/idXXXXXX';
const APP_NAME = process.env.EXPO_PUBLIC_APP_DISPLAY_NAME || 'TrackPay';

/**
 * Convert "HH:MM" format to human-readable text
 * Examples:
 *   "0:01" → "1min"
 *   "1:00" → "1hr"
 *   "1:30" → "1hr 30min"
 *   "2:45" → "2hr 45min"
 */
function formatDurationText(duration: string): string {
  const [hoursStr, minutesStr] = duration.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (hours === 0 && minutes === 0) {
    return '0min';
  }

  if (hours === 0) {
    return `${minutes}min`;
  }

  if (minutes === 0) {
    return `${hours}hr`;
  }

  return `${hours}hr ${minutes}min`;
}

export interface HoursShareParams {
  firstName: string;
  duration: string; // Format: "HH:MM"
  link: string;     // From generateInviteLink() or empty
  code: string;     // UPPERCASE invite code
}

export interface PaymentShareParams {
  firstName: string;
  amount: string;   // Pre-formatted "$XX.XX"
  duration: string; // Format: "HH:MM"
  link: string;     // From generateInviteLink() or empty
  code: string;     // UPPERCASE invite code
}

/**
 * Build share message for post-session hours tracking
 *
 * Template (with link):
 * "Hi {First}, I did {HH:MM} today.
 * You can see my hours and track everything here: {link}
 * Download {APP_NAME} and use code {CODE} to be connected with me."
 *
 * Fallback (no link):
 * "Hi {First}, I did {HH:MM} today.
 * Get the {APP_NAME} app and use code {CODE} to connect with me.
 * {APP_STORE_LINK}"
 *
 * @param params - firstName, duration, link, code
 * @returns SMS-safe message string (~160 chars)
 */
export function buildHoursShare(params: HoursShareParams): string {
  const { firstName, duration, link, code } = params;
  const durationText = formatDurationText(duration);

  if (link) {
    return `Hi ${firstName}, I did ${durationText} today.\nYou can see my hours and track everything here: ${link}\nDownload ${APP_NAME} and use code ${code} to be connected with me.`;
  }

  // Fallback if generateInviteLink() failed
  return `Hi ${firstName}, I did ${durationText} today.\nGet the ${APP_NAME} app and use code ${code} to connect with me.\n${APP_STORE_LINK}`;
}

/**
 * Build share message for payment request
 *
 * Template (with link):
 * "Hi {First}, I've requested {$XX.XX} for {HH:MM}.
 * Review hours worked here: {link}
 * Download {APP_NAME} and use code {CODE} to track everything together."
 *
 * Fallback (no link):
 * "Hi {First}, I've requested {$XX.XX} for {HH:MM}.
 * Get the {APP_NAME} app and use code {CODE} to track everything together.
 * {APP_STORE_LINK}"
 *
 * @param params - firstName, amount, duration, link, code
 * @returns SMS-safe message string (~160 chars)
 */
export function buildPaymentShare(params: PaymentShareParams): string {
  const { firstName, amount, duration, link, code } = params;
  const durationText = formatDurationText(duration);

  if (link) {
    return `Hi ${firstName}, I've requested ${amount} for ${durationText}.\nReview hours worked here: ${link}\nDownload ${APP_NAME} and use code ${code} to track everything together.`;
  }

  // Fallback if generateInviteLink() failed
  return `Hi ${firstName}, I've requested ${amount} for ${durationText}.\nGet the ${APP_NAME} app and use code ${code} to track everything together.\n${APP_STORE_LINK}`;
}
