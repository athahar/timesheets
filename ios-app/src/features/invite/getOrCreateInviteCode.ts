// Invite Code Helper - Reuses Existing Infrastructure
// Fetches pending invite or creates new one for unclaimed clients

import { directSupabase } from '../../services/directSupabase';
import { generateInviteLink } from '../../utils/inviteCodeGenerator';

export interface InviteCodeResult {
  code: string;  // Always UPPERCASE for display
  link: string;  // Empty string if generateInviteLink fails
}

/**
 * Get or create invite code for a client
 *
 * Logic:
 * 1. Try to find latest pending, unexpired invite (same as ClientProfileScreen)
 * 2. If found, return it
 * 3. Otherwise, create new invite via existing directSupabase method
 *
 * @param clientId - The client's UUID
 * @returns Promise<{ code: string, link: string }>
 */
export async function getOrCreateInviteCode(clientId: string): Promise<InviteCodeResult> {
  try {
    // 1) Try to find existing pending, unexpired invite
    const invites = await directSupabase.getInvites();
    const pendingInvite = invites.find(
      inv => inv.clientId === clientId &&
             inv.status === 'pending' &&
             new Date(inv.expiresAt) > new Date()
    );

    if (pendingInvite) {
      // Found existing invite - reuse it
      return {
        code: pendingInvite.inviteCode.toUpperCase(),
        link: generateInviteLink(pendingInvite.inviteCode) || ''
      };
    }

    // 2) No existing invite - create new one (same logic as ClientProfileScreen)
    const providerId = await directSupabase.getCurrentProviderId();
    const created = await directSupabase.createInviteForClient(clientId, providerId);

    return {
      code: created.inviteCode.toUpperCase(),
      link: generateInviteLink(created.inviteCode) || ''
    };
  } catch (error) {
    if (__DEV__) {
      console.error('Error in getOrCreateInviteCode:', error);
    }
    throw error;
  }
}
