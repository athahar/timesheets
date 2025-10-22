import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { RootNavigator } from './src/navigation/AppNavigator';
import { initializeWithSeedData, debugInfo } from './src/services/storageService';
import { directSupabase } from './src/services/directSupabase';
import { ErrorBoundary } from './src/components/ErrorBoundary';
// TEMP: Use simple i18n implementation while debugging
import { initSimpleI18n } from './src/i18n/simple';
// PostHog Analytics
import { initPosthog, enableDryRun, flush, AnalyticsProvider } from './src/services/analytics';

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
