// Test Dynamic Provider ID Functionality
// Copy and paste this in browser console at http://localhost:8087

console.log('🔑 TrackPay: Testing Dynamic Provider ID');

async function testDynamicProviderId() {
  try {
    console.log('\n=== TESTING DYNAMIC PROVIDER ID ===\n');

    if (typeof hybridStorage === 'undefined') {
      console.error('❌ hybridStorage not available');
      return;
    }

    console.log('✅ hybridStorage available');

    // Test 1: Check current user context
    console.log('\n👤 Test 1: Current User Context...');

    // Check if Supabase auth is available
    if (typeof getCurrentUser !== 'undefined') {
      const authUser = await getCurrentUser();
      console.log('🔐 Supabase auth user:', authUser ? {
        id: authUser.id,
        email: authUser.email
      } : 'Not authenticated');
    } else {
      console.log('⚠️ getCurrentUser not available');
    }

    // Check local current user
    const localUser = await hybridStorage.getCurrentUser();
    console.log('📱 Local current user:', localUser);

    // Test 2: Get all users to understand provider context
    console.log('\n👥 Test 2: Available Users...');
    const users = await hybridStorage.getUsers();
    console.log(`📊 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Role: ${user.role} - ID: ${user.id}`);
    });

    // Find providers
    const providers = users.filter(u => u.role === 'provider');
    console.log(`🏢 Found ${providers.length} providers`);

    // Test 3: Session Creation with Dynamic Provider ID
    console.log('\n📊 Test 3: Session Creation with Dynamic Provider ID...');

    // Get existing clients
    const clients = await hybridStorage.getClients();
    if (clients.length === 0) {
      console.error('❌ No clients available for testing');
      return;
    }

    const testClient = clients[0];
    console.log(`🎯 Testing with client: ${testClient.name} (ID: ${testClient.id})`);

    // Start session - this should now use dynamic provider ID
    console.log('▶️  Starting session with dynamic provider ID...');
    const session = await hybridStorage.startSession(testClient.id);
    console.log('✅ Session created:', session.id);

    // Check what got saved to Supabase
    console.log('\n🔍 Test 4: Verifying Provider ID in Database...');

    // Small delay to ensure data is saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Query the session from database
    if (typeof supabase !== 'undefined') {
      const { data: sessionData, error } = await supabase
        .from('trackpay_sessions')
        .select('id, provider_id, client_id')
        .eq('id', session.id)
        .single();

      if (error) {
        console.error('❌ Error querying session:', error);
      } else {
        console.log('✅ Session in database:', sessionData);
        console.log('🔑 Provider ID used:', sessionData.provider_id);

        // Check if it's a valid UUID (not the old hardcoded value)
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionData.provider_id);
        console.log('✅ Valid UUID format:', isValidUUID ? 'Yes' : 'No');

        // Check if it matches any of our known providers
        const matchingProvider = providers.find(p => p.id === sessionData.provider_id);
        if (matchingProvider) {
          console.log('✅ Provider resolved to:', matchingProvider.name, `(${matchingProvider.email})`);
        } else {
          console.log('⚠️ Provider ID does not match any known provider');
          console.log('📋 Known provider IDs:', providers.map(p => `${p.name}: ${p.id}`));
        }
      }
    }

    // Test 5: End session and verify provider ID consistency
    console.log('\n⏹️ Test 5: Ending Session...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const endedSession = await hybridStorage.endSession(session.id);
    console.log('✅ Session ended:', endedSession.id);

    console.log('\n🎉 Dynamic Provider ID Test Completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('Stack trace:', error.stack);
  }
}

// Test provider ID resolution specifically
async function testProviderIdResolution() {
  console.log('\n🔍 Testing Provider ID Resolution Logic...');

  try {
    // Test the resolution logic by checking different scenarios
    console.log('\n📋 Scenario Analysis:');

    // Check Supabase auth
    if (typeof getCurrentUser !== 'undefined') {
      const authUser = await getCurrentUser();
      if (authUser) {
        console.log('✅ Supabase auth user available:', authUser.email);

        // Check if there's a trackpay user linked to this auth user
        if (typeof supabase !== 'undefined') {
          const { data: linkedUsers } = await supabase
            .from('trackpay_users')
            .select('id, name, email, role')
            .eq('auth_user_id', authUser.id)
            .eq('role', 'provider');

          console.log('🔗 Linked trackpay providers:', linkedUsers || []);
        }
      } else {
        console.log('⚠️ No authenticated Supabase user');
      }
    }

    // Check local user
    const localUser = await hybridStorage.getCurrentUser();
    if (localUser) {
      console.log('📱 Local user available:', localUser);

      // Try to find matching provider
      const users = await hybridStorage.getUsers();
      const matchingProvider = users.find(u =>
        (u.name === localUser || u.email === localUser) && u.role === 'provider'
      );

      if (matchingProvider) {
        console.log('✅ Local user resolves to provider:', matchingProvider.name, matchingProvider.id);
      } else {
        console.log('⚠️ Local user does not resolve to a provider');
      }
    } else {
      console.log('⚠️ No local current user');
    }

  } catch (error) {
    console.error('❌ Provider ID resolution test failed:', error);
  }
}

// Enhanced monitoring for provider ID
function monitorProviderIdUsage() {
  console.log('\n📡 Setting up provider ID monitoring...');

  const originalLog = console.log;
  let providerIdUsage = [];

  console.log = function(...args) {
    const message = args.join(' ');

    if (message.includes('Provider ID used:') ||
        message.includes('provider_id') ||
        message.includes('Session saved to Supabase') ||
        message.includes('Session updated in Supabase')) {
      providerIdUsage.push({
        timestamp: new Date().toISOString(),
        message: message
      });
    }

    originalLog.apply(console, args);
  };

  // Reset after 30 seconds and show summary
  setTimeout(() => {
    console.log = originalLog;
    console.log('\n📊 PROVIDER ID USAGE SUMMARY:');
    if (providerIdUsage.length === 0) {
      console.log('ℹ️ No provider ID usage detected during monitoring');
    } else {
      console.log(`📋 Detected ${providerIdUsage.length} provider ID related events:`);
      providerIdUsage.forEach((event, index) => {
        console.log(`  ${index + 1}. [${event.timestamp}] ${event.message}`);
      });
    }
  }, 30000);

  console.log('📡 Provider ID monitoring active for 30 seconds...');
}

// Run complete test suite
async function runProviderIdTests() {
  console.log('🚀 Running complete provider ID test suite...');

  // Start monitoring
  monitorProviderIdUsage();

  // Run tests
  await testProviderIdResolution();
  await testDynamicProviderId();

  console.log('\n📋 WHAT TO VERIFY:');
  console.log('✅ Provider ID should NOT be "550e8400-e29b-41d4-a716-446655440000" (hardcoded)');
  console.log('✅ Provider ID should be a valid UUID');
  console.log('✅ Provider ID should match an actual provider in the database');
  console.log('✅ Sessions should save with correct provider context');
  console.log('⚠️ If fallback is used, check why current user resolution failed');
}

// Auto-run
runProviderIdTests();

// Make functions available
window.testDynamicProviderId = testDynamicProviderId;
window.testProviderIdResolution = testProviderIdResolution;
window.runProviderIdTests = runProviderIdTests;

console.log('\n🛠️  Available test functions:');
console.log('  - testDynamicProviderId(): Test session creation with dynamic provider');
console.log('  - testProviderIdResolution(): Test provider ID resolution logic');
console.log('  - runProviderIdTests(): Run complete provider ID test suite');