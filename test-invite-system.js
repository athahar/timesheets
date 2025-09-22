#!/usr/bin/env node

/**
 * Comprehensive test for the new invite system
 * Tests the complete flow from client creation to invite claiming
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper function to generate invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testInviteSystem() {
  log('\n🧪 TESTING INVITE SYSTEM\n', 'bright');

  let testProviderId = null;
  let testClientId = null;
  let testInviteCode = null;
  let testAuthUserId = null;

  try {
    // Step 1: Find or create Lucy (provider)
    log('Step 1: Finding Lucy (provider)...', 'cyan');

    const { data: providers, error: providerError } = await supabase
      .from('trackpay_users')
      .select('id, name, email')
      .eq('role', 'provider')
      .eq('name', 'Lucy Provider');

    if (providerError) {
      throw new Error(`Failed to fetch providers: ${providerError.message}`);
    }

    if (providers && providers.length > 0) {
      testProviderId = providers[0].id;
      log(`✅ Found Lucy: ${testProviderId}`, 'green');
    } else {
      // Create Lucy if not exists
      const { data: newProvider, error: createError } = await supabase
        .from('trackpay_users')
        .insert([{
          name: 'Lucy Provider',
          email: 'lucy@trackpay.test',
          role: 'provider',
          claimed_status: 'claimed'
        }])
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create Lucy: ${createError.message}`);
      }

      testProviderId = newProvider.id;
      log(`✅ Created Lucy: ${testProviderId}`, 'green');
    }

    // Step 2: Create an unclaimed client for Lucy
    log('\nStep 2: Creating unclaimed client "Test Client"...', 'cyan');

    const testClientName = `Test Client ${Date.now()}`;
    const { data: newClient, error: clientError } = await supabase
      .from('trackpay_users')
      .insert([{
        name: testClientName,
        email: null, // No email yet - unclaimed
        role: 'client',
        hourly_rate: 75.00,
        claimed_status: 'unclaimed'
      }])
      .select()
      .single();

    if (clientError) {
      throw new Error(`Failed to create client: ${clientError.message}`);
    }

    testClientId = newClient.id;
    log(`✅ Created unclaimed client: ${testClientId}`, 'green');
    log(`   Name: ${newClient.name}`, 'gray');
    log(`   Rate: $${newClient.hourly_rate}/hr`, 'gray');
    log(`   Status: ${newClient.claimed_status}`, 'yellow');

    // Step 3: Create provider-client relationship
    log('\nStep 3: Creating provider-client relationship...', 'cyan');

    const { error: relationshipError } = await supabase
      .from('trackpay_relationships')
      .insert([{
        provider_id: testProviderId,
        client_id: testClientId
      }]);

    if (relationshipError && !relationshipError.message.includes('duplicate')) {
      throw new Error(`Failed to create relationship: ${relationshipError.message}`);
    }

    log(`✅ Created relationship between Lucy and ${testClientName}`, 'green');

    // Step 4: Generate and save invite code
    log('\nStep 4: Generating invite code...', 'cyan');

    testInviteCode = generateInviteCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const { data: invite, error: inviteError } = await supabase
      .from('trackpay_invites')
      .insert([{
        provider_id: testProviderId,
        client_id: testClientId,
        invite_code: testInviteCode,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();

    if (inviteError) {
      throw new Error(`Failed to create invite: ${inviteError.message}`);
    }

    log(`✅ Created invite code: ${testInviteCode}`, 'green');
    log(`   Invite ID: ${invite.id}`, 'gray');
    log(`   Expires: ${invite.expires_at}`, 'gray');
    log(`   Share link: trackpay://invite/${testInviteCode}`, 'magenta');

    // Step 5: Simulate client claiming the invite
    log('\nStep 5: Simulating client claiming invite...', 'cyan');

    // First, verify invite is valid and pending
    const { data: pendingInvite, error: fetchError } = await supabase
      .from('trackpay_invites')
      .select('*')
      .eq('invite_code', testInviteCode)
      .eq('status', 'pending')
      .single();

    if (fetchError || !pendingInvite) {
      throw new Error(`Invite not found or invalid: ${fetchError?.message}`);
    }

    log(`✅ Invite validated - ready to claim`, 'green');

    // Create a simulated auth user ID (in real app, this would come from Supabase Auth)
    testAuthUserId = `auth_${Date.now()}`;

    // Update the client record to "claimed"
    const { error: updateClientError } = await supabase
      .from('trackpay_users')
      .update({
        auth_user_id: testAuthUserId,
        claimed_status: 'claimed',
        email: 'testclient@example.com'
      })
      .eq('id', testClientId);

    if (updateClientError) {
      throw new Error(`Failed to update client: ${updateClientError.message}`);
    }

    log(`✅ Client record updated to claimed`, 'green');

    // Mark invite as claimed
    const { error: claimInviteError } = await supabase
      .from('trackpay_invites')
      .update({
        status: 'claimed',
        claimed_by: testClientId,
        claimed_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    if (claimInviteError) {
      throw new Error(`Failed to claim invite: ${claimInviteError.message}`);
    }

    log(`✅ Invite marked as claimed`, 'green');

    // Step 6: Verify the final state
    log('\nStep 6: Verifying final state...', 'cyan');

    // Check client is now claimed
    const { data: claimedClient, error: verifyClientError } = await supabase
      .from('trackpay_users')
      .select('*')
      .eq('id', testClientId)
      .single();

    if (verifyClientError || !claimedClient) {
      throw new Error(`Failed to verify client: ${verifyClientError?.message}`);
    }

    log(`✅ Client verification:`, 'green');
    log(`   Name: ${claimedClient.name}`, 'gray');
    log(`   Email: ${claimedClient.email}`, 'gray');
    log(`   Status: ${claimedClient.claimed_status}`, 'green');
    log(`   Auth ID: ${claimedClient.auth_user_id}`, 'gray');

    // Check invite is claimed
    const { data: claimedInvite, error: verifyInviteError } = await supabase
      .from('trackpay_invites')
      .select('*')
      .eq('id', invite.id)
      .single();

    if (verifyInviteError || !claimedInvite) {
      throw new Error(`Failed to verify invite: ${verifyInviteError?.message}`);
    }

    log(`✅ Invite verification:`, 'green');
    log(`   Code: ${claimedInvite.invite_code}`, 'gray');
    log(`   Status: ${claimedInvite.status}`, 'green');
    log(`   Claimed at: ${claimedInvite.claimed_at}`, 'gray');

    // Check relationship exists
    const { data: relationship, error: verifyRelError } = await supabase
      .from('trackpay_relationships')
      .select('*')
      .eq('provider_id', testProviderId)
      .eq('client_id', testClientId)
      .single();

    if (verifyRelError || !relationship) {
      throw new Error(`Failed to verify relationship: ${verifyRelError?.message}`);
    }

    log(`✅ Relationship verification:`, 'green');
    log(`   Provider: ${relationship.provider_id.substring(0, 8)}...`, 'gray');
    log(`   Client: ${relationship.client_id.substring(0, 8)}...`, 'gray');

    // Final success message
    log('\n' + '='.repeat(50), 'bright');
    log('🎉 ALL TESTS PASSED!', 'green');
    log('='.repeat(50), 'bright');

    log('\n📊 Summary:', 'cyan');
    log(`1. Created unclaimed client: ${testClientName}`, 'gray');
    log(`2. Generated invite code: ${testInviteCode}`, 'gray');
    log(`3. Client claimed invite successfully`, 'gray');
    log(`4. Relationship established with Lucy`, 'gray');
    log(`5. All database records verified ✓`, 'gray');

    log('\n💡 The invite system is working correctly!', 'green');

  } catch (error) {
    log('\n' + '='.repeat(50), 'bright');
    log('❌ TEST FAILED!', 'red');
    log('='.repeat(50), 'bright');
    log(`\nError: ${error.message}`, 'red');

    // Cleanup if needed
    if (testClientId) {
      log('\n🧹 Cleaning up test data...', 'yellow');
      await supabase.from('trackpay_invites').delete().eq('client_id', testClientId);
      await supabase.from('trackpay_relationships').delete().eq('client_id', testClientId);
      await supabase.from('trackpay_users').delete().eq('id', testClientId);
    }

    process.exit(1);
  }
}

// Run the test
testInviteSystem();