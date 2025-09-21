// Direct Supabase Service - No Hybrid Storage, No Sync Queue
// Simplified service that calls Supabase directly

import { supabase, getCurrentUser } from './supabase';
import { Client, Session, Payment, ActivityItem } from '../types';
import { generateUUID } from '../utils/uuid';

export class DirectSupabaseService {

  // Helper to get current authenticated provider ID
  private async getCurrentProviderId(): Promise<string> {
    try {
      const user = await getCurrentUser();
      if (user) {
        // Find trackpay user linked to auth user
        const { data: trackpayUsers } = await supabase
          .from('trackpay_users')
          .select('id')
          .eq('auth_user_id', user.id)
          .eq('role', 'provider')
          .limit(1);

        if (trackpayUsers && trackpayUsers.length > 0) {
          return trackpayUsers[0].id;
        }

        // Fallback: find by email
        const { data: userByEmail } = await supabase
          .from('trackpay_users')
          .select('id')
          .eq('email', user.email)
          .eq('role', 'provider')
          .limit(1);

        if (userByEmail && userByEmail.length > 0) {
          return userByEmail[0].id;
        }
      }

      // Final fallback: get first provider (for development)
      const { data: providers } = await supabase
        .from('trackpay_users')
        .select('id')
        .eq('role', 'provider')
        .limit(1);

      if (providers && providers.length > 0) {
        console.warn('⚠️ Using first available provider as fallback');
        return providers[0].id;
      }

      throw new Error('No provider found');
    } catch (error) {
      console.error('❌ Error getting provider ID:', error);
      throw error;
    }
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('trackpay_users')
      .select('id, name, email, hourly_rate')
      .eq('role', 'client')
      .order('name');

    if (error) {
      console.error('❌ Error fetching clients:', error);
      throw error;
    }

    return (data || []).map(client => ({
      id: client.id,
      name: client.name,
      email: client.email || '',
      hourlyRate: client.hourly_rate || 0
    }));
  }

