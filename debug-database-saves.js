// Debug Database Saves - Check All Tables
// Copy and paste this in browser console at http://localhost:8087

console.log('🔍 Debug: Checking All Database Tables');

async function debugDatabaseSaves() {
  try {
    console.log('\n=== CHECKING ALL TABLES ===\n');

    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase not available');
      return;
    }

    // Check trackpay_sessions
    console.log('📊 Checking trackpay_sessions...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('trackpay_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError);
    } else {
      console.log(`✅ Found ${sessions.length} recent sessions:`, sessions);
    }

    // Check trackpay_payments
    console.log('\n💰 Checking trackpay_payments...');
    const { data: payments, error: paymentsError } = await supabase
      .from('trackpay_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError);
    } else {
      console.log(`✅ Found ${payments.length} recent payments:`, payments);
    }

    // Check trackpay_users
    console.log('\n👥 Checking trackpay_users...');
    const { data: users, error: usersError } = await supabase
      .from('trackpay_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log(`✅ Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.role}) - ID: ${user.id} - Auth: ${user.auth_user_id || 'None'}`);
      });
    }

    // Check trackpay_relationships
    console.log('\n🔗 Checking trackpay_relationships...');
    const { data: relationships, error: relationshipsError } = await supabase
      .from('trackpay_relationships')
      .select('*')
      .order('created_at', { ascending: false });

    if (relationshipsError) {
      console.error('❌ Error fetching relationships:', relationshipsError);
    } else {
      console.log(`✅ Found ${relationships.length} relationships:`, relationships);
    }

    // Check trackpay_activities
    console.log('\n📝 Checking trackpay_activities...');
    const { data: activities, error: activitiesError } = await supabase
      .from('trackpay_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (activitiesError) {
      console.error('❌ Error fetching activities:', activitiesError);
    } else {
      console.log(`✅ Found ${activities.length} recent activities:`, activities);

      // Count provider_id nulls
      const nullProviderIds = activities.filter(a => a.provider_id === null).length;
      console.log(`⚠️ Activities with null provider_id: ${nullProviderIds}/${activities.length}`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Test current provider ID resolution
async function testProviderIdResolution() {
  console.log('\n🔑 Testing Provider ID Resolution...');

  try {
    if (typeof hybridStorage === 'undefined') {
      console.error('❌ hybridStorage not available');
      return;
    }

    // Test getCurrentUser from hybridStorage
    const currentUser = await hybridStorage.getCurrentUser();
    console.log('📱 Current user from hybridStorage:', currentUser);

    // Test Supabase auth
    if (typeof getCurrentUser !== 'undefined') {
      const authUser = await getCurrentUser();
      console.log('🔐 Supabase auth user:', authUser ? {
        id: authUser.id,
        email: authUser.email
      } : null);
    }

    // Test manual provider ID resolution (simulate what getCurrentProviderId does)
    console.log('\n🔍 Manual Provider ID Resolution Test:');

    // Get all users
    const { data: users } = await supabase.from('trackpay_users').select('*');
    const providers = users.filter(u => u.role === 'provider');
    console.log('🏢 Available providers:', providers.map(p => `${p.name} (${p.id})`));

    // Check auth-linked providers
    if (typeof getCurrentUser !== 'undefined') {
      const authUser = await getCurrentUser();
      if (authUser) {
        const { data: linkedProviders } = await supabase
          .from('trackpay_users')
          .select('*')
          .eq('auth_user_id', authUser.id)
          .eq('role', 'provider');

        console.log('🔗 Auth-linked providers:', linkedProviders);
      }
    }

    // Check local user match
    if (currentUser) {
      const matchingProvider = users.find(u =>
        (u.name === currentUser || u.email === currentUser) && u.role === 'provider'
      );
      console.log('📱 Local user matches provider:', matchingProvider || 'None');
    }

  } catch (error) {
    console.error('❌ Provider ID resolution test failed:', error);
  }
}

// Test session creation with debugging
async function testSessionCreationDetailed() {
  console.log('\n📊 Testing Session Creation with Detailed Logging...');

  try {
    if (typeof hybridStorage === 'undefined') {
      console.error('❌ hybridStorage not available');
      return;
    }

    // Get clients
    const clients = await hybridStorage.getClients();
    if (clients.length === 0) {
      console.error('❌ No clients available');
      return;
    }

    const testClient = clients[0];
    console.log(`🎯 Using client: ${testClient.name} (${testClient.id})`);

    // Start session with monitoring
    console.log('\n▶️ Starting session...');

    // Monitor console for saves
    const originalLog = console.log;
    let saveMessages = [];

    console.log = function(...args) {
      const message = args.join(' ');
      if (message.includes('saved to Supabase') ||
          message.includes('Session created') ||
          message.includes('provider_id') ||
          message.includes('Provider ID')) {
        saveMessages.push(message);
      }
      originalLog.apply(console, args);
    };

    const session = await hybridStorage.startSession(testClient.id);

    // Wait for async saves
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log = originalLog;

    console.log('\n📡 Captured save messages:', saveMessages);

    // Check if session was actually saved to database
    const { data: dbSession } = await supabase
      .from('trackpay_sessions')
      .select('*')
      .eq('id', session.id)
      .single();

    console.log('💾 Session in database:', dbSession || 'NOT FOUND');

    return session;

  } catch (error) {
    console.error('❌ Session creation test failed:', error);
  }
}

// Run all debugging
async function runAllDebugging() {
  console.log('🚀 Running comprehensive database debugging...');

  await debugDatabaseSaves();
  await testProviderIdResolution();
  await testSessionCreationDetailed();

  console.log('\n📋 SUMMARY:');
  console.log('1. Check if sessions are actually saving to trackpay_sessions');
  console.log('2. Verify provider_id resolution is working');
  console.log('3. Look for any error messages in console');
}

// Auto-run
runAllDebugging();

// Make available
window.debugDatabaseSaves = debugDatabaseSaves;
window.testProviderIdResolution = testProviderIdResolution;
window.testSessionCreationDetailed = testSessionCreationDetailed;

console.log('\n🛠️ Available debug functions:');
console.log('  - debugDatabaseSaves(): Check all table contents');
console.log('  - testProviderIdResolution(): Test provider ID logic');
console.log('  - testSessionCreationDetailed(): Monitor session creation');