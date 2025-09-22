// User Migration Utilities for TrackPay
// Helps existing users link their data to new auth accounts

import { supabase } from '../services/supabase';
import { generateUUID } from './uuid';

export interface ExistingUser {
  id: string;
  name: string;
  email?: string;
  role: 'provider' | 'client';
  hourly_rate?: number;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  linkedUserId?: string;
}

// Link existing user data to a newly authenticated user
export const linkExistingUserToAuth = async (
  authUserId: string,
  existingUserEmail: string
): Promise<MigrationResult> => {
  try {
    // Find existing user by email
    const { data: existingUsers, error: fetchError } = await supabase
      .from('trackpay_users')
      .select('*')
      .eq('email', existingUserEmail.toLowerCase())
      .is('auth_user_id', null); // Only unlinked users

    if (fetchError) {
      return { success: false, message: 'Database error occurred' };
    }

    if (!existingUsers || existingUsers.length === 0) {
      return {
        success: false,
        message: 'No existing account found with this email address'
      };
    }

    if (existingUsers.length > 1) {
      return {
        success: false,
        message: 'Multiple accounts found. Please contact support.'
      };
    }

    const existingUser = existingUsers[0];

    // Link the existing user to the auth user
    const { data: updatedUser, error: updateError } = await supabase
      .from('trackpay_users')
      .update({
        auth_user_id: authUserId,
        display_name: existingUser.display_name || existingUser.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingUser.id)
      .select()
      .single();

    if (updateError) {
      return { success: false, message: 'Failed to link account' };
    }

    return {
      success: true,
      message: 'Account successfully linked!',
      linkedUserId: existingUser.id
    };

  } catch (error) {
    console.error('Migration error:', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
};

// Check if user has existing data that can be migrated
export const checkForExistingUserData = async (email: string): Promise<{
  hasExistingData: boolean;
  userData?: ExistingUser;
}> => {
  try {
    const { data: existingUsers, error } = await supabase
      .from('trackpay_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .is('auth_user_id', null);

    if (error || !existingUsers) {
      return { hasExistingData: false };
    }

    if (existingUsers.length > 0) {
      return {
        hasExistingData: true,
        userData: existingUsers[0] as ExistingUser
      };
    }

    return { hasExistingData: false };
  } catch (error) {
    console.error('Error checking existing data:', error);
    return { hasExistingData: false };
  }
};

// Get all unlinked users (for admin purposes)
export const getUnlinkedUsers = async (): Promise<ExistingUser[]> => {
  try {
    const { data: unlinkedUsers, error } = await supabase
      .from('trackpay_users')
      .select('*')
      .is('auth_user_id', null);

    if (error) {
      console.error('Error fetching unlinked users:', error);
      return [];
    }

    return unlinkedUsers || [];
  } catch (error) {
    console.error('Error fetching unlinked users:', error);
    return [];
  }
};