import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Client, Session } from '../types';
import { Button } from '../components/Button';
import { theme } from '../styles/theme';
import { simpleT } from '../i18n/simple';
import { formatCurrency } from '../utils/formatters';
import {
  getClientById,
  getActiveSession,
  startSession,
  endSession,
  getClientSummary,
  requestPayment,
  getSessionsByClient,
} from '../services/storageService';

// Helper function to format names in proper sentence case
const formatName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface SessionTrackingScreenProps {
  route: {
    params: {
      clientId: string;
    };
  };
  navigation: any;
}

export const StyledSessionTrackingScreen: React.FC<SessionTrackingScreenProps> = ({
  route,
  navigation,
}) => {
  const t = simpleT;
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
        Alert.alert(t('sessionTracking.errorTitle'), t('sessionTracking.clientNotFound'));
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
      Alert.alert(t('sessionTracking.errorTitle'), t('sessionTracking.loadError'));
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
      Alert.alert(t('sessionTracking.errorTitle'), t('sessionTracking.startError'));
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
      Alert.alert(t('sessionTracking.errorTitle'), t('sessionTracking.endError'));
    }
  };

  const handleRequestPayment = async () => {
    try {
      const sessions = await getSessionsByClient(clientId);
      const unpaidSessions = sessions.filter(session => session.status === 'unpaid');

      if (unpaidSessions.length === 0) {
        Alert.alert(
          t('requestPaymentModal.errors.noUnpaidSessions'),
          t('requestPaymentModal.errors.noUnpaidSessions')
        );
        return;
      }

      await requestPayment(clientId, unpaidSessions.map(s => s.id));
      Alert.alert(
        t('requestPaymentModal.title'),
        t('requestPaymentModal.success.requested', {
          amount: formatCurrency(unpaidBalance),
          clientName: client?.name || ''
        })
      );
    } catch (error) {
      console.error('Error requesting payment:', error);
      Alert.alert(
        t('requestPaymentModal.errors.failed'),
        t('requestPaymentModal.errors.requestFailed')
      );
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('sessionTracking.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.clientName}>{formatName(client.name)}</Text>
        <Text style={styles.subtitle}>Session tracking</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Session Card */}
        <View style={[styles.mainCard, theme.shadows.card]}>
          {activeSession ? (
            <View style={styles.activeSessionContent}>
              <Text style={styles.timerText}>
                {formatTime(sessionTime)}
              </Text>
              <Text style={styles.sessionStatus}>
                Started at {new Date(activeSession.startTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
              <Button
                title="I'm Done"
                onPress={handleEndSession}
                variant="danger"
                size="lg"
                style={styles.actionButton}
              />
            </View>
          ) : (
            <View style={styles.readyContent}>
              <Text style={styles.readyText}>Ready to start?</Text>
              <Button
                title="I'm Here"
                onPress={handleStartSession}
                variant="success"
                size="lg"
                style={styles.actionButton}
              />
            </View>
          )}
        </View>

        {/* Summary Cards Row */}
        <View style={styles.summaryRow}>
          {/* Balance Card */}
          <View style={[styles.summaryCard, theme.shadows.card]}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={styles.balanceAmount}>
              ${unpaidBalance.toFixed(0)}
            </Text>
          </View>

          {/* Unpaid Hours Card */}
          <View style={[styles.summaryCard, theme.shadows.card]}>
            <Text style={styles.summaryLabel}>Unpaid Hours</Text>
            <Text style={styles.unpaidHours}>
              {unpaidHours.toFixed(1)}h
            </Text>
          </View>
        </View>

        {/* Request Payment Button */}
        {unpaidBalance > 0 && (
          <Button
            title={`Request $${unpaidBalance.toFixed(0)}`}
            onPress={handleRequestPayment}
            variant="primary"
            size="lg"
            style={styles.paymentButton}
          />
        )}

        {/* Current Session Value (if active) */}
        {activeSession && (
          <View style={styles.sessionValueCard}>
            <Text style={styles.sessionValueLabel}>
              Current Session Value
            </Text>
            <Text style={styles.sessionValueAmount}>
              {t('sessionTracking.totalEarned', { amount: formatCurrency(((sessionTime / 3600) * client.hourlyRate)) })}
            </Text>
            <Text style={styles.sessionValueDetail}>
              {(sessionTime / 3600).toFixed(2)} hours × {t('sessionTracking.hourlyRate', { rate: client.hourlyRate })}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  backButton: {
    marginBottom: theme.spacing.lg,
  },
  backButtonText: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  clientName: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.display,
  },
  subtitle: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    marginTop: 4,
    fontFamily: theme.typography.fontFamily.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  mainCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.card,
  },
  activeSessionContent: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 32,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.display,
  },
  sessionStatus: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xxl,
    fontFamily: theme.typography.fontFamily.primary,
  },
  readyContent: {
    alignItems: 'center',
  },
  readyText: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xxl,
    fontFamily: theme.typography.fontFamily.display,
  },
  actionButton: {
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  summaryLabel: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.primary,
  },
  balanceAmount: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily.primary,
  },
  unpaidHours: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
    fontFamily: theme.typography.fontFamily.primary,
  },
  paymentButton: {
    width: '100%',
    marginBottom: theme.spacing.xl,
  },
  sessionValueCard: {
    backgroundColor: theme.colors.status.requested.background,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.18)',
    ...theme.shadows.card,
  },
  sessionValueLabel: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.primary,
  },
  sessionValueAmount: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  sessionValueDetail: {
    fontSize: theme.fontSize.caption,
    color: theme.colors.primary,
    marginTop: 4,
    fontFamily: theme.typography.fontFamily.primary,
  },
});