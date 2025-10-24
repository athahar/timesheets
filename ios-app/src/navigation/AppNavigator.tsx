import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Linking } from 'react-native';

// Auth Context
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Analytics
import { trackNavigation } from '../services/analytics';

// Auth Screens
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { InviteClaimScreen } from '../screens/InviteClaimScreen';

// App Screens
import { AccountSelectionScreen } from '../screens/AccountSelectionScreen';
import { ClientListScreen } from '../screens/ClientListScreen';
import { ClientHistoryScreen } from '../screens/ClientHistoryScreen';
import { StyledSessionTrackingScreen } from '../screens/StyledSessionTrackingScreen';
import { ClientProfileScreen } from '../screens/ClientProfileScreen';
import { ServiceProviderListScreen } from '../screens/ServiceProviderListScreen';
import { ServiceProviderSummaryScreen } from '../screens/ServiceProviderSummaryScreen';
import { ProviderProfileScreen } from '../screens/ProviderProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

// Components
import { SimplifiedSyncStatus } from '../components/SimplifiedSyncStatus';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';
import { extractInviteCode } from '../utils/inviteCodeGenerator';

// Types
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  InviteClaim: { inviteCode?: string };
};

export type AppStackParamList = {
  AccountSelection: undefined;
  ClientList: undefined;
  ClientHistory: { clientId: string };
  SessionTracking: { clientId: string };
  ClientProfile: { clientId: string };
  ServiceProviderList: undefined;
  ServiceProviderSummary: { providerId: string; providerName: string };
  ProviderProfile: { providerId: string; providerName: string };
  Settings: undefined;
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const AppStack = createStackNavigator<AppStackParamList>();

// Loading Component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Smart Account Selection - Auto-navigates based on user role
const SmartAccountSelection = ({ navigation, userProfile, isLoading }: { navigation: any; userProfile: any; isLoading: boolean }) => {
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    if (userProfile && !navigated) {

      // Small delay to ensure navigation completes properly
      const navigationTimeout = setTimeout(() => {
        if (userProfile.role === 'provider') {
          navigation.reset({
            index: 0,
            routes: [{ name: 'ClientList' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'ServiceProviderList' }],
          });
        }
        setNavigated(true);
      }, 200); // Increased delay

      return () => clearTimeout(navigationTimeout);
    } else if (!userProfile) {
      setNavigated(false);
    }
  }, [userProfile, navigation, navigated]);

  // If loading or have userProfile, show loading screen
  if (isLoading || userProfile) {
    return <LoadingScreen />;
  }

  // Only show AccountSelection if not loading and no userProfile
  // This prevents the "Welcome!" screen from flashing during initial load
  return <AccountSelectionScreen navigation={navigation} />;
};

// Auth Navigator - for unauthenticated users
const AuthNavigator = () => (
  <AuthStack.Navigator
    initialRouteName="Welcome"
    screenOptions={{
      headerShown: false,
      gestureEnabled: true,
      cardStyleInterpolator: ({ current, layouts }) => ({
        cardStyle: {
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width, 0],
              }),
            },
          ],
        },
      }),
    }}
  >
    <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStack.Screen name="InviteClaim" component={InviteClaimScreen} />
  </AuthStack.Navigator>
);

// App Navigator - for authenticated users
const AppNavigator = () => {
  const { userProfile, isLoading } = useAuth();

  // Show loading while profile is being fetched
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Determine initial route based on user role
  const getInitialRoute = (): keyof AppStackParamList => {
    if (!userProfile) {
      return 'AccountSelection';
    }

    // Direct navigation based on role - bypass AccountSelection
    return userProfile.role === 'provider' ? 'ClientList' : 'ServiceProviderList';
  };

  const initialRouteName = getInitialRoute();

  return (
    <>
      <SimplifiedSyncStatus visible={false} />
      <AppStack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
        }}
      >
        <AppStack.Screen name="AccountSelection">
          {(props) => <SmartAccountSelection {...props} userProfile={userProfile} isLoading={isLoading} />}
        </AppStack.Screen>
        <AppStack.Screen
          name="ClientList"
          component={ClientListScreen}
          options={{ unmountOnBlur: false }} // Prevent remounts that force refetch
        />
        <AppStack.Screen name="ClientHistory" component={ClientHistoryScreen} />
        <AppStack.Screen name="SessionTracking" component={StyledSessionTrackingScreen} />
        <AppStack.Screen name="ClientProfile" component={ClientProfileScreen} />
        <AppStack.Screen name="ServiceProviderList" component={ServiceProviderListScreen} />
        <AppStack.Screen name="ServiceProviderSummary" component={ServiceProviderSummaryScreen} />
        <AppStack.Screen name="ProviderProfile" component={ProviderProfileScreen} />
        <AppStack.Screen name="Settings" component={SettingsScreen} />
      </AppStack.Navigator>
    </>
  );
};

// Main Navigation Component with Auth Logic
const Navigation = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
};

// Root Navigator Component
export const RootNavigator = () => {
  const navigationRef = useRef<any>();
  const routeNameRef = useRef<string>();

  const linking = {
    prefixes: ['trackpay://', 'https://trackpay.app'],
    config: {
      screens: {
        InviteClaim: '/invite/:inviteCode',
      },
    },
  };

  return (
    <AuthProvider>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onReady={() => {
          // Store initial route name
          routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
        }}
        onStateChange={() => {
          const previousRouteName = routeNameRef.current;
          const currentRoute = navigationRef.current?.getCurrentRoute();
          const currentRouteName = currentRoute?.name;

          // Track navigation if route changed
          if (previousRouteName !== currentRouteName && currentRouteName) {
            trackNavigation(
              previousRouteName || null,
              currentRouteName,
              currentRoute?.params
            );
          }

          // Save current route name for next change
          routeNameRef.current = currentRouteName;
        }}
      >
        <Navigation />
      </NavigationContainer>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
});