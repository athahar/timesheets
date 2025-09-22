// Storage Service Facade for TrackPay
// Direct Supabase implementation - no hybrid storage, no sync queue complexity

import { directSupabase } from './directSupabase';
import { getCurrentUser as getSupabaseUser, supabase } from './supabase';
import { Client, Session, Payment, ActivityItem } from '../types';

// Export all the same functions that existing storage.ts provides
// This allows components to import from here instead of storage.ts

// Client functions
export const getClients = (): Promise<Client[]> => {
  return directSupabase.getClients();
};

export const addClient = (name: string, hourlyRate: number, email?: string): Promise<Client> => {
  return directSupabase.addClient(name, hourlyRate, email);
};

export const getClientById = async (id: string): Promise<Client | null> => {
  const clients = await directSupabase.getClients();
  return clients.find(client => client.id === id) || null;
};

export const updateClient = async (id: string, name: string, hourlyRate: number, email?: string): Promise<void> => {
  await directSupabase.updateClient(id, name, hourlyRate, email);
};

// Session functions
export const getSessions = (): Promise<Session[]> => {
  return directSupabase.getSessions();
};

export const getSessionsByClient = (clientId: string): Promise<Session[]> => {
  return directSupabase.getSessionsByClient(clientId);
};

export const startSession = (clientId: string): Promise<Session> => {
  return directSupabase.startSession(clientId);
};

export const endSession = (sessionId: string): Promise<Session> => {
  return directSupabase.endSession(sessionId);
};

export const getActiveSession = async (clientId: string): Promise<Session | null> => {
  const sessions = await directSupabase.getSessions();
  return sessions.find(session => session.clientId === clientId && session.status === 'active') || null;
};

// Payment functions
export const getPayments = (): Promise<Payment[]> => {
  // Simplified - not implemented in direct service yet
  return Promise.resolve([]);
};

export const requestPayment = (clientId: string, sessionIds: string[]): Promise<void> => {
  return directSupabase.requestPayment(clientId, sessionIds);
};

export const markPaid = (
  clientId: string,
  sessionIds: string[],
  amount: number,
  method: Payment['method']
): Promise<Payment> => {
  return directSupabase.markPaid(clientId, sessionIds, amount, method);
};

// Activity functions
export const getActivities = (): Promise<ActivityItem[]> => {
  return directSupabase.getActivities();
};

export const addActivity = (activity: Omit<ActivityItem, 'id' | 'timestamp'>): Promise<void> => {
  return directSupabase.addActivity(activity);
};

// User role functions
export const getUserRole = (): Promise<'provider' | 'client'> => {
  return directSupabase.getUserRole();
};

export const setUserRole = (role: 'provider' | 'client'): Promise<void> => {
  // Simplified - not implemented in direct service
  return Promise.resolve();
};

// Current user functions
export const getCurrentUser = () => {
  return getSupabaseUser();
};

export const setCurrentUser = (userName: string): Promise<void> => {
  // Simplified - use Supabase auth instead
  return Promise.resolve();
};

// Summary functions
export const getClientSummary = async (clientId: string) => {
  const sessions = await directSupabase.getSessionsByClient(clientId);
  const unpaidSessions = sessions.filter(s => s.status === 'unpaid');
  const requestedSessions = sessions.filter(s => s.status === 'requested');
  const paidSessions = sessions.filter(s => s.status === 'paid');

  const totalHours = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const unpaidHours = unpaidSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const requestedHours = requestedSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  const unpaidBalance = unpaidSessions.reduce((sum, s) => sum + (s.amount || 0), 0);
  const requestedBalance = requestedSessions.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalUnpaidBalance = unpaidBalance + requestedBalance;
  const totalEarned = paidSessions.reduce((sum, s) => sum + (s.amount || 0), 0);

  // Determine payment status
  let paymentStatus: 'unpaid' | 'requested' | 'paid' = 'paid';
  if (unpaidSessions.length > 0) {
    paymentStatus = 'unpaid';
  } else if (requestedSessions.length > 0) {
    paymentStatus = 'requested';
  }

  return {
    totalHours,
    unpaidHours,
    requestedHours,
    unpaidBalance,
    requestedBalance,
    totalUnpaidBalance,
    paymentStatus,
    totalEarned,
    sessionCount: sessions.length,
    unpaidSessionCount: unpaidSessions.length,
    hasUnpaidSessions: unpaidSessions.length > 0
  };
};

// Client-side functions
export const getServiceProvidersForClient = (clientName: string) => {
  return directSupabase.getServiceProviders();
};

