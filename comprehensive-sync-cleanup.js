// Comprehensive Sync Queue Cleanup to Fix UUID Errors
// Copy and paste this in browser console at http://localhost:8087

console.log('🧹 TrackPay: Comprehensive Sync Queue Cleanup');

async function comprehensiveSyncCleanup() {
  try {
    console.log('\n=== COMPREHENSIVE SYNC CLEANUP ===');

    // Clear all possible sync-related localStorage keys
    const allSyncKeys = [
      // Current keys
      'trackpay_sync_queue',
      'trackpay_offline_queue',
      'trackpay_sync_status',
      'trackpay_last_sync',

      // Legacy/alternative keys that might exist
      'trackpay-sync-queue',
      'trackpay-sync-queue-hybrid',
      '@trackpay/sync-queue',
      'hybrid-sync-queue',

      // Additional potential keys
      'trackpay_sync_operations',
      'trackpay-sync-operations'
    ];

    if (typeof localStorage !== 'undefined') {
      console.log('🔍 Scanning localStorage for sync-related keys...');

      // First, check what exists
      const existingKeys = [];
      for (const key of allSyncKeys) {
        if (localStorage.getItem(key)) {
          existingKeys.push(key);
        }
      }

      if (existingKeys.length > 0) {
        console.log('📦 Found existing sync keys:', existingKeys);

        // Clear each key
        for (const key of allSyncKeys) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              localStorage.removeItem(key);
              console.log(`✅ Cleared: ${key} (had ${value.length} characters)`);
            }
          } catch (error) {
            console.warn(`⚠️ Could not clear ${key}:`, error);
          }
        }
      } else {
        console.log('✅ No sync keys found in localStorage');
      }

      // Check for any other keys that might contain 'sync' or 'queue'
      console.log('🔍 Scanning for any remaining sync/queue keys...');
      const allKeys = Object.keys(localStorage);
      const suspiciousKeys = allKeys.filter(key =>
        key.toLowerCase().includes('sync') ||
        key.toLowerCase().includes('queue') ||
        key.includes('trackpay')
      );

      if (suspiciousKeys.length > 0) {
        console.log('🔍 Found suspicious keys:', suspiciousKeys);
        suspiciousKeys.forEach(key => {
          const value = localStorage.getItem(key);
          console.log(`📋 ${key}: ${value ? value.substring(0, 100) + '...' : 'null'}`);
        });
      }

      console.log('✅ localStorage cleanup completed');

    } else {
      console.log('❌ localStorage not available');
    }

    // Try to call the app's comprehensive cleanup if available
    if (window.clearSyncQueue) {
      console.log('🔄 Calling app clearSyncQueue method...');
      try {
        await window.clearSyncQueue();
        console.log('✅ App clearSyncQueue completed');
      } catch (error) {
        console.error('❌ App clearSyncQueue failed:', error);
      }
    }

    console.log('✅ Comprehensive sync cleanup completed successfully');
    console.log('🔄 New sessions will now use proper UUIDs');
    console.log('💡 Try starting/stopping a session now');

  } catch (error) {
    console.error('❌ Comprehensive cleanup error:', error);
  }
}

// Auto-run
comprehensiveSyncCleanup();

// Make available globally
window.comprehensiveSyncCleanup = comprehensiveSyncCleanup;
console.log('🛠️  Available: comprehensiveSyncCleanup()');