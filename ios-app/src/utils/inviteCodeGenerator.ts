// Invite Code Generation Utility
// Generates unique 8-character invite codes for client invitations

/**
 * Generates a random 8-character invite code
 * Format: ABC12XYZ (alphanumeric, uppercase)
 * Excludes confusing characters: 0, O, I, L
 */
export function generateInviteCode(): string {
  // Character set excluding confusing characters (0, O, I, L)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ123456789';
  let code = '';

  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

/**
 * Validates an invite code format
 * @param code - The invite code to validate
 * @returns true if the code matches the expected format
 */
export function validateInviteCodeFormat(code: string): boolean {
  // Must be exactly 8 characters, alphanumeric, uppercase
  const validPattern = /^[A-Z0-9]{8}$/;

  // Exclude confusing characters
  const hasConfusingChars = /[0OIL]/.test(code);

  return validPattern.test(code) && !hasConfusingChars;
}

/**
 * Generates a shareable invite link
 * @param inviteCode - The 8-character invite code
 * @param useDeepLink - Whether to use deep link (trackpay://) or web link
 * @returns The shareable invite link
 */
export function generateInviteLink(inviteCode: string, useDeepLink: boolean = true): string {
  if (useDeepLink) {
    return `trackpay://invite/${inviteCode}`;
  } else {
    // Web fallback URL (would redirect to app or show web claiming page)
    return `https://trackpay.app/invite/${inviteCode}`;
  }
}

/**
 * Extracts invite code from various link formats
 * @param link - The invite link or code
 * @returns The extracted invite code or null if invalid
 */
export function extractInviteCode(link: string): string | null {
  // Handle direct codes (just the 8-character code)
  if (validateInviteCodeFormat(link)) {
    return link;
  }

  // Handle deep links: trackpay://invite/ABC12XYZ
  const deepLinkMatch = link.match(/trackpay:\/\/invite\/([A-Z0-9]{8})/);
  if (deepLinkMatch) {
    return deepLinkMatch[1];
  }

  // Handle web links: https://trackpay.app/invite/ABC12XYZ
  const webLinkMatch = link.match(/https?:\/\/trackpay\.app\/invite\/([A-Z0-9]{8})/);
  if (webLinkMatch) {
    return webLinkMatch[1];
  }

  return null;
}

/**
 * Generates invite expiration date (7 days from now by default)
 * @param daysFromNow - Number of days until expiration (default: 7)
 * @returns Date object for expiration
 */
export function generateExpirationDate(daysFromNow: number = 7): Date {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + daysFromNow);
  return expiration;
}

/**
 * Checks if an invite has expired
 * @param expiresAt - The expiration date
 * @returns true if the invite has expired
 */
export function isInviteExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Formats time remaining until expiration
 * @param expiresAt - The expiration date
 * @returns Human-readable time remaining (e.g., "2 days", "3 hours")
 */
export function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const timeLeft = expiresAt.getTime() - now.getTime();

  if (timeLeft <= 0) {
    return 'Expired';
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}