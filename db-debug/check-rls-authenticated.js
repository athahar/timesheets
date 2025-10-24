// Check RLS policies for authenticated users
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://ddxggihlncanqdypzsnn.supabase.co';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeGdnaWhsbmNhbnFkeXB6c25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODI4MjYsImV4cCI6MjA3NjU1ODgyNn0.-_Jq7Sj8oAy8YkUTGrTtxtD5KuZ8CicjDnrfX48N0UI';

const supabase = createClient(PROD_URL, PROD_ANON_KEY);

async function testAuthenticatedAccess() {
  console.log('\n🔍 Testing RLS for authenticated users\n');

  // First, try to sign in with test account
  console.log('1️⃣ Attempting to sign in...');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ady@das.com',
    password: 'demo123$'
  });

  if (authError) {
    console.log('❌ Sign in failed:', authError.message);
    console.log('\n📋 Cannot test authenticated access without valid credentials');
    return;
  }

  console.log('✅ Signed in as:', authData.user.email);
  console.log('Auth User ID:', authData.user.id);

  // Test 1: Can authenticated user read trackpay_users by email?
  console.log('\n2️⃣ Testing: Read trackpay_users by email...');
  const { data: userData, error: userError } = await supabase
    .from('trackpay_users')
    .select('*')
    .eq('email', authData.user.email);

  if (userError) {
    console.log('❌ Failed:', userError.message);
    console.log('   Code:', userError.code);
    console.log('   Details:', userError.details);
  } else {
    console.log('✅ Success! Found users:', userData?.length || 0);
    if (userData && userData.length > 0) {
      console.log('   User:', userData[0].name, '- Role:', userData[0].role);
    }
  }

  // Test 2: Can authenticated user read pending invites?
  console.log('\n3️⃣ Testing: Read trackpay_invites by code...');
  const { data: inviteData, error: inviteError } = await supabase
    .from('trackpay_invites')
    .select(`
      *,
      client:trackpay_users!client_id(id, name, hourly_rate, role),
      provider:trackpay_users!provider_id(id, name, role)
    `)
    .eq('invite_code', 'W5MQPA9B')
    .eq('status', 'pending');

  if (inviteError) {
    console.log('❌ Failed:', inviteError.message);
    console.log('   Code:', inviteError.code);
    console.log('   Details:', inviteError.details);
  } else {
    console.log('✅ Success! Found invites:', inviteData?.length || 0);
    if (inviteData && inviteData.length > 0) {
      console.log('   Invite:', inviteData[0].invite_code);
    }
  }

  // Test 3: Can authenticated user read their own trackpay_users record by auth_user_id?
  console.log('\n4️⃣ Testing: Read trackpay_users by auth_user_id...');
  const { data: authUserData, error: authUserError } = await supabase
    .from('trackpay_users')
    .select('*')
    .eq('auth_user_id', authData.user.id);

  if (authUserError) {
    console.log('❌ Failed:', authUserError.message);
    console.log('   Code:', authUserError.code);
  } else {
    console.log('✅ Success! Found users:', authUserData?.length || 0);
    if (authUserData && authUserData.length > 0) {
      console.log('   User:', authUserData[0].name);
    }
  }

  // Sign out
  await supabase.auth.signOut();
  console.log('\n✅ Signed out\n');
}

testAuthenticatedAccess().catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
