import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Screens
import { AccountSelectionScreen } from '../screens/AccountSelectionScreen';
import { SimpleClientListScreen } from '../screens/SimpleClientListScreen';
import { ClientHistoryScreen } from '../screens/ClientHistoryScreen';
import { StyledSessionTrackingScreen } from '../screens/StyledSessionTrackingScreen';
import { ClientProfileScreen } from '../screens/ClientProfileScreen';
import { ServiceProviderListScreen } from '../screens/ServiceProviderListScreen';
import { ServiceProviderSummaryScreen } from '../screens/ServiceProviderSummaryScreen';

// Types
export type RootStackParamList = {
  AccountSelection: undefined;
  ClientList: undefined;
  ClientHistory: { clientId: string };
  SessionTracking: { clientId: string };
  ClientProfile: { clientId: string };
  ServiceProviderList: undefined;
  ServiceProviderSummary: { providerId: string; providerName: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AccountSelection"
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
        <Stack.Screen
          name="AccountSelection"
          component={AccountSelectionScreen}
        />
        <Stack.Screen
          name="ClientList"
          component={SimpleClientListScreen}
        />
        <Stack.Screen
          name="ClientHistory"
          component={ClientHistoryScreen}
        />
        <Stack.Screen
          name="SessionTracking"
          component={StyledSessionTrackingScreen}
        />
        <Stack.Screen
          name="ClientProfile"
          component={ClientProfileScreen}
        />
        <Stack.Screen
          name="ServiceProviderList"
          component={ServiceProviderListScreen}
        />
        <Stack.Screen
          name="ServiceProviderSummary"
          component={ServiceProviderSummaryScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};