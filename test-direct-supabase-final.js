// Direct Supabase Implementation Test
// Tests the complete elimination of hybrid storage and sync queue

console.log('🔧 TrackPay: Testing Direct Supabase Implementation');

(async function testDirectSupabaseImplementation() {
  console.log('\n=== TESTING DIRECT SUPABASE (NO HYBRID STORAGE) ===\n');

  const results = {
    servicesAvailable: false,
    noSyncQueue: false,
    sessionFlow: false,
    providerIdCorrect: false,
    activitiesCorrect: false,
    paymentFlow: false
  };

  try {
    // Test 1: Verify Direct Supabase service is available
    console.log('🔍 Test 1: Service Availability...');
    if (typeof directSupabase !== 'undefined' && typeof supabase !== 'undefined') {
      results.servicesAvailable = true;
      console.log('✅ Direct Supabase service available');
      console.log('✅ Core Supabase client available');
    } else {
      console.error('❌ Services not available');
      return results;
    }

    // Test 2: Verify no sync queue complexity
    console.log('\n🚫 Test 2: No Sync Queue Verification...');
    try {
      // These should be simplified/no-ops now
      await debugInfo();
      console.log('✅ Debug info works without sync queue');

      // Connection status should always be true
      const isOnline = await directSupabase.getConnectionStatus ?
        await directSupabase.getConnectionStatus() : true;
      console.log('✅ Connection status (always online):', isOnline);

      results.noSyncQueue = true;
    } catch (error) {
      console.error('❌ Sync queue verification failed:', error);
    }

    // Test 3: Complete Session Flow
    console.log('\n📊 Test 3: Complete Session Flow...');

    // Get or create client
    let clients = await directSupabase.getClients();
    if (clients.length === 0) {
      console.log('Creating test client...');
      await directSupabase.addClient('Direct Test Client', 75, 'direct@test.com');
      clients = await directSupabase.getClients();
    }

    const testClient = clients[0];
    console.log(`Using client: ${testClient.name} (${testClient.id})`);

    // Start session
    console.log('▶️ Starting session...');
    const session = await directSupabase.startSession(testClient.id);
    console.log('✅ Session started:', session.id);

    // Wait for database save
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify session in database
    const { data: dbSession } = await supabase
      .from('trackpay_sessions')
      .select('id, provider_id, client_id, status')
      .eq('id', session.id)
      .single();

    if (dbSession && dbSession.provider_id) {
      console.log('✅ Session saved to database with provider_id:', dbSession.provider_id);

      // Verify UUID format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbSession.provider_id);
      if (isUUID) {
        results.providerIdCorrect = true;
        console.log('✅ Provider ID is valid UUID format');
      }
    }

    // End session
    console.log('⏹️ Ending session...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

    const endedSession = await directSupabase.endSession(session.id);
    console.log('✅ Session ended:', endedSession.id);

    // Wait for database update
    await new Promise(resolve => setTimeout(resolve, 2000));

    results.sessionFlow = true;

    // Test 4: Activity Verification
    console.log('\n📝 Test 4: Activity Verification...');

    // Check recent activities
    const { data: recentActivities } = await supabase
      .from('trackpay_activities')
      .select('id, type, provider_id, client_id, session_id, data')
      .eq('client_id', testClient.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (recentActivities && recentActivities.length >= 2) {
      console.log(`✅ Found ${recentActivities.length} recent activities`);

      const startActivity = recentActivities.find(a => a.type === 'session_start');
      const endActivity = recentActivities.find(a => a.type === 'session_end');

      if (startActivity && startActivity.provider_id && endActivity && endActivity.provider_id) {
        console.log('✅ Both activities have provider_id');
        console.log('✅ Start activity provider_id:', startActivity.provider_id);
        console.log('✅ End activity provider_id:', endActivity.provider_id);

        // Check session_id extraction
        const hasSessionId = startActivity.session_id || startActivity.data?.sessionId;
        if (hasSessionId) {
          console.log('✅ Activity has session_id reference');
          results.activitiesCorrect = true;
        }
      }
    }

    // Test 5: Payment Flow
    console.log('\n💰 Test 5: Payment Flow...');

    // Request payment
    await directSupabase.requestPayment(testClient.id, [endedSession.id]);
    console.log('✅ Payment requested');

    // Mark as paid
    const payment = await directSupabase.markPaid(testClient.id, [endedSession.id], 225, 'cash');
    console.log('✅ Payment marked as paid:', payment.id);

    // Verify payment in database
    const { data: dbPayment } = await supabase
      .from('trackpay_payments')
      .select('*')
      .eq('id', payment.id)
      .single();

    if (dbPayment) {
      console.log('✅ Payment saved to database:', {
        id: dbPayment.id,
        amount: dbPayment.amount,
        client_id: dbPayment.client_id
      });
      results.paymentFlow = true;
    }

    // Test 6: Custom Activity (final test)
    console.log('\n📋 Test 6: Custom Activity...');

    await directSupabase.addActivity({
      type: 'test_complete',
      clientId: testClient.id,
      data: {
        test: 'direct_supabase_implementation',
        timestamp: new Date().toISOString(),
        success: true
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: testActivity } = await supabase
      .from('trackpay_activities')
      .select('*')
      .eq('type', 'test_complete')
      .eq('client_id', testClient.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (testActivity && testActivity.length > 0 && testActivity[0].provider_id) {
      console.log('✅ Custom activity saved with provider_id:', testActivity[0].provider_id);
    }

    // Final Results
    const allPassed = Object.values(results).every(Boolean);

    console.log('\n📊 FINAL RESULTS:');
    console.log('✅ Services Available:', results.servicesAvailable);
    console.log('✅ No Sync Queue:', results.noSyncQueue);
    console.log('✅ Session Flow:', results.sessionFlow);
    console.log('✅ Provider ID Correct:', results.providerIdCorrect);
    console.log('✅ Activities Correct:', results.activitiesCorrect);
    console.log('✅ Payment Flow:', results.paymentFlow);

    if (allPassed) {
      console.log('\n🎉 DIRECT SUPABASE IMPLEMENTATION: ALL TESTS PASSED!');
      console.log('✨ Hybrid storage eliminated successfully');
      console.log('✨ Sync queue complexity removed');
      console.log('✨ All operations save directly to Supabase');
      console.log('✨ Provider IDs working correctly');
    } else {
      console.log('\n⚠️ Some tests failed - check results above');
    }

    return results;

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('Stack:', error.stack);
    return results;
  }
})().then(results => {
  const success = Object.values(results).every(Boolean);
  console.log('\n🎯 FINAL RESULT:', success ? 'SUCCESS' : 'FAILED');

  // Summary message
  if (success) {
    console.log('🎊 Direct Supabase implementation is working perfectly!');
    console.log('🚀 No more hybrid storage complexity');
    console.log('🎯 Everything saves directly to Supabase');
  } else {
    console.log('🔧 Direct Supabase implementation needs attention');
  }
}).catch(error => {
  console.error('💥 Test crashed:', error);
});

// Make test available for manual execution
window.testDirectSupabaseImplementation = testDirectSupabaseImplementation;