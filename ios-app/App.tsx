import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, AppState, AppStateStatus, Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/AppNavigator';
import { initializeWithSeedData, debugInfo, endSession, getClients } from './src/services/storageService';
import { directSupabase } from './src/services/directSupabase';
import { ErrorBoundary } from './src/components/ErrorBoundary';
// TEMP: Use simple i18n implementation while debugging
import { initSimpleI18n } from './src/i18n/simple';
// PostHog Analytics
import { initPosthog, enableDryRun, flush, AnalyticsProvider, capture } from './src/services/analytics';
// Dynamic Island
import {
  endDynamicIslandActivity,
  getActiveActivities,
  startDynamicIslandActivity
} from './src/services/native/DynamicIslandBridge';

// Environment variable validation
const validateEnvironment = () => {
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    const message = `Missing required environment variables:\n${missing.join('\n')}\n\nPlease check your .env file and ensure all Supabase credentials are configured.`;
    if (__DEV__) {
      console.error('❌ Environment validation failed:', message);
    }

    // Show alert in development
    if (__DEV__) {
      Alert.alert(
        'Configuration Error',
        'Missing Supabase environment variables. Check console for details.',
        [{ text: 'OK' }]
      );
    }

    return false;
  }

  if (__DEV__) {
    console.log('✅ Environment variables validated successfully');
  }
  return true;
};

// Create navigation ref for deep linking
export const navigationRef = React.createRef<NavigationContainerRef<any>>();

