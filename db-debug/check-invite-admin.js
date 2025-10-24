// Check invite code using SERVICE_ROLE key (bypasses RLS)
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://ddxggihlncanqdypzsnn.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeGdnaWhsbmNhbnFkeXB6c25uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk4MjgyNiwiZXhwIjoyMDc2NTU4ODI2fQ.7pSVpcAX81v2qj_rarQIKienNi2vGNSt9VKTmPd7KzA';

// Use SERVICE_ROLE key to bypass RLS
const supabase = createClient(PROD_URL, PROD_SERVICE_KEY);

async function checkInviteCode(inviteCode) {
  console.log(`\n🔍 Checking PRODUCTION database with SERVICE_ROLE key (bypassing RLS)`);
  console.log(`📊 Database: ${PROD_URL}`);
  console.log(`🔑 Code: ${inviteCode}\n`);

  // Query: Check if invite exists (bypassing RLS)
  const { data: invites, error } = await supabase
    .from('trackpay_invites')
    .select('*')
    .eq('invite_code', inviteCode);

  if (error) {
    console.error('❌ Error querying invites:', error);
    return;
  }

  console.log(`📊 Total invites found with code "${inviteCode}": ${invites?.length || 0}`);

  if (!invites || invites.length === 0) {
    console.log('❌ NO INVITE FOUND (even with RLS bypassed)');

    // Show ALL invites in database
    const { data: allInvites } = await supabase
      .from('trackpay_invites')
      .select('id, invite_code, status, created_at')
      .order('created_at', { ascending: false });

    console.log(`\n📊 Total invites in production database: ${allInvites?.length || 0}`);

    if (allInvites && allInvites.length > 0) {
      console.log('\n📋 All invites in PRODUCTION:');
      allInvites.slice(0, 20).forEach(inv => {
        console.log(`  - ${inv.invite_code} | status: ${inv.status} | created: ${inv.created_at}`);
      });
    }
  } else {
    console.log('✅ FOUND INVITE:');
    const invite = invites[0];
    console.log(JSON.stringify(invite, null, 2));
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
