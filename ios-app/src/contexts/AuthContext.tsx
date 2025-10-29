import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { generateUUID } from '../utils/uuid';
import { linkExistingUserToAuth, checkForExistingUserData } from '../utils/userMigration';
// Analytics
import {
  identify,
  alias,
  reset as resetAnalytics,
  clearGlobalPropertiesCache,
  useAnalytics,
  nowIso,
  E,
  capture,
} from '../services/analytics';
// Dynamic Island
import {
  getActiveActivities,
  endDynamicIslandActivity
} from '../services/native/DynamicIslandBridge';

export interface UserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  display_name?: string;
  role: 'provider' | 'client';
  hourly_rate?: number;
  has_seen_welcome?: boolean; // Track if client has seen welcome modal after invite claim
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName: string, role: 'provider' | 'client', skipProfileCreation?: boolean) => Promise<{ error?: string; data?: { user: User } }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: string }>;
  reloadUserProfile: (userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setUserId, setUserRole } = useAnalytics();

  const isAuthenticated = !!user && !!session;

  // Load user profile from database
  const loadUserProfile = async (authUserId: string): Promise<UserProfile | null> => {
    try {
      // Get the most recent record if there are duplicates
      const { data, error } = await supabase
        .from('trackpay_users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        if (__DEV__) {
          console.error('Error loading user profile:', error);
        }
        return null;
      }

      // Return the first (most recent) record
      if (data && data.length > 0) {
        return data[0] as UserProfile;
      }

      return null;
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading user profile:', error);
      }
      return null;
    }
  };

  // Create user profile in database
  const createUserProfile = async (
    authUser: User,
    displayName: string,
    role: 'provider' | 'client'
  ): Promise<UserProfile | null> => {
    try {
      const newProfile: Omit<UserProfile, 'created_at' | 'updated_at' | 'display_name'> = {
        id: generateUUID(),
        auth_user_id: authUser.id,
        email: authUser.email!,
        name: displayName,
        role,
      };

      const { data, error } = await supabase
        .from('trackpay_users')
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        if (__DEV__) {
          console.error('Error creating user profile:', error);
          console.error('Full error details:', JSON.stringify(error, null, 2));
        }
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      if (__DEV__) {
        console.error('Error creating user profile:', error);
      }
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          if (__DEV__) {
            console.error('Error getting session:', error);
          }
          setIsLoading(false);
          return;
        }

        if (session?.user && mounted) {
          setSession(session);
          setUser(session.user);

          // Load user profile with timeout to prevent hanging
          try {
            const profile = await Promise.race([
              loadUserProfile(session.user.id),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile load timeout')), 5000)
              )
            ]);

            if (profile && mounted) {
              setUserProfile(profile);
            }
          } catch (error) {
            // Continue without profile - user can create one later
            if (mounted) {
              setUserProfile(null);
            }
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Error initializing auth:', error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Load user profile with simplified auto-fix
          const loadProfileWithFix = async () => {
            try {
              // First try loading by auth_user_id
              let profile = await loadUserProfile(session.user.id);

              // If not found, try to find and fix by email
              if (!profile && session.user.email) {
                const { data: existingUser, error: findError } = await supabase
                  .from('trackpay_users')
                  .select('*')
                  .eq('email', session.user.email)
                  .single();

                if (!findError && existingUser) {
                  await supabase
                    .from('trackpay_users')
                    .update({ auth_user_id: session.user.id })
                    .eq('id', existingUser.id);

                  // Try loading again
                  profile = await loadUserProfile(session.user.id);
                }
              }

              return profile;
            } catch (error) {
              if (__DEV__) {
                console.error('Profile loading error:', error);
              }
              return null;
            }
          };

          // Load with 3 second timeout to prevent hanging
          try {
            const profile = await Promise.race([
              loadProfileWithFix(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile load timeout')), 3000)
              )
            ]);

            setUserProfile(profile);

            // Analytics: Update global context and identify user after profile loaded
            if (profile && session?.user) {
              try {
                // Update analytics global properties
                setUserId(session.user.id);
                setUserRole(profile.role || 'guest');

                // Identify user in PostHog
                await identify(session.user.id, {
                  user_role: profile.role || 'guest',
                  language: 'en-US', // TODO: Get from user preferences
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                });

                if (__DEV__) {
                  console.log('[analytics] User identified after profile load:', session.user.id, profile.role);
                }
              } catch (analyticsError) {
                if (__DEV__) {
                  console.error('[analytics] Failed to identify user:', analyticsError);
                }
              }
            }
          } catch (error) {
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }

        // Always ensure loading is cleared
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      setIsLoading(true);

      if (__DEV__) {
        console.log('🔐 SignIn: Starting login attempt...');
        console.log('📧 Email:', email.toLowerCase().trim());
        console.log('🌐 Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
        console.log('🔑 Anon Key exists:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (__DEV__) {
        console.log('📡 SignIn: Response received');
        console.log('✅ Has user data:', !!data?.user);
        console.log('❌ Has error:', !!error);
        if (error) {
          console.error('❌ Error details:', error);
          console.error('❌ Error name:', error.name);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error status:', error.status);
          console.error('❌ Full error object:', JSON.stringify(error, null, 2));
        }
      }

      if (error) {
        return { error: error.message };
      }

      // Profile loading will be handled by the auth state change listener
      // Just log success here
      if (data.user) {
        if (__DEV__) {
          console.log('✅ SignIn successful for user:', data.user.id);
        }

        // Analytics: Identify user on login
        // Note: We'll get user_role from the profile loaded by auth state listener
        // For now, identify with basic info
        try {
          await identify(data.user.id, {
            language: 'en-US', // Will be updated by context
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        } catch (error) {
          if (__DEV__) {
            console.error('Analytics identify failed:', error);
          }
        }
      }

      return {};
    } catch (error) {
      if (__DEV__) {
        console.error('💥 SignIn: Unexpected error caught:', error);
        console.error('Error type:', error?.constructor?.name);
        console.error('Error message:', (error as Error)?.message);
      }
      return { error: 'An unexpected error occurred: ' + (error as Error)?.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: 'provider' | 'client',
    skipProfileCreation?: boolean,
    inviteContext?: { inviteCode: string; providerId: string }
  ): Promise<{ error?: string; data?: { user: User } }> => {
    try {
      setIsLoading(true);

      // First check if there's existing data for this email
      const { hasExistingData, userData } = await checkForExistingUserData(email.toLowerCase().trim());

      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        // Skip profile creation if requested (for invite flows)
        if (skipProfileCreation) {
          return { data: { user: data.user } };
        }

        if (hasExistingData && userData) {
          // Link existing data instead of creating new profile
          const migrationResult = await linkExistingUserToAuth(data.user.id, email.toLowerCase().trim());
          if (!migrationResult.success) {
            // Fallback: create new profile
            const profile = await createUserProfile(data.user, displayName, role);
            if (!profile) {
              return { error: 'Failed to create user profile' };
            }
          }
        } else {
          // Create new user profile
          const profile = await createUserProfile(data.user, displayName, role);
          if (!profile) {
            return { error: 'Failed to create user profile' };
          }
        }

        // Analytics: Track user registration
        // CRITICAL: Call alias FIRST, then identify
        try {
          await alias(data.user.id); // Step 1: Stitch anon → authed
          await identify(data.user.id, { // Step 2: Set person props
            user_role: role,
            language: 'en-US',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });

          // Step 3: Capture business event
          const registrationMethod = inviteContext ? 'invite_code' : 'email_password';
          capture(E.BUSINESS_USER_REGISTERED, {
            user_id: data.user.id,
            user_role: role,
            registration_method: registrationMethod,
            timestamp: nowIso(),
            // Include invite context if present
            ...(inviteContext && {
              invite_code: inviteContext.inviteCode,
              provider_id: inviteContext.providerId,
            }),
          });
        } catch (error) {
          if (__DEV__) {
            console.error('Analytics registration tracking failed:', error);
          }
        }

        return { data: { user: data.user } };
      }

      return { error: 'No user data returned' };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Clean up any active Dynamic Island activities
      try {
        const activities = await getActiveActivities();

        if (__DEV__) {
          console.log('[Auth] Cleaning up Dynamic Island activities on logout:', activities.length);
        }

        for (const activity of activities) {
          await endDynamicIslandActivity(activity.sessionId);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[Auth] Dynamic Island cleanup failed:', error);
        }
      }

      // Analytics: Reset on logout
      try {
        setUserId(undefined);
        setUserRole('guest');
        await resetAnalytics(); // Clear PostHog state
        clearGlobalPropertiesCache(); // Clear global context
      } catch (error) {
        if (__DEV__) {
          console.error('Analytics reset failed:', error);
        }
      }

      await supabase.auth.signOut();
      // State will be cleared by the auth state change listener
    } catch (error) {
      if (__DEV__) {
        console.error('Error signing out:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim());

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error?: string }> => {
    if (!userProfile) {
      return { error: 'No user profile found' };
    }

    try {
      const { data, error } = await supabase
        .from('trackpay_users')
        .update(updates)
        .eq('id', userProfile.id)
        .select()
        .single();

      if (error) {
        return { error: error.message };
      }

      setUserProfile(data as UserProfile);
      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const reloadUserProfile = async (userId?: string): Promise<void> => {
    const targetUserId = userId || user?.id;

    if (!targetUserId) {
      return;
    }

    try {
      const profile = await loadUserProfile(targetUserId);
      setUserProfile(profile);
    } catch (error) {
      if (__DEV__) {
        console.error('Error reloading user profile:', error);
      }
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    session,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    reloadUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};