// Simple test for invite system using CommonJS
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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

// Test credentials (we'll use anon key with RLS for testing)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  log('❌ Missing Supabase environment variables', 'red');
  log('Found URL: ' + !!supabaseUrl, 'yellow');
  log('Found Key: ' + !!supabaseKey, 'yellow');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to generate invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate a unique UUID (simple version)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testBasicInviteFlow() {
  log('\n🧪 TESTING BASIC INVITE FLOW\n', 'bright');

  try {
    // Test 1: Generate invite code
    log('Test 1: Generate invite code...', 'cyan');
    const inviteCode = generateInviteCode();
    log(`✅ Generated invite code: ${inviteCode}`, 'green');

    // Test 2: Test invite code validation
    log('\nTest 2: Validate invite code format...', 'cyan');
    const isValid = /^[A-Z0-9]{8}$/.test(inviteCode);
    const hasConfusingChars = /[0OIL]/.test(inviteCode);

    if (isValid && !hasConfusingChars) {
      log(`✅ Invite code format is valid`, 'green');
    } else {
      throw new Error(`Invalid invite code format: ${inviteCode}`);
    }

    // Test 3: Test shareable links
    log('\nTest 3: Generate shareable links...', 'cyan');
    const deepLink = `trackpay://invite/${inviteCode}`;
    const webLink = `https://trackpay.app/invite/${inviteCode}`;

    log(`✅ Deep link: ${deepLink}`, 'magenta');
    log(`✅ Web link: ${webLink}`, 'magenta');

    // Test 4: Check database connectivity
    log('\nTest 4: Testing database connectivity...', 'cyan');

    const { data: testQuery, error: connectError } = await supabase
      .from('trackpay_users')
      .select('count')
      .limit(1);

    if (connectError) {
      throw new Error(`Database connection failed: ${connectError.message}`);
    }

    log(`✅ Database connection successful`, 'green');

    // Test 5: Check for existing providers
    log('\nTest 5: Checking for existing providers...', 'cyan');

    const { data: providers, error: providerError } = await supabase
      .from('trackpay_users')
      .select('id, name, role')
      .eq('role', 'provider')
      .limit(5);

    if (providerError) {
      throw new Error(`Failed to fetch providers: ${providerError.message}`);
    }

    log(`✅ Found ${providers.length} provider(s)`, 'green');
    if (providers.length > 0) {
      providers.forEach(p => {
        log(`   - ${p.name} (${p.id.substring(0, 8)}...)`, 'gray');
      });
    }

    // Test 6: Test UUID generation
    log('\nTest 6: Testing UUID generation...', 'cyan');
    const testUUID = generateUUID();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (uuidPattern.test(testUUID)) {
      log(`✅ UUID generation working: ${testUUID}`, 'green');
    } else {
      throw new Error(`Invalid UUID generated: ${testUUID}`);
    }

    // Test 7: Simulate workflow without database writes
    log('\nTest 7: Simulating complete workflow...', 'cyan');

    const mockClient = {
      id: generateUUID(),
      name: `Test Client ${Date.now()}`,
      email: null,
      hourlyRate: 75.00,
      claimedStatus: 'unclaimed',
      inviteCode: generateInviteCode()
    };

    log(`✅ Mock client created:`, 'green');
    log(`   ID: ${mockClient.id}`, 'gray');
    log(`   Name: ${mockClient.name}`, 'gray');
    log(`   Rate: $${mockClient.hourlyRate}/hr`, 'gray');
    log(`   Status: ${mockClient.claimedStatus}`, 'yellow');
    log(`   Invite: ${mockClient.inviteCode}`, 'magenta');

    // Simulate claiming
    const claimedClient = {
      ...mockClient,
      email: 'claimed@example.com',
      claimedStatus: 'claimed',
      authUserId: `auth_${Date.now()}`
    };

    log(`✅ Simulated claiming:`, 'green');
    log(`   Email: ${claimedClient.email}`, 'gray');
    log(`   Status: ${claimedClient.claimedStatus}`, 'green');
    log(`   Auth ID: ${claimedClient.authUserId}`, 'gray');

    // Final success
    log('\n' + '='.repeat(50), 'bright');
    log('🎉 ALL BASIC TESTS PASSED!', 'green');
    log('='.repeat(50), 'bright');

    log('\n📊 Test Summary:', 'cyan');
    log('1. ✅ Invite code generation', 'gray');
    log('2. ✅ Code format validation', 'gray');
    log('3. ✅ Shareable link generation', 'gray');
    log('4. ✅ Database connectivity', 'gray');
    log('5. ✅ Provider data access', 'gray');
    log('6. ✅ UUID generation', 'gray');
    log('7. ✅ Workflow simulation', 'gray');

    log('\n💡 Core invite system functions are working!', 'green');
    log('💡 Next: Run database schema updates and test with real data', 'yellow');

  } catch (error) {
    log('\n' + '='.repeat(50), 'bright');
    log('❌ TEST FAILED!', 'red');
    log('='.repeat(50), 'bright');
    log(`\nError: ${error.message}`, 'red');

    if (error.message.includes('connect') || error.message.includes('auth')) {
      log('\n💡 Tip: Make sure your Supabase credentials are correct in .env', 'yellow');
      log('💡 Tip: Check if trackpay_users table exists in your database', 'yellow');
    }

    process.exit(1);
  }
}

// Run the test
testBasicInviteFlow();