  async addClient(name: string, hourlyRate: number, email?: string): Promise<Client> {
    const clientId = generateUUID();

    const { data, error } = await supabase
      .from('trackpay_users')
      .insert([{
        id: clientId,
        name,
        email,
        role: 'client',
        hourly_rate: hourlyRate
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating client:', error);
      throw error;
    }

    console.log('✅ Client created in Supabase:', clientId);

    // Create relationship with current provider
    try {
      const providerId = await this.getCurrentProviderId();

      await supabase
        .from('trackpay_relationships')
        .insert([{
          provider_id: providerId,
          client_id: clientId
        }]);

      console.log('✅ Client-provider relationship created');
    } catch (error) {
      console.warn('⚠️ Could not create provider relationship:', error);
    }

    return {
      id: clientId,
      name,
      email: email || '',
      hourlyRate
    };
  }

  async updateClient(id: string, name: string, hourlyRate: number, email?: string): Promise<Client> {
    console.log('📝 DirectSupabase: Updating client', { id, name, hourlyRate, email });

    const { data, error } = await supabase
      .from('trackpay_users')
      .update({
        name,
        hourly_rate: hourlyRate,
        email: email || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating client:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Client not found');
    }

    console.log('✅ Client updated in Supabase:', data);

    return {
      id: data.id,
      name: data.name,
      email: data.email || '',
      hourlyRate: data.hourly_rate
    };
  }

  // Session operations
  async getSessions(): Promise<Session[]> {
    const { data, error } = await supabase
      .from('trackpay_sessions')
      .select(`
        id,
        client_id,
        provider_id,
        start_time,
        end_time,
        duration_minutes,
        hourly_rate,
        amount_due,
        status
      `)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching sessions:', error);
      throw error;
    }

    return (data || []).map(session => ({
      id: session.id,
      clientId: session.client_id,
      providerId: session.provider_id,
      startTime: new Date(session.start_time),
      endTime: session.end_time ? new Date(session.end_time) : undefined,
      duration: session.duration_minutes ? session.duration_minutes / 60 : undefined,
      hourlyRate: session.hourly_rate,
      amount: session.amount_due,
      status: session.status as Session['status']
    }));
  }

  async startSession(clientId: string): Promise<Session> {
    try {
      const sessionId = generateUUID();
      const providerId = await this.getCurrentProviderId();
      const startTime = new Date();

      // Get client's hourly rate
      const { data: client } = await supabase
        .from('trackpay_users')
        .select('hourly_rate')
        .eq('id', clientId)
        .single();

      const hourlyRate = client?.hourly_rate || 50;

      // Insert session directly to Supabase
      const { error } = await supabase
        .from('trackpay_sessions')
        .insert([{
          id: sessionId,
          provider_id: providerId,
          client_id: clientId,
          start_time: startTime.toISOString(),
          hourly_rate: hourlyRate,
          status: 'active'
        }]);

      if (error) {
        console.error('❌ Error creating session:', error);
        throw error;
      }

      console.log('✅ Session saved to Supabase:', sessionId);

      // Create activity
      await this.addActivity({
        type: 'session_start',
        clientId,
        data: { sessionId, startTime: startTime.toISOString() }
      });

      return {
        id: sessionId,
        clientId,
        startTime,
        hourlyRate,
        status: 'active'
      };

    } catch (error) {
      console.error('❌ Start session failed:', error);
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<Session> {
    try {
      console.log('🛑 endSession called with sessionId:', sessionId);
      const endTime = new Date();

      // Get session to calculate duration
      const { data: session, error: fetchError } = await supabase
        .from('trackpay_sessions')
        .select('start_time, hourly_rate, client_id')
        .eq('id', sessionId)
        .single();

      console.log('📊 Session fetch result:', { session, fetchError });

      if (fetchError || !session) {
        throw new Error('Session not found');
      }

      const startTime = new Date(session.start_time);
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      const durationHours = durationMinutes / 60;
      const amount = durationHours * session.hourly_rate;

      console.log('💰 Calculated duration and amount:', { durationMinutes, durationHours, amount });

      // Update session in Supabase
      const { error } = await supabase
        .from('trackpay_sessions')
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
          amount_due: amount,
          status: 'unpaid',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ Error ending session:', error);
        throw error;
      }

      console.log('✅ Session ended successfully - updated to unpaid status:', sessionId);

      // Create activity
      await this.addActivity({
        type: 'session_end',
        clientId: session.client_id,
        data: {
          sessionId,
          endTime: endTime.toISOString(),
          duration: durationHours,
          amount
        }
      });

      return {
        id: sessionId,
        clientId: session.client_id,
        startTime,
        endTime,
        duration: durationHours,
        hourlyRate: session.hourly_rate,
        amount,
        status: 'unpaid'
      };

    } catch (error) {
      console.error('❌ End session failed:', error);
      throw error;
    }
  }

  // Payment operations
  async requestPayment(clientId: string, sessionIds: string[]): Promise<void> {
    try {
      // Update session statuses
      const { error } = await supabase
        .from('trackpay_sessions')
        .update({ status: 'requested' })
        .in('id', sessionIds);

      if (error) {
        console.error('❌ Error requesting payment:', error);
        throw error;
      }

      console.log('✅ Session statuses updated to requested');

      // Calculate total amount
      const { data: sessions } = await supabase
        .from('trackpay_sessions')
        .select('amount_due')
        .in('id', sessionIds);

      const amount = sessions?.reduce((sum, s) => sum + (s.amount_due || 0), 0) || 0;

      // Create activity
      await this.addActivity({
        type: 'payment_request',
        clientId,
        data: { sessionIds, amount }
      });

    } catch (error) {
      console.error('❌ Request payment failed:', error);
      throw error;
    }
  }

  async markPaid(
    clientId: string,
    sessionIds: string[],
    amount: number,
    method: string
  ): Promise<Payment> {
    try {
      const paymentId = generateUUID();

      // Get current provider ID
      const providerId = await this.getCurrentProviderId();

      // Create payment record (using proper schema with session_ids array)
      const { error: paymentError } = await supabase
        .from('trackpay_payments')
        .insert([{
          id: paymentId,
          client_id: clientId,
          provider_id: providerId,
          amount,
          method,
          session_ids: sessionIds,
          status: 'completed',
          created_at: new Date().toISOString()
        }]);

      if (paymentError) {
        console.error('❌ Error creating payment:', paymentError);
        throw paymentError;
      }

      console.log('✅ Payment saved to Supabase:', paymentId);

      // Update session statuses
      const { error: statusError } = await supabase
        .from('trackpay_sessions')
        .update({ status: 'paid' })
        .in('id', sessionIds);

      if (statusError) {
        console.error('❌ Error updating session statuses:', statusError);
        throw statusError;
      }

      console.log('✅ Session statuses updated to paid');

      // Create detailed payment activity
      const paymentDate = new Date().toISOString();
      console.log('💳 Creating payment activity...', {
        type: 'payment_completed',
        clientId,
        paymentId,
        amount,
        method,
        sessionIds,
        sessionCount: sessionIds.length
      });

      try {
        await this.addActivity({
          type: 'payment_completed',
          clientId,
          data: {
            paymentId,
            amount,
            method,
            paymentDate,
            sessionIds,
            sessionCount: sessionIds.length,
            description: `Payment $${amount.toFixed(2)} made via ${method}`
          }
        });
        console.log('✅ Payment activity created successfully');
      } catch (activityError) {
        console.error('❌ Failed to create payment activity:', activityError);
        // Don't throw - payment was still successful
      }

      return {
        id: paymentId,
        clientId,
        sessionIds,
        amount,
        method: method as Payment['method'],
        paidAt: new Date()
      };

    } catch (error) {
      console.error('❌ Mark paid failed:', error);
      throw error;
    }
  }

  // Activity operations
  async addActivity(activity: Omit<ActivityItem, 'id' | 'timestamp'>): Promise<void> {
    try {
      const activityId = generateUUID();
      console.log('🔍 Getting provider ID for activity...');
      const providerId = await this.getCurrentProviderId();
      const timestamp = new Date();

      console.log('📝 Inserting activity to database:', {
        id: activityId,
        type: activity.type,
        provider_id: providerId,
        client_id: activity.clientId,
        session_id: (activity.data as any)?.sessionId || null,
        data: activity.data,
        created_at: timestamp.toISOString()
      });

      const { error } = await supabase
        .from('trackpay_activities')
        .insert([{
          id: activityId,
          type: activity.type,
          provider_id: providerId,
          client_id: activity.clientId,
          session_id: (activity.data as any)?.sessionId || null,
          data: activity.data,
          created_at: timestamp.toISOString()
        }]);

      if (error) {
        console.error('❌ Error creating activity:', error);
        console.error('❌ Activity data that failed:', {
          id: activityId,
          type: activity.type,
          provider_id: providerId,
          client_id: activity.clientId,
          data: activity.data
        });
        throw error;
      }

      console.log('✅ Activity saved to Supabase:', activityId);

    } catch (error) {
      console.error('❌ Add activity failed:', error);
      console.error('❌ Original activity data:', activity);
      throw error;
    }
  }

  async getActivities(): Promise<ActivityItem[]> {
    const { data, error } = await supabase
      .from('trackpay_activities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching activities:', error);
      throw error;
    }


    return (data || []).map(activity => ({
      id: activity.id,
      type: activity.type as ActivityItem['type'],
      clientId: activity.client_id,
      timestamp: new Date(activity.created_at),
      data: activity.data
    }));
  }

  // Utility operations
  async getUserRole(): Promise<'provider' | 'client'> {
    try {
      const user = await getCurrentUser();
      if (!user) return 'provider'; // Default fallback

      const { data } = await supabase
        .from('trackpay_users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single();

      return data?.role as 'provider' | 'client' || 'provider';
    } catch {
      return 'provider';
    }
  }

  async getSessionsByClient(clientId: string): Promise<Session[]> {
    const sessions = await this.getSessions();
    return sessions.filter(session => session.clientId === clientId);
  }

  async getServiceProviders(): Promise<any[]> {
    try {
      const user = await getCurrentUser();
      if (!user) return [];

      // Get current user's provider relationships
      const { data: relationships } = await supabase
        .from('trackpay_relationships')
        .select(`
          provider_id,
          trackpay_users!provider_id (
            id, name, email, hourly_rate
          )
        `)
        .eq('client_id', user.id);

      return relationships || [];
    } catch (error) {
      console.error('❌ Error fetching service providers:', error);
      return [];
    }
  }
}

// Create singleton instance
export const directSupabase = new DirectSupabaseService();

// Function to create missing payment activities for existing payments
export const createMissingPaymentActivities = async () => {
  try {
    console.log('🔍 Fetching existing payments...');

    // Get all payments
    const { data: payments, error: paymentsError } = await supabase
      .from('trackpay_payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError);
      return;
    }

    console.log(`📊 Found ${payments.length} payments`);

    // Get all existing payment activities
    const { data: activities, error: activitiesError } = await supabase
      .from('trackpay_activities')
      .select('*')
      .eq('type', 'payment_completed');

    if (activitiesError) {
      console.error('❌ Error fetching activities:', activitiesError);
      return;
    }

    console.log(`📋 Found ${activities.length} existing payment activities`);

    // Find payments that don't have corresponding activities
    const existingPaymentIds = new Set(activities.map(a => a.data?.paymentId).filter(Boolean));
    const missingPayments = payments.filter(p => !existingPaymentIds.has(p.id));

    console.log(`🔍 Missing payment activities for ${missingPayments.length} payments`);

    // Create missing activities
    for (const payment of missingPayments) {
      console.log(`💳 Creating activity for payment ${payment.id.substring(0, 8)}...`);

      const activityId = generateUUID();
      const activityData = {
        id: activityId,
        type: 'payment_completed',
        provider_id: payment.provider_id,
        client_id: payment.client_id,
        session_id: null,
        data: {
          paymentId: payment.id,
          amount: parseFloat(payment.amount),
          method: payment.method,
          paymentDate: payment.created_at,
          sessionIds: payment.session_ids || [],
          sessionCount: payment.session_ids ? payment.session_ids.length : 0,
          description: `Payment $${parseFloat(payment.amount).toFixed(2)} made via ${payment.method}`
        },
        created_at: payment.created_at
      };

      const { error: insertError } = await supabase
        .from('trackpay_activities')
        .insert([activityData]);

      if (insertError) {
        console.error(`❌ Error creating activity for payment ${payment.id}:`, insertError);
      } else {
        console.log(`✅ Created activity ${activityId} for payment ${payment.id.substring(0, 8)}`);
      }
    }

    console.log('🎉 Finished creating missing payment activities');
    return true;

  } catch (error) {
    console.error('❌ createMissingPaymentActivities failed:', error);
    return false;
  }
};

// Make available globally for testing
if (typeof window !== 'undefined') {
  (window as any).directSupabase = directSupabase;
  (window as any).createMissingPaymentActivities = createMissingPaymentActivities;
}