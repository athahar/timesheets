// Simple Validation Test - Auto-executable
// This test validates the provider ID fixes

(async function validateProviderIdFix() {
  console.log('🔧 Auto-validating Provider ID fixes...');

  try {
    // Check if services are available
    if (typeof hybridStorage === 'undefined') {
      console.error('❌ hybridStorage not available');
      return false;
    }

    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase not available');
      return false;
    }

    console.log('✅ Services available');

    // Test 1: Check current provider ID resolution
    console.log('\n🔑 Testing provider ID resolution...');

    let providerId;
    try {
      // Since we can't directly call getCurrentProviderId (it's private),
      // we'll test it through a session creation
      const clients = await hybridStorage.getClients();
      if (clients.length === 0) {
        console.log('⚠️ No clients available, creating test client...');
        await hybridStorage.addClient('Test Client for Provider ID', 50, 'test@example.com');
        const newClients = await hybridStorage.getClients();
        if (newClients.length === 0) {
          console.error('❌ Failed to create test client');
          return false;
        }
      }

      const testClientResult = await hybridStorage.getClients();
      const testClient = testClientResult[0];
      console.log(`🎯 Using client: ${testClient.name} (${testClient.id})`);

      // Test session creation which should use the provider ID
      console.log('▶️ Creating test session...');
      const session = await hybridStorage.startSession(testClient.id);
      console.log('✅ Session created:', session.id);

      // Wait for async database saves
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if session was saved to database with provider_id
      const { data: dbSession, error: sessionError } = await supabase
        .from('trackpay_sessions')
        .select('id, provider_id, client_id')
        .eq('id', session.id)
        .single();

      if (sessionError) {
        console.error('❌ Session not found in database:', sessionError);
        return false;
      }

      console.log('✅ Session found in database:', {
        id: dbSession.id,
        provider_id: dbSession.provider_id,
        client_id: dbSession.client_id
      });

      // Validate provider_id
      if (!dbSession.provider_id) {
        console.error('❌ Session saved with null provider_id');
        return false;
      }

      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbSession.provider_id);
      if (!isValidUUID) {
        console.error('❌ Provider ID is not a valid UUID:', dbSession.provider_id);
        return false;
      }

      console.log('✅ Session has valid provider_id UUID:', dbSession.provider_id);
      providerId = dbSession.provider_id;

      // Test 2: Check activity creation
      console.log('\n📝 Testing activity creation...');

      // Check session_start activity
      const { data: activities, error: activityError } = await supabase
        .from('trackpay_activities')
        .select('id, type, provider_id, client_id, session_id, data')
        .eq('type', 'session_start')
        .eq('client_id', testClient.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (activityError) {
        console.error('❌ Failed to fetch activities:', activityError);
        return false;
      }

      if (!activities || activities.length === 0) {
        console.error('❌ No session_start activity found');
        return false;
      }

      const activity = activities[0];
      console.log('✅ Session start activity found:', {
        id: activity.id,
        provider_id: activity.provider_id,
        session_id: activity.session_id,
        data: activity.data
      });

      // Validate activity provider_id
      if (!activity.provider_id) {
        console.error('❌ Activity saved with null provider_id');
        return false;
      }

      if (activity.provider_id !== providerId) {
        console.error('❌ Activity provider_id does not match session provider_id');
        return false;
      }

      console.log('✅ Activity has correct provider_id');

      // Validate session_id extraction
      const sessionIdFromActivity = activity.session_id || activity.data?.sessionId;
      if (sessionIdFromActivity !== session.id) {
        console.error('❌ Activity session_id does not match session ID');
        return false;
      }

      console.log('✅ Activity has correct session_id reference');

      // Test 3: End session and check activity
      console.log('\n⏹️ Testing session end...');

      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      const endedSession = await hybridStorage.endSession(session.id);
      console.log('✅ Session ended:', endedSession.id);

      // Wait for async saves
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check session_end activity
      const { data: endActivities } = await supabase
        .from('trackpay_activities')
        .select('id, type, provider_id, client_id, session_id, data')
        .eq('type', 'session_end')
        .eq('client_id', testClient.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!endActivities || endActivities.length === 0) {
        console.error('❌ No session_end activity found');
        return false;
      }

      const endActivity = endActivities[0];
      console.log('✅ Session end activity found:', {
        provider_id: endActivity.provider_id,
        session_id: endActivity.session_id
      });

      if (!endActivity.provider_id) {
        console.error('❌ Session end activity has null provider_id');
        return false;
      }

      console.log('✅ Session end activity has valid provider_id');

      console.log('\n🎉 ALL VALIDATIONS PASSED!');
      console.log('\n📊 Summary:');
      console.log(`✅ Provider ID: ${providerId}`);
      console.log('✅ Sessions save with correct provider_id');
      console.log('✅ Activities save with correct provider_id');
      console.log('✅ Session IDs are properly extracted in activities');

      return true;

    } catch (error) {
      console.error('❌ Validation failed:', error);
      return false;
    }

  } catch (error) {
    console.error('❌ Critical validation error:', error);
    return false;
  }
})().then(success => {
  if (success) {
    console.log('\n🎯 RESULT: Provider ID fix validation PASSED');
  } else {
    console.log('\n❌ RESULT: Provider ID fix validation FAILED');
  }
}).catch(error => {
  console.error('\n💥 RESULT: Validation crashed:', error);
});