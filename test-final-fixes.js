// Final Test - All Fixes Applied
// Copy and paste this in browser console at http://localhost:8087

console.log('🎯 TrackPay: Final Fixes Test');

async function testAllFixes() {
  try {
    console.log('\n=== TESTING ALL FIXES ===\n');

    if (typeof hybridStorage === 'undefined') {
      console.error('❌ hybridStorage not available');
      return;
    }

    console.log('✅ hybridStorage available');

    // Get existing clients
    const clients = await hybridStorage.getClients();
    if (clients.length === 0) {
      console.error('❌ No clients available for testing');
      return;
    }

    const client = clients[0];
    console.log(`🎯 Testing with: ${client.name} (${client.id})`);

    // Test 1: Session Creation (should work now with proper provider_id UUID)
    console.log('\n📊 Test 1: Session Creation...');
    const session = await hybridStorage.startSession(client.id);
    console.log('✅ Session created:', session.id);

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Session End (should work with convertSessionToDatabase fix)
    console.log('\n⏹️  Test 2: Session End...');
    const endedSession = await hybridStorage.endSession(session.id);
    console.log('✅ Session ended:', endedSession.id);

    // Test 3: Payment Request (should work)
    console.log('\n📝 Test 3: Payment Request...');
    await hybridStorage.requestPayment(client.id, [endedSession.id]);
    console.log('✅ Payment requested');

    // Test 4: Mark as Paid (should work now without paid_at column)
    console.log('\n💳 Test 4: Mark as Paid...');
    const payment = await hybridStorage.markPaid(client.id, [endedSession.id], 50, 'cash');
    console.log('✅ Payment marked as paid:', payment.id);

    // Test 5: Activity Creation (should work with fixed schema)
    console.log('\n📝 Test 5: Activity Creation...');
    await hybridStorage.addActivity({
      type: 'test_complete',
      clientId: client.id,
      data: { success: true }
    });
    console.log('✅ Activity created');

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n✅ EXPECTED CONSOLE MESSAGES:');
    console.log('  - "✅ Session saved to Supabase: [UUID]"');
    console.log('  - "✅ Session updated in Supabase: [UUID]"');
    console.log('  - "✅ Payment saved to Supabase: [UUID]"');
    console.log('  - "✅ Activity saved to Supabase: [UUID]"');
    console.log('\n❌ SHOULD NOT SEE:');
    console.log('  - "invalid input syntax for type uuid"');
    console.log('  - "convertSessionToDatabase is not a function"');
    console.log('  - "Could not find the \'paid_at\' column"');
    console.log('  - "Could not find the \'timestamp\' column"');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Monitor for specific success patterns
function monitorSuccessMessages() {
  console.log('\n📡 Monitoring for success messages...');

  const originalLog = console.log;
  let successCount = 0;
  let successMessages = [];

  console.log = function(...args) {
    const message = args.join(' ');

    if (message.includes('✅') && message.includes('saved to Supabase')) {
      successCount++;
      successMessages.push(message);
      console.info(`🎯 SUCCESS #${successCount}: ${message}`);
    }

    originalLog.apply(console, args);
  };

  // Reset after 30 seconds
  setTimeout(() => {
    console.log = originalLog;
    console.log('\n📊 SUCCESS MONITORING SUMMARY:');
    console.log(`✅ Detected ${successCount} successful Supabase saves:`);
    successMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg}`);
    });
  }, 30000);

  console.log('📡 Success monitoring active for 30 seconds...');
}

// Run complete test
async function runCompleteTest() {
  console.log('🚀 Running complete final test...');

  // Start monitoring
  monitorSuccessMessages();

  // Run tests
  await testAllFixes();

  console.log('\n📋 NEXT STEPS:');
  console.log('1. Check console for success messages above');
  console.log('2. Test manually: Login as Lucy → Start/Stop session → Check client view');
  console.log('3. Verify sessions appear in Supabase database');
  console.log('4. Confirm no sync queue errors');
}

// Auto-run
runCompleteTest();

// Make available
window.testAllFixes = testAllFixes;
window.runCompleteTest = runCompleteTest;

console.log('\n🛠️  Available functions:');
console.log('  - testAllFixes(): Test all operations');
console.log('  - runCompleteTest(): Complete test with monitoring');