export default function App() {
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (__DEV__) {
          console.log('🚀 TrackPay: Starting app initialization...');
        }

        // Initialize i18n system first
        if (__DEV__) {
          console.log('🌐 TrackPay: Initializing i18n...');
        }
        await initSimpleI18n();
        if (__DEV__) {
          console.log('✅ TrackPay: i18n initialized successfully');
        }

        // Initialize PostHog Analytics (after i18n)
        const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
        const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST;

        if (posthogKey && posthogHost) {
          if (__DEV__) {
            console.log('📊 TrackPay: Initializing PostHog Analytics...');
          }
          initPosthog({ key: posthogKey, host: posthogHost });

          // Enable dry-run mode based on environment variable
          const dryRunEnabled = process.env.EXPO_PUBLIC_ANALYTICS_DRY_RUN === 'true';
          if (dryRunEnabled) {
            enableDryRun(true);
            if (__DEV__) {
              console.log('🧪 TrackPay: Analytics dry-run mode enabled (events logged to console)');
            }
          } else {
            if (__DEV__) {
              console.log('📤 TrackPay: Analytics live mode enabled (events sent to PostHog)');
            }
          }

          if (__DEV__) {
            console.log('✅ TrackPay: PostHog initialized successfully');
          }
        } else {
          if (__DEV__) {
            console.warn('⚠️ TrackPay: PostHog not initialized (missing API key or host)');
          }
        }

        // Validate environment variables
        const envValid = validateEnvironment();
        if (!envValid) {
          if (__DEV__) {
            console.warn('⚠️ TrackPay: Running with incomplete configuration');
          }
        }

        // Initialize with hybrid storage (includes seed data)
        if (__DEV__) {
          console.log('🌱 TrackPay: Starting direct Supabase initialization...');
        }
        await initializeWithSeedData();
        if (__DEV__) {
          console.log('🎉 TrackPay: Direct Supabase initialization completed successfully');
        }

        // Expose debugging functions globally in development
        if (__DEV__ && typeof window !== 'undefined') {
          (window as any).directSupabase = directSupabase;
          (window as any).debugInfo = debugInfo;
          console.log('🛠️  TrackPay: Direct Supabase - Debug functions available:');
          console.log('  - directSupabase: Direct access to Supabase service');
          console.log('  - debugInfo(): Health check and debug information');
          console.log('  - No sync queue needed - everything saves directly to Supabase!');
        }

        // Mark app as ready
        setIsReady(true);

      } catch (error) {
        if (__DEV__) {
          console.error('❌ TrackPay: Error during app initialization:', error);
        }

        if (__DEV__) {
          Alert.alert(
            'Initialization Error',
            'Failed to initialize TrackPay. Check console for details.',
            [{ text: 'OK' }]
          );
        }

        // Still mark as ready to prevent infinite loading
        setIsReady(true);
      }
    };

    initializeApp();

    // Background flush: Save queued events when app goes to background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        flush(); // Flush queued events
        if (__DEV__) {
          console.log('📤 TrackPay: Analytics events flushed (app backgrounded)');
        }
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Deep linking handler
  useEffect(() => {
    if (!isReady) return;

    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;

      if (__DEV__) {
        console.log('[DeepLink] Received:', url);
      }

      // Handle stop-session deep link (from Stop Session button)
      if (url.startsWith('trackpay://stop-session')) {
        const params = new URLSearchParams(url.split('?')[1]);
        const sessionId = params.get('sessionId');

        if (sessionId) {
          try {
            if (__DEV__) {
              console.log('[DeepLink] Stopping session from Dynamic Island:', sessionId);
            }

            // End session in backend
            await endSession(sessionId);

            // End Dynamic Island activity
            await endDynamicIslandActivity(sessionId);

            // Analytics
            capture('dynamic_island_stop_pressed', {
              session_id: sessionId,
            });
          } catch (error) {
            if (__DEV__) {
              console.error('[DeepLink] Failed to stop session:', error);
            }
          }
        }
      }

      // Handle navigation deep link (tap compact/minimal island)
      if (url.startsWith('trackpay://session')) {
        const params = new URLSearchParams(url.split('?')[1]);
        const clientId = params.get('clientId');

        if (clientId && navigationRef.current?.isReady()) {
          // Navigate to SessionTracking screen
          navigationRef.current.navigate('SessionTracking', { clientId });

          if (__DEV__) {
            console.log('[DeepLink] Navigating to SessionTracking:', clientId);
          }
        }
      }
    };

    // Listen for deep links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle initial URL (if app was closed and opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isReady]);

  // State sync for Dynamic Island on app relaunch
  useEffect(() => {
    if (!isReady) return;

    const syncDynamicIslandState = async () => {
      try {
        const activities = await getActiveActivities();

        if (activities.length === 0) {
          if (__DEV__) {
            console.log('[DynamicIsland] No active activities found');
          }
          return;
        }

        if (__DEV__) {
          console.log('[DynamicIsland] Found active activities:', activities.length);
        }

        // Fetch all sessions with status='active'
        const allClients = await getClients();

        // For each activity, check if session still exists and is active
        for (const activity of activities) {
          // Check with storage service if session is still active
          const client = allClients.find(c => c.id === activity.clientId);

          if (client) {
            // Valid session - log successful sync
            if (__DEV__) {
              console.log('[DynamicIsland] Synced active session:', activity.sessionId);
            }

            capture('dynamic_island_synced_on_launch', {
              session_id: activity.sessionId,
              client_id: activity.clientId,
            });
          } else {
            // Stale activity - clean up
            if (__DEV__) {
              console.log('[DynamicIsland] Cleaning up stale activity:', activity.sessionId);
            }

            await endDynamicIslandActivity(activity.sessionId);

            capture('dynamic_island_failed', {
              session_id: activity.sessionId,
              error_code: 'STALE_ACTIVITY',
              error_message: 'Activity exists but session is not active',
              operation: 'sync',
            });
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[DynamicIsland] State sync failed:', error);
        }
      }
    };

    // Run sync after a brief delay (let app initialize)
    const timer = setTimeout(() => {
      syncDynamicIslandState();
    }, 1000);

    return () => clearTimeout(timer);
  }, [isReady]);

  // Show nothing while initializing (prevents white flash)
  if (!isReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AnalyticsProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </AnalyticsProvider>
    </ErrorBoundary>
  );
}
