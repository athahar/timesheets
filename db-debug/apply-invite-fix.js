// Apply RLS fix to production database
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const PROD_URL = 'https://ddxggihlncanqdypzsnn.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeGdnaWhsbmNhbnFkeXB6c25uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk4MjgyNiwiZXhwIjoyMDc2NTU4ODI2fQ.7pSVpcAX81v2qj_rarQIKienNi2vGNSt9VKTmPd7KzA';

const supabase = createClient(PROD_URL, PROD_SERVICE_KEY);

async function applyFix() {
  console.log('\n🔧 Applying RLS fix to production database...\n');

  const sql = `
-- Policy: Allow anonymous users to SELECT pending invites by invite_code
CREATE POLICY "Allow public invite code validation"
ON trackpay_invites
FOR SELECT
TO anon
USING (
  status = 'pending'
  AND expires_at > now()
);
  `;

  console.log('📝 SQL to execute:');
  console.log(sql);
  console.log('\n🚀 Executing...\n');

  // Execute the SQL using a raw query
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    // If exec_sql RPC doesn't exist, we need to run this manually
    console.log('❌ Cannot execute SQL via RPC (exec_sql function not available)');
    console.log('Error:', error);
    console.log('\n📋 MANUAL ACTION REQUIRED:');
    console.log('1. Go to: https://supabase.com/dashboard/project/ddxggihlncanqdypzsnn/sql/new');
    console.log('2. Paste the SQL from fix-invite-rls.sql');
    console.log('3. Click "Run"');
    console.log('\nAlternatively, I can try using Supabase CLI...');
    return false;
  }

  console.log('✅ RLS policy created successfully!');
  console.log('Data:', data);

  // Test the fix
  console.log('\n🧪 Testing fix with ANON key...\n');

  const anonSupabase = createClient(PROD_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeGdnaWhsbmNhbnFkeXB6c25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODI4MjYsImV4cCI6MjA3NjU1ODgyNn0.-_Jq7Sj8oAy8YkUTGrTtxtD5KuZ8CicjDnrfX48N0UI');

  const { data: testData, error: testError } = await anonSupabase
    .from('trackpay_invites')
    .select('*')
    .eq('invite_code', 'W5MQPA9B')
    .eq('status', 'pending')
    .single();

  if (testError) {
    console.log('❌ Test failed:', testError);
    return false;
  }

  if (testData) {
    console.log('✅ SUCCESS! Invite is now visible with ANON key!');
    console.log('Code:', testData.invite_code);
    console.log('Status:', testData.status);
    console.log('Expires:', testData.expires_at);
    return true;
  }

  console.log('❌ Test failed: Invite not found');
  return false;
}

applyFix().then((success) => {
  if (success) {
    console.log('\n✅ Fix applied and tested successfully!\n');
  } else {
    console.log('\n⚠️  Manual action required - see instructions above\n');
  }
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
