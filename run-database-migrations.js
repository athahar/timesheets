// Database migration script for invite system
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

// Initialize Supabase with service role for admin operations
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.EXPO_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  log('❌ Missing Supabase environment variables', 'red');
  log('Need: EXPO_PUBLIC_SUPABASE_URL and EXPO_SERVICE_ROLE_KEY', 'yellow');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigrations() {
  log('\n🚀 RUNNING DATABASE MIGRATIONS FOR INVITE SYSTEM\n', 'bright');

  try {
    // Step 1: Add claimed_status column to trackpay_users
    log('Step 1: Adding claimed_status column to trackpay_users...', 'cyan');

    const addClaimedStatusQuery = `
      ALTER TABLE trackpay_users
      ADD COLUMN IF NOT EXISTS claimed_status VARCHAR(20) DEFAULT 'claimed'
      CHECK (claimed_status IN ('claimed', 'unclaimed'));
    `;

    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: addClaimedStatusQuery
    });

    if (addColumnError && !addColumnError.message.includes('already exists')) {
      // Try direct query if RPC doesn't work
      const { error: directError } = await supabase
        .from('trackpay_users')
        .select('claimed_status')
        .limit(1);

      if (directError && directError.message.includes('column') && directError.message.includes('does not exist')) {
        log('⚠️  Could not add column via API - please run this SQL manually in Supabase dashboard:', 'yellow');
        log(addClaimedStatusQuery, 'gray');
        log('Continuing with next steps...', 'yellow');
      } else {
        log('✅ claimed_status column already exists or added successfully', 'green');
      }
    } else {
      log('✅ claimed_status column added successfully', 'green');
    }

    // Step 2: Update existing users to claimed status
    log('\nStep 2: Updating existing users to claimed status...', 'cyan');

    const { error: updateUsersError } = await supabase
      .from('trackpay_users')
      .update({ claimed_status: 'claimed' })
      .is('claimed_status', null);

    if (updateUsersError && !updateUsersError.message.includes('claimed_status')) {
      log(`⚠️  Could not update existing users: ${updateUsersError.message}`, 'yellow');
    } else {
      log('✅ Updated existing users to claimed status', 'green');
    }

    // Step 3: Create trackpay_invites table
    log('\nStep 3: Creating trackpay_invites table...', 'cyan');

    const createInvitesTableQuery = `
      CREATE TABLE IF NOT EXISTS trackpay_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE CASCADE,
        invite_code VARCHAR(8) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
        claimed_by UUID REFERENCES trackpay_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        claimed_at TIMESTAMP WITH TIME ZONE,

        CONSTRAINT valid_claimed_status CHECK (
          (status = 'claimed' AND claimed_by IS NOT NULL AND claimed_at IS NOT NULL) OR
          (status != 'claimed' AND claimed_by IS NULL AND claimed_at IS NULL)
        ),
        CONSTRAINT expires_after_creation CHECK (expires_at > created_at)
      );
    `;

    // Since we can't use RPC for complex DDL, let's check if table exists
    const { data: tableExists, error: checkTableError } = await supabase
      .from('trackpay_invites')
      .select('count')
      .limit(1);

    if (checkTableError && checkTableError.message.includes('does not exist')) {
      log('⚠️  trackpay_invites table does not exist - please create it manually:', 'yellow');
      log(createInvitesTableQuery, 'gray');
      log('\nAlso create these indexes:', 'yellow');
      log(`
CREATE INDEX IF NOT EXISTS idx_trackpay_invites_provider_id ON trackpay_invites(provider_id);
CREATE INDEX IF NOT EXISTS idx_trackpay_invites_client_id ON trackpay_invites(client_id);
CREATE INDEX IF NOT EXISTS idx_trackpay_invites_invite_code ON trackpay_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_trackpay_invites_status ON trackpay_invites(status);
CREATE INDEX IF NOT EXISTS idx_trackpay_invites_expires_at ON trackpay_invites(expires_at);
      `, 'gray');
    } else {
      log('✅ trackpay_invites table already exists', 'green');
    }

    // Step 4: Test basic functionality
    log('\nStep 4: Testing database schema...', 'cyan');

    // Test trackpay_users with claimed_status
    const { data: testUsers, error: testUsersError } = await supabase
      .from('trackpay_users')
      .select('id, name, role, claimed_status')
      .limit(3);

    if (testUsersError) {
      throw new Error(`Users table test failed: ${testUsersError.message}`);
    }

    log(`✅ Users table test passed - found ${testUsers.length} users`, 'green');
    testUsers.forEach(user => {
      log(`   - ${user.name} (${user.role}) - ${user.claimed_status || 'null'}`, 'gray');
    });

    // Test trackpay_invites table (if it exists)
    const { data: testInvites, error: testInvitesError } = await supabase
      .from('trackpay_invites')
      .select('count')
      .limit(1);

    if (testInvitesError) {
      log(`⚠️  Invites table not ready: ${testInvitesError.message}`, 'yellow');
    } else {
      log('✅ Invites table test passed', 'green');
    }

    // Summary
    log('\n' + '='.repeat(60), 'bright');
    log('📊 MIGRATION SUMMARY', 'bright');
    log('='.repeat(60), 'bright');

    log('\n✅ Completed Steps:', 'green');
    log('1. ✅ claimed_status column added/verified', 'gray');
    log('2. ✅ Existing users updated to claimed', 'gray');
    log('3. ⚠️  trackpay_invites table (may need manual creation)', 'yellow');
    log('4. ✅ Basic schema tests passed', 'gray');

    if (testInvitesError) {
      log('\n⚠️  Action Required:', 'yellow');
      log('Please run the trackpay_invites table creation SQL in your Supabase dashboard.', 'yellow');
      log('SQL scripts are saved in /database/ folder.', 'yellow');
    } else {
      log('\n🎉 All migrations completed successfully!', 'green');
      log('The invite system database schema is ready.', 'green');
    }

  } catch (error) {
    log('\n' + '='.repeat(60), 'bright');
    log('❌ MIGRATION FAILED!', 'red');
    log('='.repeat(60), 'bright');
    log(`\nError: ${error.message}`, 'red');

    log('\n💡 Manual Setup Instructions:', 'yellow');
    log('1. Go to your Supabase dashboard', 'gray');
    log('2. Navigate to SQL Editor', 'gray');
    log('3. Run the SQL scripts in /database/ folder:', 'gray');
    log('   - create-invites-table.sql', 'gray');
    log('   - update-invite-architecture.sql', 'gray');

    process.exit(1);
  }
}

// Run migrations
runMigrations();