export const getClientSessionsForProvider = async (clientUserId: string, providerId: string) => {
  if (__DEV__) {
    console.log('🔍 getClientSessionsForProvider called with:', { clientUserId, providerId });
  }

  // Get the current user's trackpay_users ID
  const currentUser = await getCurrentUser();
  if (__DEV__) {
    console.log('👤 getCurrentUser result:', currentUser);
  }
  if (!currentUser) {
    console.log('❌ No current user found');
    return [];
  }

  // Find the client's trackpay_users record
  const { data: clientRecord, error: clientError } = await supabase
    .from('trackpay_users')
    .select('id')
    .eq('auth_user_id', currentUser.id)
    .eq('role', 'client')
    .single();

  if (__DEV__) {

    console.log('📋 Client record lookup:', { clientRecord, clientError });

  }
  if (!clientRecord) {
    console.log('❌ No client record found for user:', currentUser.id);
    return [];
  }

  // Get sessions where this client worked with this provider
  if (__DEV__) {
    console.log('📊 Fetching all sessions...');
  }
  const sessions = await directSupabase.getSessions();
  if (__DEV__) {
    console.log('📊 Total sessions fetched:', sessions.length);
  }

  if (__DEV__) {

    console.log('🔎 Filtering sessions for clientId:', clientRecord.id, 'providerId:', providerId);

  }
  const filteredSessions = sessions.filter(session => {
    const matches = session.clientId === clientRecord.id && session.providerId === providerId;
    console.log('🔎 Session check:', {
      sessionId: session.id.substring(0, 8) + '...',
      sessionClientId: session.clientId?.substring(0, 8) + '...',
      sessionProviderId: session.providerId?.substring(0, 8) + '...',
      targetClientId: clientRecord.id.substring(0, 8) + '...',
      targetProviderId: providerId.substring(0, 8) + '...',
      matches
    });
    return matches;
  });

  if (__DEV__) {

    console.log('✅ Filtered sessions result:', filteredSessions.length, 'sessions');

  }
  return filteredSessions;
};

// Initialization functions
export const initializeWithSeedData = (): Promise<void> => {
  // Simplified - direct Supabase doesn't need seed data
  return Promise.resolve();
};

export const clearAllDataAndReinitialize = (): Promise<void> => {
  // Simplified - direct Supabase doesn't need reinitialization
  return Promise.resolve();
};

// Simplified functions - no sync queue needed with direct Supabase
export const getConnectionStatus = (): Promise<boolean> => {
  return Promise.resolve(true); // Always online with direct Supabase
};

export const syncData = (): Promise<void> => {
  return Promise.resolve(); // No sync needed
};

export const exportData = () => {
  return {}; // Simplified
};

export const importData = (data: any) => {
  return Promise.resolve(); // Simplified
};

// Sync queue functions - simplified (no queue needed)
export const getSyncStatus = () => {
  return { status: 'idle', pending: 0, errors: 0 };
};

export const addSyncStatusListener = (listener: (status: any) => void) => {
  return () => {}; // No-op
};

export const forcSync = (): Promise<void> => {
  return Promise.resolve();
};

export const retryFailedOperations = (): Promise<void> => {
  return Promise.resolve();
};

export const clearSyncQueue = (): Promise<void> => {
  return Promise.resolve();
};

export const inspectSyncQueue = (): Promise<void> => {
  return Promise.resolve();
};

// Health check for debugging
export const healthCheck = async () => {
  try {
    const clients = await directSupabase.getClients();
    const sessions = await directSupabase.getSessions();
    const activities = await directSupabase.getActivities();

    return {
      status: 'healthy',
      isOnline: true, // Always online with direct Supabase
      counts: {
        clients: clients.length,
        sessions: sessions.length,
        payments: 0, // Simplified
        activities: activities.length,
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
};

// Development helpers
export const debugInfo = async () => {
  const health = await healthCheck();
  if (__DEV__) {
    console.log('🔍 TrackPay Direct Supabase Debug Info:', health);
  }
  return health;
};

// Export the direct Supabase instance for advanced usage
export { directSupabase };

// Default export for easy importing
export default {
  // Client operations
  getClients,
  addClient,
  getClientById,
  updateClient,

  // Session operations
  getSessions,
  getSessionsByClient,
  startSession,
  endSession,
  getActiveSession,

  // Payment operations
  getPayments,
  requestPayment,
  markPaid,

  // Activity operations
  getActivities,
  addActivity,

  // User operations
  getUserRole,
  setUserRole,
  getCurrentUser,
  setCurrentUser,

  // Summary operations
  getClientSummary,
  getServiceProvidersForClient,
  getClientSessionsForProvider,

  // Initialization
  initializeWithSeedData,
  clearAllDataAndReinitialize,

  // Hybrid features
  getConnectionStatus,
  syncData,
  exportData,
  importData,
  healthCheck,
  debugInfo,

  // Sync queue features
  getSyncStatus,
  addSyncStatusListener,
  forcSync,
  retryFailedOperations,
  clearSyncQueue,
};