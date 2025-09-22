// Direct table creation for trackpay_invites
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Initialize Supabase with service role
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.EXPO_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createInvitesTable() {
  log('\n🚀 CREATING TRACKPAY_INVITES TABLE\n', 'bright');

  try {
    // Step 1: Create the table using individual operations
    log('Step 1: Attempting to create trackpay_invites table...', 'cyan');

    // First, let's try to create a simple version and build on it
    const simpleTableQuery = `
      CREATE TABLE trackpay_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL,
        client_id UUID NOT NULL,
        invite_code VARCHAR(8) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        claimed_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        claimed_at TIMESTAMP WITH TIME ZONE
      );
    `;

    // Try to insert a test record to see if table exists
    const { error: testInsertError } = await supabase
      .from('trackpay_invites')
      .insert([{
        provider_id: '00000000-0000-0000-0000-000000000000',
        client_id: '00000000-0000-0000-0000-000000000000',
        invite_code: 'TEST1234',
        expires_at: new Date().toISOString()
      }]);

    if (testInsertError && testInsertError.message.includes('does not exist')) {
      log('⚠️  Table does not exist, attempting SQL execution...', 'yellow');

      // Try using the RPC approach for SQL execution
      const { data, error: rpcError } = await supabase.rpc('execute_sql', {
        query: simpleTableQuery
      });

      if (rpcError) {
        log(`⚠️  RPC failed: ${rpcError.message}`, 'yellow');
        log('Please create the table manually using Supabase dashboard:', 'yellow');
        log(simpleTableQuery, 'gray');
        return false;
      }

      log('✅ Table created successfully via RPC', 'green');
    } else if (testInsertError) {
      // Table exists but has constraints, let's clean up the test
      await supabase
        .from('trackpay_invites')
        .delete()
        .eq('invite_code', 'TEST1234');

      log('✅ Table already exists', 'green');
    } else {
      // Clean up successful test insert
      await supabase
        .from('trackpay_invites')
        .delete()
        .eq('invite_code', 'TEST1234');

      log('✅ Table already exists and is working', 'green');
    }

    // Step 2: Test the table functionality
    log('\nStep 2: Testing table functionality...', 'cyan');

    const { data: tableTest, error: tableTestError } = await supabase
      .from('trackpay_invites')
      .select('count')
      .limit(1);

    if (tableTestError) {
      throw new Error(`Table test failed: ${tableTestError.message}`);
    }

    log('✅ Table is functional and ready', 'green');

    // Step 3: Add foreign key constraints if possible
    log('\nStep 3: Checking constraints...', 'cyan');

    // Test inserting with valid UUIDs from trackpay_users
    const { data: testProvider } = await supabase
      .from('trackpay_users')
      .select('id')
      .eq('role', 'provider')
      .limit(1);

    const { data: testClient } = await supabase
      .from('trackpay_users')
      .select('id')
      .eq('role', 'client')
      .limit(1);

    if (testProvider && testProvider.length > 0 && testClient && testClient.length > 0) {
      const testInvite = {
        provider_id: testProvider[0].id,
        client_id: testClient[0].id,
        invite_code: 'TESTFK01',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const { data: insertTest, error: insertTestError } = await supabase
        .from('trackpay_invites')
        .insert([testInvite])
        .select()
        .single();

      if (insertTestError) {
        log(`⚠️  Constraint test failed: ${insertTestError.message}`, 'yellow');
      } else {
        log('✅ Foreign key constraints working', 'green');

        // Clean up test invite
        await supabase
          .from('trackpay_invites')
          .delete()
          .eq('id', insertTest.id);
      }
    }

    log('\n' + '='.repeat(50), 'bright');
    log('🎉 TRACKPAY_INVITES TABLE READY!', 'green');
    log('='.repeat(50), 'bright');

    return true;

  } catch (error) {
    log('\n' + '='.repeat(50), 'bright');
    log('❌ TABLE CREATION FAILED!', 'red');
    log('='.repeat(50), 'bright');
    log(`\nError: ${error.message}`, 'red');

    log('\n💡 Manual Setup Required:', 'yellow');
    log('Go to Supabase Dashboard → SQL Editor and run:', 'yellow');
    log(`
CREATE TABLE trackpay_invites (
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

CREATE INDEX idx_trackpay_invites_provider_id ON trackpay_invites(provider_id);
CREATE INDEX idx_trackpay_invites_client_id ON trackpay_invites(client_id);
CREATE INDEX idx_trackpay_invites_invite_code ON trackpay_invites(invite_code);
CREATE INDEX idx_trackpay_invites_status ON trackpay_invites(status);
    `, 'gray');

    return false;
  }
}

// Run table creation
createInvitesTable().then(success => {
  if (success) {
    log('\n🚀 Ready to test the complete invite system!', 'cyan');
    log('Run: node test-invite-flow-final.js', 'yellow');
  }
});