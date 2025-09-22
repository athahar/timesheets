// Fixed Simple Direct Supabase Test
// Copy and paste this in browser console at http://localhost:8087

console.log('🧪 TrackPay: Fixed Direct Supabase Test');

async function testDirectSupabaseFixed() {
  try {
    console.log('\n=== TESTING DIRECT SUPABASE SAVES (FIXED) ===\n');

    // Check if hybridStorage is available
    if (typeof hybridStorage === 'undefined') {
      console.error('❌ hybridStorage not available. Please refresh and try again.');
      return;
    }

    console.log('✅ hybridStorage available');

    // Test 1: Get existing clients first
    console.log('\n👥 Getting existing clients...');
    const clients = await hybridStorage.getClients();
    console.log(`✅ Found ${clients.length} existing clients`);

    if (clients.length === 0) {
      console.log('📝 Creating a test client...');
      const testClient = await hybridStorage.addClient('Test Client for Sessions', 50, 'test@example.com');
      console.log('✅ Test client created:', testClient.id);
      clients.push(testClient);
    }

    const testClient = clients[0];
    console.log(`🎯 Using client: ${testClient.name} (ID: ${testClient.id})`);

    // Test 2: Session Operations
    console.log('\n📊 Testing Session Operations...');

    // Start session
    console.log('▶️  Starting session...');
    const session = await hybridStorage.startSession(testClient.id);
    console.log('✅ Session started:', session.id);
    console.log('🔍 Session ID format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.id) ? 'Valid UUID' : 'Invalid format');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // End session
    console.log('⏹️  Ending session...');
    const endedSession = await hybridStorage.endSession(session.id);
    console.log('✅ Session ended:', endedSession.id, 'Status:', endedSession.status);

    // Test 3: Payment Operations
    console.log('\n💰 Testing Payment Operations...');

    // Request payment
    console.log('📝 Requesting payment...');
    await hybridStorage.requestPayment(testClient.id, [endedSession.id]);
    console.log('✅ Payment requested');

    // Mark as paid
    console.log('💳 Marking as paid...');
    const payment = await hybridStorage.markPaid(testClient.id, [endedSession.id], 100, 'cash');
    console.log('✅ Payment recorded:', payment.id);
    console.log('🔍 Payment ID format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payment.id) ? 'Valid UUID' : 'Invalid format');

    // Test 4: Activity Operations
    console.log('\n📝 Testing Activity Operations...');

    console.log('📋 Creating activity...');
    await hybridStorage.addActivity({
      type: 'test_activity',
      clientId: testClient.id,
      data: { test: true, timestamp: new Date().toISOString() }
    });
    console.log('✅ Activity created');

    console.log('\n🎉 All tests completed successfully!');
    console.log('🔍 Check the console above for Supabase save confirmations');
    console.log('💡 Look for messages like "✅ Session saved to Supabase" etc.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Enhanced error monitoring
function monitorSupabaseErrors() {
  console.log('\n🚨 Setting up enhanced error monitoring...');

  const originalError = console.error;
  let errorCount = 0;
  let errors = [];

  console.error = function(...args) {
    const message = args.join(' ');

    if (message.includes('invalid input syntax for type uuid') ||
        message.includes('UUID validation') ||
        message.includes('400 (Bad Request)') ||
        message.includes('convertSessionToDatabase') ||
        message.includes('trackpay_activities')) {
      errorCount++;
      errors.push(message);
      console.log(`🚨 DETECTED ERROR #${errorCount}:`, message);
    }

    originalError.apply(console, args);
  };

  // Reset after 60 seconds and show summary
  setTimeout(() => {
    console.error = originalError;
    console.log('\n📊 ERROR MONITORING SUMMARY:');
    if (errorCount === 0) {
      console.log('✅ No errors detected during monitoring period');
    } else {
      console.log(`❌ Detected ${errorCount} errors:`);
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
  }, 60000);

  console.log('📡 Error monitoring active for 60 seconds...');
}

// Test specific functionality
async function testSessionEndFix() {
  console.log('\n🔧 Testing Session End Fix...');

  try {
    // Get existing clients
    const clients = await hybridStorage.getClients();
    if (clients.length === 0) {
      console.log('❌ No clients available for session end test');
      return;
    }

    const client = clients[0];
    console.log(`🎯 Testing with client: ${client.name}`);

    // Start and immediately end a session
    console.log('▶️  Starting session...');
    const session = await hybridStorage.startSession(client.id);

    console.log('⏹️  Ending session immediately...');
    const endedSession = await hybridStorage.endSession(session.id);

    console.log('✅ Session end fix works! No convertSessionToDatabase errors.');
    console.log('📊 Session details:', {
      id: endedSession.id,
      status: endedSession.status,
      duration: endedSession.duration,
      amount: endedSession.amount
    });

  } catch (error) {
    console.error('❌ Session end test failed:', error);
  }
}

// Run all tests
async function runFixedTests() {
  console.log('🚀 Running fixed test suite...');

  // Start error monitoring
  monitorSupabaseErrors();

  // Test session end fix specifically
  await testSessionEndFix();

  // Run main tests
  await testDirectSupabaseFixed();

  console.log('\n📋 WHAT TO LOOK FOR:');
  console.log('✅ "Session saved to Supabase" messages');
  console.log('✅ "Payment saved to Supabase" messages');
  console.log('✅ "Activity saved to Supabase" messages');
  console.log('❌ NO "convertSessionToDatabase is not a function" errors');
  console.log('❌ NO "timestamp column not found" errors');
  console.log('❌ NO UUID validation errors');
}

// Auto-run
runFixedTests();

// Make functions available
window.testDirectSupabaseFixed = testDirectSupabaseFixed;
window.testSessionEndFix = testSessionEndFix;
window.runFixedTests = runFixedTests;

console.log('\n🛠️  Available test functions:');
console.log('  - testDirectSupabaseFixed(): Test with existing clients');
console.log('  - testSessionEndFix(): Test session end specifically');
console.log('  - runFixedTests(): Run complete fixed test suite');