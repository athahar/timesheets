import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Client, Session } from '../types';
import { TPButton } from '../components/v2/TPButton';
import {
  getClientById,
  getActiveSession,
  startSession,
  endSession,
  getClientSummary,
  requestPayment,
  getSessionsByClient,
} from '../services/storageService';

interface SessionTrackingScreenProps {
  route: {
    params: {
      clientId: string;
    };
  };
  navigation: any;
}

export const SessionTrackingScreen: React.FC<SessionTrackingScreenProps> = ({
  route,
  navigation,
}) => {
  const { clientId } = route.params;
  const [client, setClient] = useState<Client | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [unpaidHours, setUnpaidHours] = useState(0);
  const [unpaidBalance, setUnpaidBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionTime, setSessionTime] = useState(0);

  const loadData = async () => {
    try {
      const clientData = await getClientById(clientId);
      if (!clientData) {
        Alert.alert('Error', 'Client not found');
        navigation.goBack();
        return;
      }

      setClient(clientData);

      const activeSessionData = await getActiveSession(clientId);
      setActiveSession(activeSessionData);

      const summary = await getClientSummary(clientId);
      setUnpaidHours(summary.unpaidHours);
      setUnpaidBalance(summary.unpaidBalance);

      if (activeSessionData) {
        const elapsed = (Date.now() - new Date(activeSessionData.startTime).getTime()) / 1000;
        setSessionTime(elapsed);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [clientId])
  );

  // Timer effect for active session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - new Date(activeSession.startTime).getTime()) / 1000;
        setSessionTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStartSession = async () => {
    try {
      const newSession = await startSession(clientId);
      setActiveSession(newSession);
      setSessionTime(0);
    } catch (error) {
      console.error('Error starting session:', error);
      Alert.alert('Error', 'Failed to start session');
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    try {
      await endSession(activeSession.id);
      setActiveSession(null);
      setSessionTime(0);
      loadData(); // Refresh summary data
    } catch (error) {
      console.error('Error ending session:', error);
      Alert.alert('Error', 'Failed to end session');
    }
  };

  const handleRequestPayment = async () => {
    try {
      const sessions = await getSessionsByClient(clientId);
      const unpaidSessions = sessions.filter(session => session.status === 'unpaid');

      if (unpaidSessions.length === 0) {
        Alert.alert('No Unpaid Sessions', 'There are no unpaid sessions for this client.');
        return;
      }

      await requestPayment(clientId, unpaidSessions.map(s => s.id));
      Alert.alert('Payment Requested', 'Payment request has been sent to the client.');
    } catch (error) {
      console.error('Error requesting payment:', error);
      Alert.alert('Error', 'Failed to request payment');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !client) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <Text className="text-text-secondary text-body">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Custom Header */}
      <View className="px-6 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mb-4"
        >
          <Text className="text-primary text-headline">← Back</Text>
        </TouchableOpacity>
        <Text className="text-display font-bold text-text-primary">{client.name}</Text>
        <Text className="text-body text-text-secondary mt-1">Session tracking</Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Main Session Card */}
        <View className="bg-card rounded-card shadow-card p-8 mb-6">
          {activeSession ? (
            <View className="items-center">
              <Text className="text-title font-bold text-text-primary mb-2">
                {formatTime(sessionTime)}
              </Text>
              <Text className="text-callout text-text-secondary mb-8">
                Started at {new Date(activeSession.startTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
              <TPButton
                title="I'm Done"
                onPress={handleEndSession}
                variant="danger"
                size="lg"
              />
            </View>
          ) : (
            <View className="items-center">
              <Text className="text-title font-bold text-text-primary mb-8">
                Ready to start?
              </Text>
              <TPButton
                title="I'm Here"
                onPress={handleStartSession}
                variant="primary"
                size="lg"
              />
            </View>
          )}
        </View>

        {/* Summary Cards Row */}
        <View className="flex-row space-x-4 mb-6">
          {/* Balance Card */}
          <View className="flex-1 bg-card rounded-card shadow-card p-6">
            <Text className="text-callout text-text-secondary mb-3">Balance</Text>
            <Text className="text-title font-bold text-success">
              ${unpaidBalance.toFixed(0)}
            </Text>
          </View>

          {/* Unpaid Hours Card */}
          <View className="flex-1 bg-card rounded-card shadow-card p-6">
            <Text className="text-callout text-text-secondary mb-3">Unpaid Hours</Text>
            <Text className="text-title font-bold text-warning">
              {unpaidHours.toFixed(1)}h
            </Text>
          </View>
        </View>

        {/* Request Payment Button */}
        {unpaidBalance > 0 && (
          <TPButton
            title={`Request $${unpaidBalance.toFixed(0)}`}
            onPress={handleRequestPayment}
            variant="primary"
            size="lg"
          />
        )}

        {/* Current Session Value (if active) */}
        {activeSession && (
          <View className="mt-6 bg-purple-50 rounded-card p-6 border border-purple-200">
            <Text className="text-callout text-purple-700 mb-2">
              Current Session Value
            </Text>
            <Text className="text-title font-bold text-purple-600">
              ${((sessionTime / 3600) * client.hourlyRate).toFixed(2)}
            </Text>
            <Text className="text-footnote text-purple-600 mt-1">
              {(sessionTime / 3600).toFixed(2)} hours × ${client.hourlyRate}/hr
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};