// Check invite code in STAGING database
const { createClient } = require('@supabase/supabase-js');

const STAGING_URL = 'https://qpoqeqasefatyrjeronp.supabase.co';
const STAGING_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3FlcWFzZWZhdHlyamVyb25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MzY2MDQsImV4cCI6MjA2MzAxMjYwNH0.DElaq79mhYOf_1kheOkrS9hTBeJ8HQwGRT3qmokJ5S8';

const supabase = createClient(STAGING_URL, STAGING_ANON_KEY);

async function checkInviteCode(inviteCode) {
  console.log(`\n🔍 Checking STAGING database for invite code: ${inviteCode}`);
  console.log(`📊 Database: ${STAGING_URL}\n`);

  // Query: Check if invite exists
  const { data: invites, error } = await supabase
    .from('trackpay_invites')
    .select('*')
    .eq('invite_code', inviteCode);

  if (error) {
    console.error('❌ Error querying invites:', error);
    return;
  }

  if (!invites || invites.length === 0) {
    console.log('❌ NO INVITE FOUND in staging either');

    // Show recent invites
    const { data: recentInvites } = await supabase
      .from('trackpay_invites')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentInvites && recentInvites.length > 0) {
      console.log('\n📋 Last 10 invites in STAGING database:');
      recentInvites.forEach(inv => {
        console.log(`  - ${inv.invite_code} | status: ${inv.status} | created: ${inv.created_at}`);
      });
    } else {
      console.log('\n📋 No invites found in staging database either');
    }
  } else {
    console.log('✅ FOUND INVITE in STAGING:');
    const invite = invites[0];
    console.log(JSON.stringify(invite, null, 2));

    // Check if expired
    const expiresAt = new Date(invite.expires_at);
    const now = new Date();
    const isExpired = expiresAt < now;

    console.log(`\n⏰ Status: ${invite.status}`);
    console.log(`⏰ Expires: ${expiresAt.toISOString()} (${isExpired ? '❌ EXPIRED' : '✅ Valid'})`);
  }
}

const inviteCode = process.argv[2] || 'W5MQPA9B';
checkInviteCode(inviteCode).then(() => {
  console.log('\n✅ Check complete\n');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
