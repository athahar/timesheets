#!/usr/bin/env node

// Database State Verification Script for TrackPay Testing
// Use this script to check database state before/after user actions during testing

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_SERVICE_ROLE_KEY // Using service role for full access
);

async function checkDatabaseState() {
  console.log('🔍 TRACKPAY DATABASE STATE VERIFICATION');
  console.log('=====================================');
  console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
  console.log('');

  try {
    // Check Users
    const { data: users, error: usersError } = await supabase
      .from('trackpay_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log(`👥 USERS (${users.length} total):`);
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.role})`);
        console.log(`     📧 Email: ${user.email || 'N/A'}`);
        console.log(`     💰 Rate: $${user.hourly_rate || 0}/hr`);
        console.log(`     🆔 ID: ${user.id}`);
        console.log(`     🔐 Auth ID: ${user.auth_user_id || 'N/A'}`);
        console.log('');
      });
    }

    // Check Clients (Legacy/Invite System)
    const { data: clients, error: clientsError } = await supabase
      .from('trackpay_clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientsError) {
      console.error('❌ Error fetching clients:', clientsError);
    } else {
      console.log(`👤 CLIENTS (${clients.length} total):`);
      clients.forEach((client, index) => {
        console.log(`  ${index + 1}. ${client.name}`);
        console.log(`     💰 Rate: $${client.hourly_rate}/hr`);
        console.log(`     📧 Email: ${client.email || 'N/A'}`);
        console.log(`     🎟️  Invite: ${client.invite_code || 'N/A'}`);
        console.log(`     📋 Status: ${client.claimed_status || 'unclaimed'}`);
        console.log(`     🆔 ID: ${client.id}`);
        console.log('');
      });
    }

    // Check Sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('trackpay_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError);
    } else {
      console.log(`⏱️  RECENT SESSIONS (${sessions.length} shown, latest first):`);
      sessions.forEach((session, index) => {
        const startTime = new Date(session.start_time).toLocaleString();
        const endTime = session.end_time ? new Date(session.end_time).toLocaleString() : 'In Progress';
        const duration = session.duration_minutes ? `${session.duration_minutes}min` : 'N/A';

        console.log(`  ${index + 1}. Session ${session.id.substring(0, 8)}...`);
        console.log(`     🏢 Provider: ${session.provider_id?.substring(0, 8)}...`);
        console.log(`     👤 Client: ${session.client_id?.substring(0, 8)}...`);
        console.log(`     🕐 Start: ${startTime}`);
        console.log(`     🕑 End: ${endTime}`);
        console.log(`     ⏱️  Duration: ${duration}`);
        console.log(`     💰 Amount: $${session.amount_due || 0}`);
        console.log(`     📊 Status: ${session.status}`);
        console.log('');
      });
    }

    // Check Activities
    const { data: activities, error: activitiesError } = await supabase
      .from('trackpay_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (activitiesError) {
      console.error('❌ Error fetching activities:', activitiesError);
    } else {
      console.log(`📊 RECENT ACTIVITIES (${activities.length} shown):`);
      activities.forEach((activity, index) => {
        const timestamp = new Date(activity.created_at).toLocaleString();
        console.log(`  ${index + 1}. ${activity.type}`);
        console.log(`     🕐 Time: ${timestamp}`);
        console.log(`     🏢 Provider: ${activity.provider_id?.substring(0, 8)}...`);
        console.log(`     👤 Client: ${activity.client_id?.substring(0, 8)}...`);
        console.log(`     📝 Data: ${JSON.stringify(activity.data)}`);
        console.log('');
      });
    }

    // Check Payments
    const { data: payments, error: paymentsError } = await supabase
      .from('trackpay_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError);
    } else {
      console.log(`💳 RECENT PAYMENTS (${payments.length} shown):`);
      payments.forEach((payment, index) => {
        const timestamp = new Date(payment.created_at).toLocaleString();
        console.log(`  ${index + 1}. Payment ${payment.id.substring(0, 8)}...`);
        console.log(`     💰 Amount: $${payment.amount}`);
        console.log(`     💳 Method: ${payment.method}`);
        console.log(`     🕐 Date: ${timestamp}`);
        console.log(`     👤 Client: ${payment.client_id?.substring(0, 8)}...`);
        console.log(`     🏢 Provider: ${payment.provider_id?.substring(0, 8)}...`);
        console.log('');
      });
    }

    console.log('✅ Database state verification complete!');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Database verification failed:', error);
  }
}

// Check if this is being run directly
if (require.main === module) {
  checkDatabaseState();
}

module.exports = { checkDatabaseState };