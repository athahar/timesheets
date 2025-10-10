import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { RootNavigator } from './src/navigation/AppNavigator';
import { initializeWithSeedData, debugInfo } from './src/services/storageService';
import { directSupabase } from './src/services/directSupabase';
import { ErrorBoundary } from './src/components/ErrorBoundary';
// TEMP: Use simple i18n implementation while debugging
import { initSimpleI18n } from './src/i18n/simple';

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
      }
    };

    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <RootNavigator />
      <StatusBar style="auto" />
    </ErrorBoundary>
  );
}
