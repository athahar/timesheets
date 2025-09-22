// Comprehensive Test Suite for Direct Supabase Operations
// Copy and paste this in browser console at http://localhost:8087

console.log('🧪 TrackPay: Direct Supabase Operations Test Suite');

// Test utilities
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const generateTestId = () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, success, details = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${details ? ' - ' + details : ''}`);

  testResults.tests.push({ name, success, details });
  if (success) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

async function runDirectSupabaseTests() {
  try {
    console.log('\n=== DIRECT SUPABASE OPERATIONS TEST SUITE ===\n');

    // Test 1: Clear any existing sync queue issues
    console.log('🧹 Step 1: Clearing sync queue...');
    try {
      if (typeof clearSyncQueue !== 'undefined') {
        await clearSyncQueue();
        logTest('Sync Queue Cleanup', true);
      } else {
        logTest('Sync Queue Cleanup', false, 'clearSyncQueue not available');
      }
    } catch (error) {
      logTest('Sync Queue Cleanup', false, error.message);
    }

    await delay(1000);

    // Test 2: Session Operations
    console.log('\n📊 Step 2: Testing Session Operations...');

    // Get HybridStorage instance (assuming it's available globally or through a service)
    let hybridStorage;
    try {
      // Try to access hybridStorage through common patterns
      if (window.hybridStorage) {
        hybridStorage = window.hybridStorage;
      } else if (window.storageService) {
        hybridStorage = window.storageService;
      } else {
        // Import from modules if available
        console.log('Attempting to access storage service...');
        logTest('Storage Service Access', false, 'HybridStorage not accessible - manual testing required');
      }
    } catch (error) {
      logTest('Storage Service Access', false, error.message);
    }

    if (hybridStorage) {
      // Test Session Creation
      try {
        const testClientId = generateTestId();
        const session = await hybridStorage.startSession(testClientId);

        // Verify session has proper UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const hasValidUUID = uuidRegex.test(session.id);

        logTest('Session Creation with UUID', hasValidUUID, `Session ID: ${session.id}`);

        // Test Session End
        await delay(1000);
        const endedSession = await hybridStorage.endSession(session.id);
        logTest('Session End', !!endedSession && endedSession.status === 'unpaid');

      } catch (error) {
        logTest('Session Operations', false, error.message);
      }
    }

    // Test 3: Payment Operations
    console.log('\n💰 Step 3: Testing Payment Operations...');

    if (hybridStorage) {
      try {
        const testClientId = generateTestId();

        // Create a session first
        const session = await hybridStorage.startSession(testClientId);
        await delay(500);
        const completedSession = await hybridStorage.endSession(session.id);

        // Test Payment Request
        await hybridStorage.requestPayment(testClientId, [completedSession.id]);
        logTest('Payment Request', true);

        // Test Mark Paid
        const payment = await hybridStorage.markPaid(testClientId, [completedSession.id], 100, 'cash');
        const paymentUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const hasValidPaymentUUID = paymentUuidRegex.test(payment.id);

        logTest('Payment Creation with UUID', hasValidPaymentUUID, `Payment ID: ${payment.id}`);

      } catch (error) {
        logTest('Payment Operations', false, error.message);
      }
    }

    // Test 4: Client Operations
    console.log('\n👥 Step 4: Testing Client Operations...');

    if (hybridStorage) {
      try {
        const testClientName = `Test Client ${Date.now()}`;
        const testEmail = `test${Date.now()}@example.com`;

        // Test Client Creation
        const client = await hybridStorage.addClient(testClientName, 50, testEmail);
        const clientUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const hasValidClientUUID = clientUuidRegex.test(client.id);

        logTest('Client Creation with UUID', hasValidClientUUID, `Client ID: ${client.id}`);

        // Test Client Update
        await hybridStorage.updateClient(client.id, `${testClientName} Updated`, 75, testEmail);
        logTest('Client Update', true);

      } catch (error) {
        logTest('Client Operations', false, error.message);
      }
    }

    // Test 5: Activity Operations
    console.log('\n📝 Step 5: Testing Activity Operations...');

    if (hybridStorage) {
      try {
        const testClientId = generateTestId();

        // Test Activity Creation
        await hybridStorage.addActivity({
          type: 'test_activity',
          clientId: testClientId,
          data: { test: true, timestamp: new Date().toISOString() }
        });

        logTest('Activity Creation', true);

      } catch (error) {
        logTest('Activity Operations', false, error.message);
      }
    }

    // Test 6: Database Connection Test
    console.log('\n🔌 Step 6: Testing Database Connection...');

    try {
      // Test basic connectivity to Supabase
      if (typeof fetch !== 'undefined') {
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://qpoqeqasefatyrjeronp.supabase.co';
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
          }
        });

        logTest('Supabase Connection', response.ok, `Status: ${response.status}`);
      }
    } catch (error) {
      logTest('Supabase Connection', false, error.message);
    }

    // Test 7: Console Error Check
    console.log('\n🚨 Step 7: Checking for Console Errors...');

    // Monitor console for UUID validation errors
    const originalError = console.error;
    let hasUuidErrors = false;

    console.error = function(...args) {
      const message = args.join(' ');
      if (message.includes('invalid input syntax for type uuid') ||
          message.includes('UUID validation')) {
        hasUuidErrors = true;
      }
      originalError.apply(console, args);
    };

    // Wait a bit to see if any errors occur
    await delay(2000);

    console.error = originalError;
    logTest('No UUID Validation Errors', !hasUuidErrors);

    // Summary
    console.log('\n=== TEST RESULTS SUMMARY ===');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.tests.length}`);

    if (testResults.failed === 0) {
      console.log('🎉 All tests passed! Direct Supabase operations are working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the details above.');
    }

    console.log('\n📋 Detailed Results:');
    testResults.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      console.log(`${status} ${test.name}${test.details ? ' - ' + test.details : ''}`);
    });

    return testResults;

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return { error: error.message, testResults };
  }
}

// Manual Test Instructions
console.log('\n📖 MANUAL TESTING INSTRUCTIONS:');
console.log('If automated tests cannot access storage service, perform these manual tests:');
console.log('');
console.log('1. 🔍 Login as Lucy Provider');
console.log('2. ▶️  Start a session for a client');
console.log('3. ⏹️  Stop the session after a few seconds');
console.log('4. 🏷️  Check console for "✅ Session saved to Supabase" message');
console.log('5. 💰 Request payment for the session');
console.log('6. ✅ Mark the session as paid');
console.log('7. 👤 Login as the client');
console.log('8. 📊 Check that Lucy appears in service provider list with correct data');
console.log('9. 🚨 Verify no UUID validation errors in console');
console.log('');

// Auto-run the test suite
runDirectSupabaseTests();

// Make functions available globally
window.runDirectSupabaseTests = runDirectSupabaseTests;
window.testResults = testResults;

console.log('🛠️  Available functions:');
console.log('  - runDirectSupabaseTests(): Run the complete test suite');
console.log('  - testResults: View current test results');