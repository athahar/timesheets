// Create an inline test that we can execute via developer tools

// This creates a bookmarklet-style test that can be copy-pasted into console
const inlineTest = `
(async function testProviderIdFix() {
  console.log('🔧 Testing Provider ID Fix...');

  const results = {
    servicesAvailable: false,
    sessionCreated: false,
    sessionHasProviderId: false,
    activityHasProviderId: false,
    providerIdValid: false
  };

  try {
    // Check services
    if (typeof hybridStorage !== 'undefined' && typeof supabase !== 'undefined') {
      results.servicesAvailable = true;
      console.log('✅ Services available');
    } else {
      console.error('❌ Services not available');
      return results;
    }

    // Get or create test client
    let clients = await hybridStorage.getClients();
    if (clients.length === 0) {
      console.log('Creating test client...');
      await hybridStorage.addClient('Test Client', 50);
      clients = await hybridStorage.getClients();
    }

    const testClient = clients[0];
    console.log('Using client:', testClient.name);

    // Create session
    console.log('Creating session...');
    const session = await hybridStorage.startSession(testClient.id);
    results.sessionCreated = true;
    console.log('✅ Session created:', session.id);

    // Wait for database save
    await new Promise(r => setTimeout(r, 3000));

    // Check session in database
    const { data: dbSession } = await supabase
      .from('trackpay_sessions')
      .select('id, provider_id')
      .eq('id', session.id)
      .single();

    if (dbSession && dbSession.provider_id) {
      results.sessionHasProviderId = true;
      console.log('✅ Session has provider_id:', dbSession.provider_id);

      // Validate UUID format
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbSession.provider_id);
      if (isUUID) {
        results.providerIdValid = true;
        console.log('✅ Provider ID is valid UUID');
      }
    } else {
      console.error('❌ Session has no provider_id');
    }

    // Check activity
    const { data: activities } = await supabase
      .from('trackpay_activities')
      .select('provider_id, type')
      .eq('type', 'session_start')
      .order('created_at', { ascending: false })
      .limit(1);

    if (activities && activities.length > 0 && activities[0].provider_id) {
      results.activityHasProviderId = true;
      console.log('✅ Activity has provider_id:', activities[0].provider_id);
    } else {
      console.error('❌ Activity has no provider_id');
    }

    // Summary
    const passed = Object.values(results).every(Boolean);
    console.log('\\n📊 Test Results:', results);
    console.log(passed ? '🎉 ALL TESTS PASSED!' : '❌ Some tests failed');

    return results;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return results;
  }
})();
`;

console.log('='.repeat(60));
console.log('COPY THE FOLLOWING LINE INTO BROWSER CONSOLE:');
console.log('='.repeat(60));
console.log(inlineTest.trim());
console.log('='.repeat(60));