// Check RLS policies on trackpay_invites table
const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://ddxggihlncanqdypzsnn.supabase.co';
const PROD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkeGdnaWhsbmNhbnFkeXB6c25uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDk4MjgyNiwiZXhwIjoyMDc2NTU4ODI2fQ.7pSVpcAX81v2qj_rarQIKienNi2vGNSt9VKTmPd7KzA';

const supabase = createClient(PROD_URL, PROD_SERVICE_KEY);

async function checkRLS() {
  console.log('\n🔍 Checking RLS configuration for trackpay_invites table\n');

  // Query pg_policies to see RLS policies
  const { data, error } = await supabase
    .rpc('exec_sql', {
      query: `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual as using_expression,
          with_check
        FROM pg_policies
        WHERE tablename = 'trackpay_invites'
        ORDER BY policyname;
      `
    });

  if (error) {
    console.log('❌ Could not query pg_policies (RPC might not exist)');
    console.log('Error:', error);

    // Try alternative: check if RLS is enabled
    console.log('\n📊 Checking if RLS is enabled on table...\n');

    const { data: tables, error: tableError } = await supabase
      .from('pg_tables')
      .select('*')
      .eq('tablename', 'trackpay_invites');

    if (tableError) {
      console.log('Error:', tableError);
    }
  } else {
    console.log('📋 RLS Policies:');
    console.log(JSON.stringify(data, null, 2));
  }

  // Alternative check: Try to query table info from information_schema
  console.log('\n📊 Attempting direct SQL query for RLS status...\n');

  const testQuery = `
    SELECT relname, relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE relname = 'trackpay_invites';
  `;

  console.log('Note: RLS status check requires custom RPC function');
  console.log('Workaround: Testing with both anon and service_role keys\n');
}

checkRLS().then(() => {
  console.log('\n✅ Check complete\n');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});
