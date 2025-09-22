// Database Verification Test for Direct Supabase Saves
// Copy and paste this in browser console at http://localhost:8087

console.log('🔍 TrackPay: Database Verification Test');

async function verifySupabaseData() {
  try {
    console.log('\n=== VERIFYING DATA IN SUPABASE TABLES ===\n');

    // Check if we have access to supabase client
    let supabase;
    try {
      // Try to access supabase through common patterns
      if (window.supabase) {
        supabase = window.supabase;
      } else {
        console.log('⚠️ Supabase client not globally available - creating test client');

        // Create a simple test client for verification
        const supabaseUrl = 'https://qpoqeqasefatyrjeronp.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3FlcWFzZWZhdHlyamVyb25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI2OTg3NjIsImV4cCI6MjA0ODI3NDc2Mn0.JU9w0E0XJQe5Qh50XJZ5OnOkFKNDnLmUbwU7h6QjPXA';

        // Basic fetch-based testing
        const testFetch = async (table) => {
          const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=5`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            }
          });
          return response.json();
        };

        // Test 1: Check Sessions Table
        console.log('📊 Checking trackpay_sessions table...');
        try {
          const sessions = await testFetch('trackpay_sessions');
          console.log(`✅ Found ${Array.isArray(sessions) ? sessions.length : 'N/A'} sessions in database`);

          if (Array.isArray(sessions) && sessions.length > 0) {
            const recentSession = sessions[0];
            console.log('🔍 Recent session sample:');
            console.log('  - ID:', recentSession.id);
            console.log('  - Status:', recentSession.status);
            console.log('  - Created:', recentSession.created_at);

            // Check if ID is a proper UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recentSession.id);
            console.log('  - ID Format:', isUUID ? '✅ Valid UUID' : '❌ Invalid format');
          }
        } catch (error) {
          console.error('❌ Error checking sessions table:', error);
        }

        // Test 2: Check Payments Table
        console.log('\n💰 Checking trackpay_payments table...');
        try {
          const payments = await testFetch('trackpay_payments');
          console.log(`✅ Found ${Array.isArray(payments) ? payments.length : 'N/A'} payments in database`);

          if (Array.isArray(payments) && payments.length > 0) {
            const recentPayment = payments[0];
            console.log('🔍 Recent payment sample:');
            console.log('  - ID:', recentPayment.id);
            console.log('  - Amount:', recentPayment.amount);
            console.log('  - Method:', recentPayment.method);

            // Check if ID is a proper UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recentPayment.id);
            console.log('  - ID Format:', isUUID ? '✅ Valid UUID' : '❌ Invalid format');
          }
        } catch (error) {
          console.error('❌ Error checking payments table:', error);
        }

        // Test 3: Check Users Table
        console.log('\n👥 Checking trackpay_users table...');
        try {
          const users = await testFetch('trackpay_users');
          console.log(`✅ Found ${Array.isArray(users) ? users.length : 'N/A'} users in database`);

          if (Array.isArray(users) && users.length > 0) {
            const recentUser = users[0];
            console.log('🔍 Recent user sample:');
            console.log('  - ID:', recentUser.id);
            console.log('  - Name:', recentUser.name);
            console.log('  - Role:', recentUser.role);

            // Check if ID is a proper UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recentUser.id);
            console.log('  - ID Format:', isUUID ? '✅ Valid UUID' : '❌ Invalid format');
          }
        } catch (error) {
          console.error('❌ Error checking users table:', error);
        }

        // Test 4: Check Activities Table
        console.log('\n📝 Checking trackpay_activities table...');
        try {
          const activities = await testFetch('trackpay_activities');
          console.log(`✅ Found ${Array.isArray(activities) ? activities.length : 'N/A'} activities in database`);

          if (Array.isArray(activities) && activities.length > 0) {
            const recentActivity = activities[0];
            console.log('🔍 Recent activity sample:');
            console.log('  - ID:', recentActivity.id);
            console.log('  - Type:', recentActivity.type);
            console.log('  - Timestamp:', recentActivity.timestamp);

            // Check if ID is a proper UUID
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recentActivity.id);
            console.log('  - ID Format:', isUUID ? '✅ Valid UUID' : '❌ Invalid format');
          }
        } catch (error) {
          console.error('❌ Error checking activities table:', error);
        }

        return true;
      }
    } catch (error) {
      console.error('❌ Database verification failed:', error);
      return false;
    }

  } catch (error) {
    console.error('❌ Verification script failed:', error);
  }
}

// Test data integrity
async function testDataIntegrity() {
  console.log('\n🔍 Testing Data Integrity...');

  // Create test data and verify it appears in database
  if (typeof hybridStorage !== 'undefined') {
    try {
      const testId = `integrity_test_${Date.now()}`;
      console.log(`🧪 Creating test data with ID pattern: ${testId}`);

      // Create a session
      const session = await hybridStorage.startSession(testId);
      console.log('✅ Test session created:', session.id);

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // End the session
      const endedSession = await hybridStorage.endSession(session.id);
      console.log('✅ Test session ended:', endedSession.id);

      // Wait another moment for database save
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Now check if it appears in database
      console.log('🔍 Checking if test data appears in database...');
      await verifySupabaseData();

    } catch (error) {
      console.error('❌ Data integrity test failed:', error);
    }
  } else {
    console.log('⚠️ hybridStorage not available for integrity test');
  }
}

// Compare before/after database state
async function runDataFlowTest() {
  console.log('\n🔄 Running Data Flow Test...');

  console.log('📊 Step 1: Checking initial database state...');
  await verifySupabaseData();

  console.log('\n📊 Step 2: Creating test data...');
  await testDataIntegrity();

  console.log('\n📊 Step 3: Final verification...');
  await verifySupabaseData();

  console.log('\n✅ Data flow test completed!');
}

// Auto-run verification
verifySupabaseData();

// Make functions available
window.verifySupabaseData = verifySupabaseData;
window.testDataIntegrity = testDataIntegrity;
window.runDataFlowTest = runDataFlowTest;

console.log('\n🛠️  Available verification functions:');
console.log('  - verifySupabaseData(): Check current database state');
console.log('  - testDataIntegrity(): Create test data and verify');
console.log('  - runDataFlowTest(): Complete before/after test');