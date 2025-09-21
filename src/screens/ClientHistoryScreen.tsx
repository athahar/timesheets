import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { Client, Session, ActivityItem } from '../types';
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
  getActivities,
} from '../services/storageService';

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
  const [client, setClient] = useState<Client | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
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
    try {
      const clientData = await getClientById(clientId);
      if (!clientData) {
        Alert.alert('Error', 'Client not found');
        navigation.goBack();
        return;
      }

      setClient(clientData);
      const sessionData = await getSessionsByClient(clientId);
      const activitiesData = await getActivities();
      const clientActivities = activitiesData.filter(a => a.clientId === clientId);

      setSessions(sessionData);
      setActivities(clientActivities);

      const summary = await getClientSummary(clientId);
      setUnpaidHours(summary.unpaidHours);
      setRequestedHours(summary.requestedHours);
      setUnpaidBalance(summary.unpaidBalance);
      setRequestedBalance(summary.requestedBalance);
      setTotalUnpaidBalance(summary.totalUnpaidBalance);
      setPaymentStatus(summary.paymentStatus);
      setTotalEarned(summary.totalEarned);
      setTotalHours(summary.totalHours);

      const currentActiveSession = await getActiveSession(clientId);
      setActiveSession(currentActiveSession);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [clientId])
  );

  // Session timer effect - update less frequently to reduce re-renders
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      // Update every 5 seconds instead of every second to reduce polling
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000);
        setSessionTime(elapsed);
      }, 5000);

      // Set initial time immediately
      const elapsed = Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000);
      setSessionTime(elapsed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  // Combine sessions and payment activities into unified timeline - memoized for performance
  const timelineItems = useMemo(() => {
    const items = [
      // Map sessions to timeline items
      ...sessions.map(session => ({
        type: 'session' as const,
        id: session.id,
        timestamp: session.endTime || session.startTime,
        data: session
      })),
      // Map payment activities to timeline items
      ...activities
        .filter(a => a.type === 'payment_completed')
        .map(activity => ({
          type: 'payment' as const,
          id: activity.id,
          timestamp: activity.data.paymentDate ? new Date(activity.data.paymentDate) : activity.timestamp,
          data: activity
        }))
    ];

    // Sort by timestamp (most recent first)
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }, [sessions, activities]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatHours = (totalHours: number) => {
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours % 1) * 60);
    if (hours === 0) {
      return `${minutes}min`;
    }
    return minutes > 0 ? `${hours}hr ${minutes}min` : `${hours}hr`;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = async () => {
    try {
      await startSession(clientId);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to start session');
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await endSession(activeSession.id);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to end session');
    }
  };

  const handleRequestPayment = async () => {
    try {
      const unpaidSessions = sessions.filter(s => s.status === 'unpaid');
      if (unpaidSessions.length === 0) {
        Alert.alert('Error', 'No unpaid sessions found');
        return;
      }
      await requestPayment(clientId, unpaidSessions.map(s => s.id));
      loadData();
      Alert.alert('Success', 'Payment request sent');
    } catch (error) {
      Alert.alert('Error', 'Failed to request payment');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Client not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ClientProfile', { clientId: client.id })}>
          <Text style={styles.clientName}>{client.name}</Text>
        </TouchableOpacity>
        <Text style={styles.subtitle}>Work History</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, theme.shadows.card]}>
            <Text style={styles.statLabel}>Unpaid Hours</Text>
            <Text style={[styles.statValue, (unpaidHours + requestedHours) > 0 && styles.statWarning]}>
              {formatHours(unpaidHours + requestedHours)}
            </Text>
          </View>
          <View style={[styles.statCard, theme.shadows.card]}>
            <Text style={styles.statLabel}>Unpaid Balance</Text>
            <Text style={[styles.statValue, totalUnpaidBalance > 0 && styles.statWarning]}>
              {formatCurrency(totalUnpaidBalance)}
            </Text>
          </View>
        </View>

        {/* Active Session */}
        {activeSession && (
          <View style={[styles.activeSessionCard, theme.shadows.card]}>
            <Text style={styles.activeSessionTitle}>⏱️ Active Session</Text>
            <Text style={styles.activeSessionTime}>{formatTime(sessionTime)}</Text>
            <Button
              title="End Session"
              onPress={handleEndSession}
              variant="danger"
              size="sm"
              style={styles.endSessionButton}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {!activeSession && (
            <Button
              title="Start Session"
              onPress={handleStartSession}
              variant="success"
              size="lg"
              style={styles.actionButton}
            />
          )}
          {paymentStatus === 'unpaid' && unpaidBalance > 0 && (
            <Button
              title={`Request ${formatCurrency(unpaidBalance)}`}
              onPress={handleRequestPayment}
              variant="primary"
              size="md"
              style={styles.actionButton}
            />
          )}
        </View>

        {/* Activity Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>Activity Timeline</Text>

          {timelineItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No activity yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Work sessions and payments will appear here
              </Text>
            </View>
          ) : (
            timelineItems.slice(0, 20).map((item, index) => (
              <View key={item.id} style={styles.timelineItem}>
                {item.type === 'session' ? (
                  // Work Session Line
                  <View style={styles.timelineLine}>
                    <Text style={styles.timelineIcon}>🕒</Text>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineMainText}>
                        Work: {new Date(item.data.startTime).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric'
                        })}
                      </Text>
                      <Text style={styles.timelineSubText}>
                        {item.data.endTime
                          ? (() => {
                              const durationMs = new Date(item.data.endTime).getTime() - new Date(item.data.startTime).getTime();
                              const hours = Math.floor(durationMs / (1000 * 60 * 60));
                              const minutes = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                              const startTime = new Date(item.data.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                              const endTime = new Date(item.data.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                              return `${hours}hr${minutes > 0 ? ` ${minutes}min` : ''} (${startTime}-${endTime})`;
                            })()
                          : 'Active Session - In Progress'
                        }
                      </Text>
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={styles.timelineAmount}>
                        {item.data.endTime ? formatCurrency(item.data.amount || 0) : 'Active'}
                      </Text>
                      <StatusPill
                        status={item.data.status as 'paid' | 'unpaid' | 'requested'}
                        size="sm"
                      />
                    </View>
                  </View>
                ) : (
                  // Payment Line
                  <View style={styles.timelineLine}>
                    <Text style={styles.timelineIcon}>💰</Text>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineMainText}>
                        Payment Received
                      </Text>
                      <Text style={styles.timelineSubText}>
                        {new Date(item.timestamp).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric'
                        })} {item.data.data.sessionCount} session{item.data.data.sessionCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={styles.timelineAmount}>
                        {formatCurrency(item.data.data.amount || 0)} ({item.data.data.method})
                      </Text>
                    </View>
                  </View>
                )}
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
    color: theme.colors.primary,
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
    minWidth: '30%',
  },
  statLabel: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.primary,
  },
  statValue: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  statWarning: {
    color: theme.colors.warning,
  },
  activeSessionCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  activeSessionTitle: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: '#047857',
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.primary,
  },
  activeSessionTime: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: '#059669',
    marginBottom: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.mono,
  },
  endSessionButton: {
    alignSelf: 'flex-start',
  },
  actionButtons: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    width: '100%',
  },
  timelineSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  timelineTitle: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    fontFamily: theme.typography.fontFamily.primary,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
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
  timelineItem: {
    marginBottom: theme.spacing.md,
  },
  timelineLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  timelineIcon: {
    fontSize: 20,
    marginRight: theme.spacing.md,
    width: 24,
    textAlign: 'center',
  },
  timelineContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  timelineMainText: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 2,
  },
  timelineSubText: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  timelineRight: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  timelineAmount: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
});