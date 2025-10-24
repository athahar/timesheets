// Check user state after registration - diagnose duplicate records
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://ddxggihlncanqdypzsnn.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeGdnaWhsbmNhbnFkeXB6c25uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk4MjgyNiwiZXhwIjoyMDc2NTU4ODI2fQ.7pSVpcAX81v2qj_rarQIKienNi2vGNSt9VKTmPd7KzA';

const supabase = createClient(PROD_URL, PROD_SERVICE_KEY);

async function checkUserState(email) {
  console.log(`\n🔍 Checking user state for: ${email}\n`);

  // 1. Find all trackpay_users records with this email
  const { data: users, error: usersError } = await supabase
    .from('trackpay_users')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('❌ Error querying users:', usersError);
    return;
  }

  console.log(`📊 Found ${users?.length || 0} trackpay_users record(s):\n`);

  if (users && users.length > 0) {
    users.forEach((user, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Auth User ID: ${user.auth_user_id || 'NULL'}`);
      console.log(`  Claimed Status: ${user.claimed_status || 'N/A'}`);
      console.log(`  Created: ${user.created_at}`);
      console.log('');
    });
  }

  // 2. Find auth.users record
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (!authError && authUsers) {
    const authUser = authUsers.users.find(u => u.email === email);
    if (authUser) {
      console.log(`🔐 Auth record:`);
      console.log(`  Auth ID: ${authUser.id}`);
      console.log(`  Email: ${authUser.email}`);
      console.log(`  Created: ${authUser.created_at}`);
      console.log('');
    }
  }

  // 3. Check relationships
  if (users && users.length > 0) {
    for (const user of users) {
      const { data: clientRels } = await supabase
        .from('trackpay_relationships')
        .select('*')
        .eq('client_id', user.id);

      const { data: providerRels } = await supabase
        .from('trackpay_relationships')
        .select('*')
        .eq('provider_id', user.id);

      if (clientRels && clientRels.length > 0) {
        console.log(`🔗 Relationships (as client) for ${user.name}:`);
        clientRels.forEach(rel => {
          console.log(`  Provider ID: ${rel.provider_id}`);
        });
        console.log('');
      }

      if (providerRels && providerRels.length > 0) {
        console.log(`🔗 Relationships (as provider) for ${user.name}:`);
        providerRels.forEach(rel => {
          console.log(`  Client ID: ${rel.client_id}`);
        });
        console.log('');
      }
    }
  }

  // 4. Check invites
  const { data: invites } = await supabase
    .from('trackpay_invites')
    .select('*')
    .eq('invite_code', '9D7GCGYV');

  if (invites && invites.length > 0) {
    console.log(`📨 Invite 9D7GCGYV:`);
    invites.forEach(inv => {
      console.log(`  Status: ${inv.status}`);
      console.log(`  Provider ID: ${inv.provider_id}`);
      console.log(`  Client ID: ${inv.client_id}`);
      console.log(`  Claimed by: ${inv.claimed_by || 'not claimed'}`);
    });
    console.log('');
  }

  // 5. Diagnosis
  console.log('📋 DIAGNOSIS:');
  if (users && users.length > 1) {
    console.log(`⚠️  DUPLICATE RECORDS: Found ${users.length} trackpay_users records`);
    console.log(`   - This happens when invite claim fails`);
    console.log(`   - One record: unclaimed client (from invite creation)`);
    console.log(`   - Another record: newly registered user`);
  }

  if (users && users.length === 1) {
    const user = users[0];
    if (user.role === 'client' && user.auth_user_id) {
      console.log('✅ User registered as client with auth_user_id');
      // Check if they have provider relationship
      const { data: rels } = await supabase
        .from('trackpay_relationships')
        .select('*')
        .eq('client_id', user.id);

      if (!rels || rels.length === 0) {
        console.log('❌ BUT: No relationship with provider!');
        console.log('   - Invite claim likely failed');
      } else {
        console.log('✅ Has relationship with provider');
      }
    }
  }
}

const email = process.argv[2] || 'ha@na.com';
checkUserState(email).then(() => {
  console.log('\n✅ Check complete\n');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
