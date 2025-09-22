// Simple Direct Supabase Test
// Copy and paste this in browser console at http://localhost:8087

console.log('🧪 TrackPay: Simple Direct Supabase Test');

async function testDirectSupabase() {
  try {
    console.log('\n=== TESTING DIRECT SUPABASE SAVES ===\n');

    // Check if hybridStorage is available
    if (typeof hybridStorage === 'undefined') {
      console.error('❌ hybridStorage not available. Please refresh and try again.');
      return;
    }

    console.log('✅ hybridStorage available');

    // Test 1: Session Operations
    console.log('\n📊 Testing Session Operations...');

    const testClientId = `test_client_${Date.now()}`;
    console.log(`🔧 Using test client ID: ${testClientId}`);

    // Start session
    console.log('▶️  Starting session...');
    const session = await hybridStorage.startSession(testClientId);
    console.log('✅ Session started:', session.id);
    console.log('🔍 Session ID format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.id) ? 'Valid UUID' : 'Invalid format');

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // End session
    console.log('⏹️  Ending session...');
    const endedSession = await hybridStorage.endSession(session.id);
    console.log('✅ Session ended:', endedSession.id, 'Status:', endedSession.status);

    // Test 2: Payment Operations
    console.log('\n💰 Testing Payment Operations...');

    // Request payment
    console.log('📝 Requesting payment...');
    await hybridStorage.requestPayment(testClientId, [endedSession.id]);
    console.log('✅ Payment requested');

    // Mark as paid
    console.log('💳 Marking as paid...');
    const payment = await hybridStorage.markPaid(testClientId, [endedSession.id], 100, 'cash');
    console.log('✅ Payment recorded:', payment.id);
    console.log('🔍 Payment ID format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payment.id) ? 'Valid UUID' : 'Invalid format');

    // Test 3: Client Operations
    console.log('\n👥 Testing Client Operations...');

    const testClientName = `Test Client ${Date.now()}`;
    const testEmail = `test${Date.now()}@example.com`;

    console.log('👤 Creating client...');
    const client = await hybridStorage.addClient(testClientName, 75, testEmail);
    console.log('✅ Client created:', client.id, client.name);
    console.log('🔍 Client ID format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(client.id) ? 'Valid UUID' : 'Invalid format');

    // Test 4: Activity Operations
    console.log('\n📝 Testing Activity Operations...');

    console.log('📋 Creating activity...');
    await hybridStorage.addActivity({
      type: 'test_activity',
      clientId: testClientId,
      data: { test: true, timestamp: new Date().toISOString() }
    });
    console.log('✅ Activity created');

    console.log('\n🎉 All tests completed successfully!');
    console.log('🔍 Check the console above for any Supabase save confirmations');
    console.log('💡 Look for messages like "✅ Session saved to Supabase" etc.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Simple UUID validation test
function testUUIDGeneration() {
  console.log('\n🔧 Testing UUID Generation...');

  // Test if we can generate valid UUIDs
  try {
    // Try to call generateUUID if available
    if (typeof generateUUID !== 'undefined') {
      const uuid = generateUUID();
      console.log('✅ Generated UUID:', uuid);
      const isValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
      console.log('🔍 UUID validation:', isValid ? 'Valid' : 'Invalid');
    } else {
      console.log('⚠️ generateUUID function not globally available');
    }
  } catch (error) {
    console.error('❌ UUID generation test failed:', error);
  }
}

// Monitor console for errors
function monitorConsoleErrors() {
  console.log('\n🚨 Setting up error monitoring...');

  const originalError = console.error;
  let errorCount = 0;

  console.error = function(...args) {
    const message = args.join(' ');

    if (message.includes('invalid input syntax for type uuid') ||
        message.includes('UUID validation') ||
        message.includes('400 (Bad Request)')) {
      errorCount++;
      console.log(`🚨 SYNC ERROR DETECTED #${errorCount}:`, message);
    }

    originalError.apply(console, args);
  };

  // Reset after 30 seconds
  setTimeout(() => {
    console.error = originalError;
    if (errorCount === 0) {
      console.log('✅ No sync errors detected during monitoring period');
    } else {
      console.log(`❌ Detected ${errorCount} sync errors`);
    }
  }, 30000);

  console.log('📡 Error monitoring active for 30 seconds...');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running complete test suite...');

  // Start error monitoring
  monitorConsoleErrors();

  // Test UUID generation
  testUUIDGeneration();

  // Test direct Supabase operations
  await testDirectSupabase();

  console.log('\n📋 SUMMARY:');
  console.log('1. Check console for "✅ [Entity] saved to Supabase" messages');
  console.log('2. Verify no "❌ UUID validation" errors appear');
  console.log('3. Check that all IDs are proper UUIDs (not timestamps)');
  console.log('4. Test the app manually: Provider → Start/Stop Session → Client view');
}

// Auto-run
runAllTests();

// Make functions available
window.testDirectSupabase = testDirectSupabase;
window.runAllTests = runAllTests;

console.log('\n🛠️  Available test functions:');
console.log('  - testDirectSupabase(): Test storage operations');
console.log('  - runAllTests(): Run complete test suite');