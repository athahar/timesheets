// Test SQL execution with service role
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.EXPO_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createTable() {
  console.log('🔧 Attempting to create trackpay_invites table...');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS trackpay_invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE CASCADE,
      client_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE CASCADE,
      invite_code VARCHAR(8) UNIQUE NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
      claimed_by UUID REFERENCES trackpay_users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      claimed_at TIMESTAMP WITH TIME ZONE
    );
  `;

  try {
    // Try using SQL function if it exists
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

    if (error) {
      console.log('❌ exec_sql failed:', error.message);
      console.log('\n🔧 Please create the table manually in Supabase dashboard:');
      console.log(createTableSQL);
      return false;
    }

    console.log('✅ Table created successfully!');
    return true;

  } catch (err) {
    console.log('❌ Error:', err.message);
    console.log('\n🔧 Please create the table manually in Supabase dashboard:');
    console.log(createTableSQL);
    return false;
  }
}

createTable().then(success => {
  if (success) {
    console.log('\n🎉 Ready to test invite system!');
  } else {
    console.log('\n📋 Manual table creation required.');
    console.log('Copy the SQL above and run it in Supabase SQL Editor.');
  }
});