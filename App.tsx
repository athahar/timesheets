import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initializeWithSeedData } from './src/services/storage';

export default function App() {
  useEffect(() => {
    // Initialize with seed data on app start
    const initializeSeedData = async () => {
      try {
        console.log('🚀 App: Starting seed data initialization...');
        await initializeWithSeedData();
        console.log('🎉 App: Seed data initialization completed');
      } catch (error) {
        console.error('❌ App: Error initializing seed data:', error);
      }
    };

    initializeSeedData();
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
