import React, { useState, useCallback, useEffect } from 'react';
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
import { StatusPill } from '../components/StatusPill';
import { theme } from '../styles/theme';
import {
  getClientById,
  getSessionsByClient,
  getClientSummary,
  requestPayment,
  startSession,
  endSession,
  getActiveSession,
} from '../services/storage';

interface ClientHistoryScreenProps {
  route: {
    params: {
      clientId: string;
    };
  };
  navigation: any;
}

export const ClientHistoryScreen: React.FC<ClientHistoryScreenProps> = ({
  route,
  navigation,
}) => {
  const { clientId } = route.params;
  console.log('🚀 ClientHistoryScreen: Component initialized with clientId:', clientId);
  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [unpaidHours, setUnpaidHours] = useState(0);
  const [requestedHours, setRequestedHours] = useState(0);
  const [unpaidBalance, setUnpaidBalance] = useState(0);
  const [requestedBalance, setRequestedBalance] = useState(0);
  const [totalUnpaidBalance, setTotalUnpaidBalance] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'requested' | 'paid'>('paid');
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionTime, setSessionTime] = useState(0);

  const loadData = async () => {
    console.log('🔍 ClientHistoryScreen: Starting to load data for clientId:', clientId);
    try {
      console.log('📋 Getting client data...');
      const clientData = await getClientById(clientId);
      console.log('📋 Client data received:', clientData);

      if (!clientData) {
        console.error('❌ Client not found for ID:', clientId);
        Alert.alert('Error', 'Client not found');
        navigation.goBack();
        return;
      }

      setClient(clientData);
      console.log('✅ Client state set:', clientData.name);

      console.log('📊 Getting sessions data...');
      const sessionData = await getSessionsByClient(clientId);
      console.log('📊 Sessions data received:', sessionData.length, 'sessions');
      setSessions(sessionData);

      console.log('📈 Getting client summary...');
      const summary = await getClientSummary(clientId);
      console.log('📈 Summary received:', summary);
      setUnpaidHours(summary.unpaidHours);
      setRequestedHours(summary.requestedHours);
      setUnpaidBalance(summary.unpaidBalance);
      setRequestedBalance(summary.requestedBalance);
      setTotalUnpaidBalance(summary.totalUnpaidBalance);
      setPaymentStatus(summary.paymentStatus);
      setTotalEarned(summary.totalEarned);
      setTotalHours(summary.totalHours);

      console.log('🎯 Checking for active session...');
      const activeSessionData = await getActiveSession(clientId);
      console.log('🎯 Active session:', activeSessionData);
      setActiveSession(activeSessionData);

      console.log('✅ All data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      console.log('🏁 Setting loading to false');
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [clientId])
  );

  // Timer effect for active session - update every minute to reduce re-renders
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      // Update immediately
      const updateTimer = () => {
        const now = new Date().getTime();
        const start = new Date(activeSession.startTime).getTime();
        const elapsed = Math.floor((now - start) / 1000); // seconds
        setSessionTime(elapsed);
      };

      updateTimer(); // Initial update
      interval = setInterval(updateTimer, 60000); // Update every minute instead of every second
    } else {
      setSessionTime(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStartSession = async () => {
    try {
      console.log('🟢 Starting new session for client:', clientId);
      const newSession = await startSession(clientId);
      setActiveSession(newSession);
      console.log('✅ Session started:', newSession.id);
    } catch (error) {
      console.error('❌ Error starting session:', error);
      Alert.alert('Error', 'Failed to start session');
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    try {
      console.log('🔴 Ending session:', activeSession.id);
      await endSession(activeSession.id);
      setActiveSession(null);
      console.log('✅ Session ended successfully');
      // Refresh all data after ending session
      loadData();
    } catch (error) {
      console.error('❌ Error ending session:', error);
      Alert.alert('Error', 'Failed to end session');
    }
  };

  const handleRequestPayment = async () => {
    try {
      const unpaidSessions = sessions.filter(session => session.status === 'unpaid');

      if (unpaidSessions.length === 0) {
        Alert.alert('No Unpaid Sessions', 'There are no unpaid sessions for this client.');
        return;
      }

      await requestPayment(clientId, unpaidSessions.map(s => s.id));
      Alert.alert('Payment Requested', 'Payment request has been sent to the client.');
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error requesting payment:', error);
      Alert.alert('Error', 'Failed to request payment');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatSessionTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}hr:${minutes.toString().padStart(2, '0')}min`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}hr ${m}min`;
  };

  console.log('🔄 ClientHistoryScreen: Render check - loading:', loading, 'client:', !!client);

  if (loading || !client) {
    console.log('⏳ ClientHistoryScreen: Showing loading state');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading Client History...</Text>
          <Text style={[styles.loadingText, { marginTop: 10, fontSize: 12 }]}>
            Client ID: {clientId}
          </Text>
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
        <TouchableOpacity onPress={() => navigation.navigate('ClientProfile', { clientId })}>
          <Text style={[styles.clientName, styles.clickableClientName]}>{client.name}</Text>
        </TouchableOpacity>
        <Text style={styles.subtitle}>Work History</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Key Stats - Only what matters for action */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, theme.shadows.card]}>
            <Text style={styles.statLabel}>Total Owed</Text>
            <Text style={styles.statUnpaid}>
              {formatCurrency(totalUnpaidBalance)}
            </Text>
          </View>

          <View style={[styles.statCard, theme.shadows.card]}>
            <Text style={styles.statLabel}>
              {paymentStatus === 'unpaid' ? 'Unpaid Hours' :
               paymentStatus === 'requested' ? 'Requested Hours' : 'Owed Hours'}
            </Text>
            <Text style={styles.statUnpaidHours}>
              {paymentStatus === 'unpaid' ? formatHours(unpaidHours) :
               paymentStatus === 'requested' ? formatHours(requestedHours) :
               formatHours(unpaidHours + requestedHours)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          {/* Primary Action: Session Tracking */}
          {activeSession ? (
            <Button
              title={`${formatSessionTime(sessionTime)} | I'm Done`}
              onPress={handleEndSession}
              variant="danger"
              size="lg"
              style={styles.primaryActionButton}
            />
          ) : (
            <Button
              title="I'm Here"
              onPress={handleStartSession}
              variant="success"
              size="lg"
              style={styles.primaryActionButton}
            />
          )}

          {/* Secondary Action: Payment Request */}
          {paymentStatus === 'unpaid' && unpaidBalance > 0 && (
            <Button
              title={`Request ${formatCurrency(unpaidBalance)}`}
              onPress={handleRequestPayment}
              variant="primary"
              size="md"
              style={styles.secondaryActionButton}
            />
          )}
          {paymentStatus === 'requested' && (
            <Button
              title="Payment Requested"
              onPress={() => {}} // No action - just informational
              variant="secondary"
              size="md"
              style={[styles.secondaryActionButton, styles.requestedButtonDisabled]}
              disabled={true}
            />
          )}
        </View>

        {/* Sessions History */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Recent Sessions</Text>

          {sessions.length === 0 ? (
            <View style={[styles.emptyState, theme.shadows.card]}>
              <Text style={styles.emptyStateText}>No work sessions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start your first session with this client
              </Text>
            </View>
          ) : (
            sessions
              .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
              .slice(0, 10)
              .map((session, index) => (
              <View key={session.id}>
                <View style={styles.sessionRow}>
                  {/* Left side: date + time (stacked) */}
                  <View style={styles.sessionLeft}>
                    <Text style={styles.sessionDate}>
                      {formatDate(session.startTime)}
                    </Text>
                    <Text style={styles.sessionTimeRange}>
                      {new Date(session.startTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} - {session.endTime ? new Date(session.endTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'In Progress'} ({session.endTime ? formatTime((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000) : 'Active'})
                    </Text>
                  </View>

                  {/* Right side: status pill + amount (stacked) */}
                  <View style={styles.sessionRight}>
                    <StatusPill
                      status={session.status as 'paid' | 'unpaid' | 'requested'}
                      size="sm"
                      style={styles.statusPillSpacing}
                    />
                    <Text style={styles.sessionAmount}>
                      {session.endTime ? formatCurrency(session.amount || 0) : formatCurrency(0)}
                    </Text>
                  </View>
                </View>

                {/* Divider between rows (except last) */}
                {index < sessions.length - 1 && <View style={styles.sessionDivider} />}
              </View>
            ))
          )}
        </View>
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
  clickableClientName: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
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
  // Dashboard Stats Grid (2x2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    minWidth: '47%', // Two cards per row with gap
  },
  statLabel: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.primary,
  },
  statEarnings: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily.primary,
  },
  statHours: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  statUnpaid: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
    fontFamily: theme.typography.fontFamily.primary,
  },
  statUnpaidHours: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.warning,
    fontFamily: theme.typography.fontFamily.primary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    alignItems: 'flex-start',
  },
  primaryActionButton: {
    flex: 2,
    minHeight: 56,
  },
  secondaryActionButton: {
    flex: 1,
  },
  requestedButtonDisabled: {
    opacity: 0.7,
  },
  historySection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    ...theme.shadows.card,
  },
  historyTitle: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    fontFamily: theme.typography.fontFamily.primary,
  },
  emptyState: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  emptyStateText: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.primary,
  },
  emptyStateSubtext: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.primary,
  },
  // Session Row (horizontal layout)
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  sessionLeft: {
    flex: 1,
  },
  sessionDate: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 2,
  },
  sessionTimeRange: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  statusPillSpacing: {
    marginBottom: theme.spacing.xs,
  },
  sessionAmount: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  sessionDivider: {
    height: 1,
    backgroundColor: '#E5E5E7', // Light gray border
    marginHorizontal: 0,
  },
});