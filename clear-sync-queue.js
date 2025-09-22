// Clear Sync Queue to Fix UUID Errors
// Copy and paste this in browser console at http://localhost:8087

console.log('🧹 TrackPay: Clearing Sync Queue');

async function clearSyncQueue() {
  try {
    console.log('\n=== CLEARING SYNC QUEUE ===');

    // Clear the sync queue from AsyncStorage
    if (typeof localStorage !== 'undefined') {
      const keys = [
        'trackpay-sync-queue',
        'trackpay-sync-queue-hybrid',
        '@trackpay/sync-queue',
        'hybrid-sync-queue'
      ];

      for (const key of keys) {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log('✅ Cleared:', key);
        }
      }

      console.log('✅ Sync queue cleared successfully');
      console.log('🔄 New sessions will now use proper UUIDs');
      console.log('💡 Try starting/stopping a session now');
    } else {
      console.log('❌ localStorage not available');
    }

  } catch (error) {
    console.error('❌ Clear error:', error);
  }
}

// Auto-run
clearSyncQueue();

window.clearSyncQueue = clearSyncQueue;
console.log('🛠️  Available: clearSyncQueue()');