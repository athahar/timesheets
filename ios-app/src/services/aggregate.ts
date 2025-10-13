// Aggregation service to prevent N+1 queries
// Replaces multiple individual getClientSummary calls with batched queries

import { supabase } from './supabase';
import { debug } from '../utils/debug';

export interface ClientMoneyState {
  clientId: string;
  unpaidHours: number;
  requestedHours: number;
  unpaidBalance: number;
  requestedBalance: number;
  totalUnpaidBalance: number;
  hasUnpaidSessions: boolean;
  hasRequestedSessions: boolean;
  paymentStatus: 'unpaid' | 'requested' | 'paid';
  hasActiveSession: boolean;
  activeSessionTime: number;
}

export async function getClientsMoneyState(clientIds: string[]): Promise<ClientMoneyState[]> {
  if (clientIds.length === 0) return [];

  debug('📊 Batching money state for', clientIds.length, 'clients');

  try {
    // Batch query all sessions and activities for all clients at once
    const [sessionsResult, activitiesResult] = await Promise.all([
      supabase
        .from('trackpay_sessions')
        .select('id, client_id, status, duration_minutes, amount_due, start_time, end_time')
        .in('client_id', clientIds),
      supabase
        .from('trackpay_activities')
        .select('id, client_id, type, data, created_at')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false })
    ]);

    if (sessionsResult.error) {
      console.error('❌ Error fetching sessions:', sessionsResult.error);
      throw sessionsResult.error;
    }

    if (activitiesResult.error) {
      console.error('❌ Error fetching activities:', activitiesResult.error);
      throw activitiesResult.error;
    }

    const sessions = sessionsResult.data || [];
    const activities = activitiesResult.data || [];

    debug('📊 Fetched', sessions.length, 'sessions and', activities.length, 'activities');

    // Aggregate data client-side (O(n) operation, much faster than N queries)
    return clientIds.map(clientId => aggregateClientData(clientId, sessions, activities));

  } catch (error) {
    console.error('❌ getClientsMoneyState failed:', error);
    // Return default states for all clients on error
    return clientIds.map(clientId => createDefaultState(clientId));
  }
}

function aggregateClientData(
  clientId: string,
  allSessions: any[],
  allActivities: any[]
): ClientMoneyState {
  // Filter data for this specific client
  const clientSessions = allSessions.filter(s => s.client_id === clientId);

  // Separate sessions by status
  const unpaidSessions = clientSessions.filter(s => s.status === 'unpaid' || s.status === 'completed');
  const requestedSessions = clientSessions.filter(s => s.status === 'requested' || s.status === 'payment_requested');
  const activeSessions = clientSessions.filter(s => s.status === 'active');

  // Calculate hours and balances
  const unpaidHours = unpaidSessions.reduce((sum, s) => sum + (s.duration_minutes || 0) / 60, 0);
  const requestedHours = requestedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0) / 60, 0);
  const unpaidBalance = unpaidSessions.reduce((sum, s) => sum + (s.amount_due || 0), 0);
  const requestedBalance = requestedSessions.reduce((sum, s) => sum + (s.amount_due || 0), 0);

  // Active session handling
  const activeSession = activeSessions[0] || null;
  const activeSessionTime = activeSession
    ? (Date.now() - new Date(activeSession.start_time).getTime()) / 1000
    : 0;

  // Payment status logic
  let paymentStatus: 'unpaid' | 'requested' | 'paid' = 'paid';
  if (unpaidSessions.length > 0) {
    paymentStatus = 'unpaid';
  } else if (requestedSessions.length > 0) {
    paymentStatus = 'requested';
  }

  return {
    clientId,
    unpaidHours,
    requestedHours,
    unpaidBalance,
    requestedBalance,
    totalUnpaidBalance: unpaidBalance + requestedBalance,
    hasUnpaidSessions: unpaidSessions.length > 0,
    hasRequestedSessions: requestedSessions.length > 0,
    paymentStatus,
    hasActiveSession: !!activeSession,
    activeSessionTime
  };
}

function createDefaultState(clientId: string): ClientMoneyState {
  return {
    clientId,
    unpaidHours: 0,
    requestedHours: 0,
    unpaidBalance: 0,
    requestedBalance: 0,
    totalUnpaidBalance: 0,
    hasUnpaidSessions: false,
    hasRequestedSessions: false,
    paymentStatus: 'paid',
    hasActiveSession: false,
    activeSessionTime: 0
  };
}