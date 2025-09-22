// Debug and Clean Sync Queue - Inspect and Fix Invalid Operations
// Copy and paste this in browser console at http://localhost:8087

console.log('🔍 TrackPay: Debug Sync Queue');

async function debugAndCleanSyncQueue() {
  try {
    console.log('\n=== SYNC QUEUE DEBUG & CLEANUP ===');

    // First, check if clearSyncQueue function is available
    if (typeof clearSyncQueue !== 'undefined') {
      console.log('🧹 Running app clearSyncQueue...');
      try {
        await clearSyncQueue();
        console.log('✅ App clearSyncQueue completed');
      } catch (error) {
        console.error('❌ App clearSyncQueue failed:', error);
      }
    }

    // Check localStorage for all trackpay keys
    console.log('📦 Checking localStorage...');
    const allKeys = Object.keys(localStorage);
    const trackpayKeys = allKeys.filter(key =>
      key.includes('trackpay') ||
      key.includes('sync') ||
      key.includes('queue')
    );

    if (trackpayKeys.length > 0) {
      console.log('📋 Found trackpay-related keys:', trackpayKeys);

      for (const key of trackpayKeys) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            console.log(`📄 ${key}:`, value.substring(0, 200) + (value.length > 200 ? '...' : ''));

            // Try to parse and inspect sync queue data
            if (key.includes('sync') && key.includes('queue')) {
              try {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed)) {
                  console.log(`🔍 ${key} contains ${parsed.length} operations`);

                  // Check for invalid operations
                  const invalidOps = parsed.filter(op => {
                    if (op.data && op.data.id) {
                      // Check if ID looks like a timestamp (all digits, ~13 chars)
                      return /^\d{13}$/.test(op.data.id.toString());
                    }
                    return false;
                  });

                  if (invalidOps.length > 0) {
                    console.log(`❌ Found ${invalidOps.length} operations with invalid timestamp IDs:`);
                    invalidOps.forEach(op => {
                      console.log(`  - ${op.type} ${op.entity}: ID ${op.data.id}`);
                    });

                    // Filter out invalid operations
                    const validOps = parsed.filter(op => {
                      if (op.data && op.data.id) {
                        return !/^\d{13}$/.test(op.data.id.toString());
                      }
                      return true;
                    });

                    console.log(`🔧 Filtering: ${parsed.length} → ${validOps.length} operations`);
                    localStorage.setItem(key, JSON.stringify(validOps));
                    console.log(`✅ Updated ${key} with filtered operations`);
                  }
                }
              } catch (parseError) {
                console.warn(`⚠️ Could not parse ${key} as JSON:`, parseError);
              }
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error processing ${key}:`, error);
        }
      }

      // Final cleanup - remove all keys
      console.log('🧹 Final cleanup - removing all sync-related keys...');
      for (const key of trackpayKeys) {
        try {
          localStorage.removeItem(key);
          console.log(`✅ Removed: ${key}`);
        } catch (error) {
          console.warn(`⚠️ Could not remove ${key}:`, error);
        }
      }

    } else {
      console.log('✅ No trackpay-related keys found');
    }

    console.log('✅ Debug and cleanup completed');
    console.log('🔄 Please refresh the page to restart with clean state');

  } catch (error) {
    console.error('❌ Debug cleanup error:', error);
  }
}

// Auto-run
debugAndCleanSyncQueue();

// Make available globally
window.debugAndCleanSyncQueue = debugAndCleanSyncQueue;
console.log('🛠️  Available: debugAndCleanSyncQueue()');