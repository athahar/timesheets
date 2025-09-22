// Test Fixed Provider ID in All Operations
// Copy and paste this in browser console at http://localhost:8087

console.log('🔧 TrackPay: Testing Fixed Provider ID Implementation');

async function testFixedProviderIds() {
  try {
    console.log('\n=== TESTING FIXED PROVIDER ID SAVES ===\n');

    if (typeof hybridStorage === 'undefined') {
      console.error('❌ hybridStorage not available');
      return;
    }

    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase not available');
      return;
    }

    console.log('✅ Services available');

    // Test 1: Check current provider ID resolution
    console.log('\n🔑 Test 1: Provider ID Resolution...');

    // Direct test of the getCurrentProviderId logic
    console.log('🔍 Testing provider ID resolution...');

    // Get current user info
    const currentUser = await hybridStorage.getCurrentUser();
    console.log('📱 Current local user:', currentUser);

    if (typeof getCurrentUser !== 'undefined') {
      const authUser = await getCurrentUser();
      console.log('🔐 Supabase auth user:', authUser ? {
        id: authUser.id,
        email: authUser.email
      } : 'Not authenticated');
    }

    // Get all users to understand context
    const users = await hybridStorage.getUsers();
    const providers = users.filter(u => u.role === 'provider');
    console.log('🏢 Available providers:', providers.map(p => `${p.name} (${p.id})`));

    // Test 2: Full Session Workflow with Database Verification
    console.log('\n📊 Test 2: Complete Session Workflow...');

    // Get clients
    const clients = await hybridStorage.getClients();
    if (clients.length === 0) {
      console.error('❌ No clients available');
      return;
    }

    const testClient = clients[0];
    console.log(`🎯 Using client: ${testClient.name} (${testClient.id})`);

    // Clear recent activities for clean test
    console.log('\n🧹 Clearing recent test data...');

    // Start session
    console.log('\n▶️ Starting session...');
    const session = await hybridStorage.startSession(testClient.id);
    console.log('✅ Session created:', session.id);

    // Wait for async saves
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check session in database
    const { data: dbSession, error: sessionError } = await supabase
      .from('trackpay_sessions')
      .select('*')
      .eq('id', session.id)
      .single();

    if (sessionError) {
      console.error('❌ Session not found in database:', sessionError);
    } else {
      console.log('✅ Session in database:', {
        id: dbSession.id,
        provider_id: dbSession.provider_id,
        client_id: dbSession.client_id,
        status: dbSession.status
      });

      // Verify provider ID
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbSession.provider_id);
      console.log('🔍 Provider ID valid UUID:', isValidUUID ? 'Yes' : 'No');

      const matchingProvider = providers.find(p => p.id === dbSession.provider_id);
      if (matchingProvider) {
        console.log('✅ Provider ID resolves to:', matchingProvider.name);
      } else {
        console.log('⚠️ Provider ID not found in known providers');
      }
    }

    // Check session start activity
    const { data: startActivity } = await supabase
      .from('trackpay_activities')
      .select('*')
      .eq('type', 'session_start')
      .eq('client_id', testClient.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (startActivity && startActivity.length > 0) {
      const activity = startActivity[0];
      console.log('✅ Session start activity:', {
        id: activity.id,
        provider_id: activity.provider_id,
        session_id: activity.session_id,
        data: activity.data
      });

      // Verify activity has provider_id
      if (activity.provider_id) {
        console.log('✅ Activity has provider_id:', activity.provider_id);
      } else {
        console.log('❌ Activity missing provider_id');
      }

      // Verify activity has session_id
      if (activity.session_id || activity.data?.sessionId) {
        console.log('✅ Activity has session reference');
      } else {
        console.log('❌ Activity missing session reference');
      }
    }

    // End session
    console.log('\n⏹️ Ending session...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

    const endedSession = await hybridStorage.endSession(session.id);
    console.log('✅ Session ended:', endedSession.id);

    // Wait for async saves
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check updated session in database
    const { data: updatedDbSession } = await supabase
      .from('trackpay_sessions')
      .select('*')
      .eq('id', session.id)
      .single();

    if (updatedDbSession) {
      console.log('✅ Updated session in database:', {
        id: updatedDbSession.id,
        provider_id: updatedDbSession.provider_id,
        status: updatedDbSession.status,
        duration_minutes: updatedDbSession.duration_minutes,
        amount_due: updatedDbSession.amount_due
      });
    }

    // Check session end activity
    const { data: endActivity } = await supabase
      .from('trackpay_activities')
      .select('*')
      .eq('type', 'session_end')
      .eq('client_id', testClient.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (endActivity && endActivity.length > 0) {
      const activity = endActivity[0];
      console.log('✅ Session end activity:', {
        id: activity.id,
        provider_id: activity.provider_id,
        session_id: activity.session_id,
        data: activity.data
      });
    }

    // Test 3: Payment Workflow
    console.log('\n💰 Test 3: Payment Workflow...');

    // Request payment
    console.log('📝 Requesting payment...');
    await hybridStorage.requestPayment(testClient.id, [endedSession.id]);

    // Wait for async saves
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check payment request activity
    const { data: paymentRequestActivity } = await supabase
      .from('trackpay_activities')
      .select('*')
      .eq('type', 'payment_request')
      .eq('client_id', testClient.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (paymentRequestActivity && paymentRequestActivity.length > 0) {
      const activity = paymentRequestActivity[0];
      console.log('✅ Payment request activity:', {
        provider_id: activity.provider_id,
        client_id: activity.client_id,
        data: activity.data
      });
    }

    // Mark as paid
    console.log('💳 Marking as paid...');
    const payment = await hybridStorage.markPaid(testClient.id, [endedSession.id], 150, 'cash');

    // Wait for async saves
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check payment in database
    const { data: dbPayment } = await supabase
      .from('trackpay_payments')
      .select('*')
      .eq('id', payment.id)
      .single();

    if (dbPayment) {
      console.log('✅ Payment in database:', {
        id: dbPayment.id,
        client_id: dbPayment.client_id,
        amount: dbPayment.amount,
        method: dbPayment.method,
        session_ids: dbPayment.session_ids
      });
    }

    // Check payment completed activity
    const { data: paymentCompletedActivity } = await supabase
      .from('trackpay_activities')
      .select('*')
      .eq('type', 'payment_completed')
      .eq('client_id', testClient.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (paymentCompletedActivity && paymentCompletedActivity.length > 0) {
      const activity = paymentCompletedActivity[0];
      console.log('✅ Payment completed activity:', {
        provider_id: activity.provider_id,
        client_id: activity.client_id,
        data: activity.data
      });
    }

    // Test 4: Custom Activity
    console.log('\n📝 Test 4: Custom Activity...');

    await hybridStorage.addActivity({
      type: 'test_complete',
      clientId: testClient.id,
      data: {
        test: 'provider_id_fix',
        timestamp: new Date().toISOString(),
        success: true
      }
    });

    // Wait for async save
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check custom activity
    const { data: customActivity } = await supabase
      .from('trackpay_activities')
      .select('*')
      .eq('type', 'test_complete')
      .eq('client_id', testClient.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (customActivity && customActivity.length > 0) {
      const activity = customActivity[0];
      console.log('✅ Custom activity:', {
        provider_id: activity.provider_id,
        client_id: activity.client_id,
        data: activity.data
      });
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('Stack trace:', error.stack);
  }
}

// Summary check function
async function checkProviderIdFixes() {
  console.log('\n📊 PROVIDER ID FIX SUMMARY:');

  try {
    // Check recent activities for provider_id
    const { data: recentActivities } = await supabase
      .from('trackpay_activities')
      .select('id, type, provider_id, client_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentActivities) {
      const withProviderIds = recentActivities.filter(a => a.provider_id !== null).length;
      const withoutProviderIds = recentActivities.filter(a => a.provider_id === null).length;

      console.log(`📈 Recent activities: ${recentActivities.length} total`);
      console.log(`✅ With provider_id: ${withProviderIds}`);
      console.log(`❌ Without provider_id: ${withoutProviderIds}`);

      if (withProviderIds > 0) {
        console.log('🎯 Recent activities with provider_id:');
        recentActivities
          .filter(a => a.provider_id !== null)
          .slice(0, 3)
          .forEach(a => {
            console.log(`  - ${a.type} (${a.provider_id}) at ${a.created_at}`);
          });
      }
    }

    // Check recent sessions for provider_id
    const { data: recentSessions } = await supabase
      .from('trackpay_sessions')
      .select('id, provider_id, client_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentSessions) {
      console.log(`📊 Recent sessions: ${recentSessions.length} total`);
      recentSessions.forEach(s => {
        console.log(`  - ${s.id} (provider: ${s.provider_id || 'NULL'}) at ${s.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Summary check failed:', error);
  }
}

// Run complete test
async function runProviderIdFixTests() {
  console.log('🚀 Running provider ID fix verification...');

  await testFixedProviderIds();
  await checkProviderIdFixes();

  console.log('\n📋 VERIFICATION CHECKLIST:');
  console.log('✅ Sessions should save with valid provider_id (not null)');
  console.log('✅ Activities should save with valid provider_id (not null)');
  console.log('✅ Payments should save correctly');
  console.log('✅ Session IDs should be extracted in activities');
  console.log('⚠️ If any provider_id is null, check authentication state');
}

// Auto-run
runProviderIdFixTests();

// Make available
window.testFixedProviderIds = testFixedProviderIds;
window.checkProviderIdFixes = checkProviderIdFixes;
window.runProviderIdFixTests = runProviderIdFixTests;

console.log('\n🛠️ Available functions:');
console.log('  - testFixedProviderIds(): Test all operations with provider ID');
console.log('  - checkProviderIdFixes(): Check recent activities for provider_id');
console.log('  - runProviderIdFixTests(): Complete verification suite');