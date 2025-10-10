// Supabase Client Configuration for TrackPay
import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';

// Environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure:\n' +
    '- EXPO_PUBLIC_SUPABASE_URL is set to your Supabase project URL\n' +
    '- EXPO_PUBLIC_SUPABASE_ANON_KEY is set to your Supabase anon key\n\n' +
    'You can find these values in your Supabase dashboard under Settings > API'
  );
}

// Create Supabase client with AsyncStorage for session persistence
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage for session persistence on native platforms
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Limit real-time events for performance
    },
  },
});

// Database type definitions for type safety
export interface Database {
  public: {
    Tables: {
      trackpay_users: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          role: 'provider' | 'client';
          hourly_rate: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          role: 'provider' | 'client';
          hourly_rate?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          role?: 'provider' | 'client';
          hourly_rate?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      trackpay_relationships: {
        Row: {
          id: string;
          provider_id: string;
          client_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          client_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          client_id?: string;
          created_at?: string;
        };
      };
      trackpay_sessions: {
        Row: {
          id: string;
          provider_id: string;
          client_id: string;
          start_time: string;
          end_time: string | null;
          duration_minutes: number | null;
          hourly_rate: number;
          amount_due: number | null;
          status: 'active' | 'unpaid' | 'requested' | 'paid';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          client_id: string;
          start_time: string;
          end_time?: string | null;
          duration_minutes?: number | null;
          hourly_rate: number;
          amount_due?: number | null;
          status?: 'active' | 'unpaid' | 'requested' | 'paid';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider_id?: string;
          client_id?: string;
          start_time?: string;
          end_time?: string | null;
          duration_minutes?: number | null;
          hourly_rate?: number;
          amount_due?: number | null;
          status?: 'active' | 'unpaid' | 'requested' | 'paid';
          created_at?: string;
          updated_at?: string;
        };
      };
      trackpay_payments: {
        Row: {
          id: string;
          session_id: string;
          provider_id: string;
          client_id: string;
          amount: number;
          method: 'cash' | 'zelle' | 'paypal' | 'bank_transfer' | 'other';
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          provider_id: string;
          client_id: string;
          amount: number;
          method: 'cash' | 'zelle' | 'paypal' | 'bank_transfer' | 'other';
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          provider_id?: string;
          client_id?: string;
          amount?: number;
          method?: 'cash' | 'zelle' | 'paypal' | 'bank_transfer' | 'other';
          note?: string | null;
          created_at?: string;
        };
      };
      trackpay_requests: {
        Row: {
          id: string;
          session_id: string;
          provider_id: string;
          client_id: string;
          amount: number;
          status: 'pending' | 'approved' | 'declined';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          provider_id: string;
          client_id: string;
          amount: number;
          status?: 'pending' | 'approved' | 'declined';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          provider_id?: string;
          client_id?: string;
          amount?: number;
          status?: 'pending' | 'approved' | 'declined';
          created_at?: string;
          updated_at?: string;
        };
      };
      trackpay_activities: {
        Row: {
          id: string;
          type: string;
          provider_id: string;
          client_id: string;
          session_id: string | null;
          data: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          provider_id: string;
          client_id: string;
          session_id?: string | null;
          data?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          provider_id?: string;
          client_id?: string;
          session_id?: string | null;
          data?: any | null;
          created_at?: string;
        };
      };
    };
    Views: {
      trackpay_unpaid_balances: {
        Row: {
          client_id: string;
          provider_id: string;
          unpaid_balance: number;
          unpaid_sessions_count: number;
          requested_sessions_count: number;
          unpaid_minutes: number;
        };
      };
    };
  };
}

// Connection monitoring
let isOnline = true;
let connectionListeners: Array<(online: boolean) => void> = [];

export const addConnectionListener = (listener: (online: boolean) => void) => {
  connectionListeners.push(listener);
  return () => {
    connectionListeners = connectionListeners.filter(l => l !== listener);
  };
};

export const isSupabaseOnline = (): boolean => isOnline;

// Test connection and update status
export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('trackpay_users').select('count').limit(1);
    const online = !error;

    if (online !== isOnline) {
      isOnline = online;
      connectionListeners.forEach(listener => listener(online));
    }

    return online;
  } catch (error) {
    if (isOnline) {
      isOnline = false;
      connectionListeners.forEach(listener => listener(false));
    }
    return false;
  }
};

// Authentication helpers
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string, userData?: { name: string; role: 'provider' | 'client'; hourly_rate?: number }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Real-time subscription helpers
export const subscribeToTable = (
  table: keyof Database['public']['Tables'],
  callback: (payload: any) => void,
  filter?: string
) => {
  let subscription = supabase
    .channel(`trackpay_${table}`)
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filter ? { filter } : {})
      },
      callback
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

// App state handling for session refresh
if (Platform.OS !== "web") {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
      testConnection(); // Test connection when app becomes active
    }
  });
}

// Initialize connection test
testConnection();

// Development debugging: Expose Supabase client globally
if (process.env.EXPO_PUBLIC_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).supabase = supabase;
  (window as any).testConnection = testConnection;
  (window as any).getCurrentUser = getCurrentUser;
  if (__DEV__) {
    if (__DEV__) {
      console.log('🔧 Development mode: Supabase client exposed globally for debugging');
    }
  }
}

// Utility functions for error handling
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);

  // Common error scenarios
  if (error?.code === 'PGRST301') {
    return 'No data found';
  }

  if (error?.code === '23505') {
    return 'This record already exists';
  }

  if (error?.code === '23503') {
    return 'Referenced record not found';
  }

  if (error?.message?.includes('JWT')) {
    return 'Session expired. Please log in again.';
  }

  return error?.message || 'An unexpected error occurred';
};

// Type-safe query builder helpers
export const safeQuery = async <T>(queryPromise: Promise<any>): Promise<{ data: T | null; error: string | null }> => {
  try {
    const { data, error } = await queryPromise;

    if (error) {
      return { data: null, error: handleSupabaseError(error) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleSupabaseError(err) };
  }
};

export default supabase;