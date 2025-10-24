#!/usr/bin/env node

/**
 * Debug script to query sessions for a specific client-provider relationship
 * Usage: node query-sessions-debug.js
 */

const { createClient } = require('@supabase/supabase-js');

// Staging database credentials
const SUPABASE_URL = 'https://qpoqeqasefatyrjeronp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3FlcWFzZWZhdHlyamVyb25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MzY2MDQsImV4cCI6MjA2MzAxMjYwNH0.DElaq79mhYOf_1kheOkrS9hTBeJ8HQwGRT3qmokJ5S8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: (...args) => {
      console.log('Fetch called with:', args[0]);
      return fetch(...args);
    }
  }
});

async function querySessionsDebug() {
  try {
    console.log('🔍 Querying staging database...\n');

    // Step 1: Get client ID
    const { data: clientUser, error: clientError } = await supabase
      .from('trackpay_users')
      .select('id, email, name')
      .eq('email', 'athmash247@gmail.com')
      .single();

    if (clientError) {
      console.error('❌ Error finding client:', clientError);
      return;
    }

    console.log('👤 Client found:', clientUser);

    // Step 2: Get provider ID
    const { data: providerUser, error: providerError} = await supabase
      .from('trackpay_users')
      .select('id, email, name')
      .eq('email', 'athahar+lucy@gmail.com')
      .single();

    if (providerError) {
      console.error('❌ Error finding provider:', providerError);
      return;
    }

    console.log('👤 Provider found:', providerUser);
    console.log('');

    // Step 3: Get all sessions for this relationship
    const { data: sessions, error: sessionsError } = await supabase
      .from('trackpay_sessions')
      .select('*')
      .eq('client_id', clientUser.id)
      .eq('provider_id', providerUser.id)
      .order('start_time', { ascending: false });

    console.log('🔍 Raw session data from database:', JSON.stringify(sessions, null, 2));

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError);
      return;
    }

    console.log(`📊 Found ${sessions.length} sessions\n`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Calculate totals by status
    const byStatus = {
      unpaid: { sessions: [], total: 0 },
      requested: { sessions: [], total: 0 },
      paid: { sessions: [], total: 0 },
      active: { sessions: [], total: 0 }
    };

    sessions.forEach(session => {
      const status = session.status || 'unknown';
      const amount = session.amount || 0;

      if (!byStatus[status]) {
        byStatus[status] = { sessions: [], total: 0 };
      }

      byStatus[status].sessions.push(session);
      byStatus[status].total += amount;

      // Format dates
      const startTime = session.start_time ? new Date(session.start_time).toLocaleString() : 'N/A';
      const endTime = session.end_time ? new Date(session.end_time).toLocaleString() : 'N/A';

      console.log(`
📝 Session ID: ${session.id.substring(0, 8)}...
   Status: ${session.status}
   Amount: $${amount.toFixed(2)}
   Duration: ${session.duration ? (session.duration * 60).toFixed(0) + ' min' : 'N/A'}
   Crew Size: ${session.crew_size || 1}
   Start: ${startTime}
   End: ${endTime}
   ---
      `);
    });

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('📊 SUMMARY BY STATUS:\n');

    Object.entries(byStatus).forEach(([status, data]) => {
      if (data.sessions.length > 0) {
        console.log(`${status.toUpperCase()}:`);
        console.log(`  Count: ${data.sessions.length}`);
        console.log(`  Total: $${data.total.toFixed(2)}`);
        console.log('');
      }
    });

    // Calculate what the app shows
    const unpaidTotal = byStatus.unpaid.total;
    const requestedTotal = byStatus.requested.total;
    const appBalanceDue = unpaidTotal + requestedTotal;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`💰 BALANCE DUE (unpaid + requested): $${appBalanceDue.toFixed(2)}`);
    console.log(`   - Unpaid: $${unpaidTotal.toFixed(2)}`);
    console.log(`   - Requested: $${requestedTotal.toFixed(2)}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the query
querySessionsDebug().then(() => {
  console.log('✅ Query complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
