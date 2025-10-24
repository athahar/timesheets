// Temporary script to check invite code in production database
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://ddxggihlncanqdypzsnn.supabase.co';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeGdnaWhsbmNhbnFkeXB6c25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODI4MjYsImV4cCI6MjA3NjU1ODgyNn0.-_Jq7Sj8oAy8YkUTGrTtxtD5KuZ8CicjDnrfX48N0UI';

const supabase = createClient(PROD_URL, PROD_ANON_KEY);

async function checkInviteCode(inviteCode) {
  console.log(`\n🔍 Checking invite code: ${inviteCode}`);
  console.log(`📊 Database: ${PROD_URL}\n`);

  // Query 1: Check if invite exists (any status)
  const { data: allInvites, error: allError } = await supabase
    .from('trackpay_invites')
    .select('*')
    .eq('invite_code', inviteCode);

  if (allError) {
    console.error('❌ Error querying invites:', allError);
    return;
  }

  console.log('📋 All invites with this code:');
  console.log(JSON.stringify(allInvites, null, 2));

  if (!allInvites || allInvites.length === 0) {
    console.log('\n❌ NO INVITE FOUND with code:', inviteCode);
    console.log('\n🔍 Let me check all recent invites...\n');

    // Query 2: Get all recent invites
    const { data: recentInvites, error: recentError } = await supabase
      .from('trackpay_invites')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentError && recentInvites) {
      console.log('📋 Last 10 invites in database:');
      recentInvites.forEach(inv => {
        console.log(`  - ${inv.invite_code} | status: ${inv.status} | created: ${inv.created_at}`);
      });
    }
  } else {
    console.log('\n✅ FOUND INVITE:');
    const invite = allInvites[0];
    console.log(`  ID: ${invite.id}`);
    console.log(`  Code: ${invite.invite_code}`);
    console.log(`  Status: ${invite.status}`);
    console.log(`  Expires: ${invite.expires_at}`);
    console.log(`  Created: ${invite.created_at}`);
    console.log(`  Claimed by: ${invite.claimed_by || 'not claimed'}`);
    console.log(`  Provider ID: ${invite.provider_id}`);
    console.log(`  Client ID: ${invite.client_id}`);

    // Check if expired
    const expiresAt = new Date(invite.expires_at);
    const now = new Date();
    const isExpired = expiresAt < now;

    console.log(`\n⏰ Expiration check:`);
    console.log(`  Expires at: ${expiresAt.toISOString()}`);
    console.log(`  Current time: ${now.toISOString()}`);
    console.log(`  Is expired: ${isExpired ? '❌ YES' : '✅ NO'}`);

    // Check why validation might fail
    console.log(`\n🔍 Validation requirements:`);
    console.log(`  Status = 'pending': ${invite.status === 'pending' ? '✅' : '❌ NO - status is "' + invite.status + '"'}`);
    console.log(`  Not expired: ${!isExpired ? '✅' : '❌'}`);

    if (invite.status !== 'pending') {
      console.log(`\n⚠️  ISSUE FOUND: Status is "${invite.status}" but app requires "pending"`);
    }
  }
}

// Run the check
const inviteCode = process.argv[2] || 'W5MQPA9B';
checkInviteCode(inviteCode).then(() => {
  console.log('\n✅ Check complete\n');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
