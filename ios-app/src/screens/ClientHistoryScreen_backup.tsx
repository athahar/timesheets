import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Pressable,
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
  getPendingPaymentRequest,
} from '../services/storageService';
import { formatCurrency, formatHours, formatTimer, formatDate, generateBatchId, isSameDay } from '../utils/formatters';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';

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
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const { toast, showSuccess, showError, hideToast } = useToast();

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

      // Check for pending payment request
      const pendingPaymentRequest = await getPendingPaymentRequest(clientId);
      setPendingRequest(pendingPaymentRequest);
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

  // Combine sessions and payment activities into unified timeline with consolidation - memoized for performance
  const timelineItems = useMemo(() => {
    const sessionItems = sessions.map(session => ({
      type: 'session' as const,
      id: session.id,
      timestamp: session.endTime || session.startTime,
      data: session
    }));

    const paymentItems = activities
      .filter(a => a.type === 'payment_completed')
      .map(activity => ({
        type: 'payment' as const,
        id: activity.id,
        timestamp: activity.data.paymentDate ? new Date(activity.data.paymentDate) : activity.timestamp,
        data: activity
      }));

    // Group sessions by date for consolidation
    const sessionsByDate = sessionItems.reduce((acc, session) => {
      const dateKey = new Date(session.timestamp).toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(session);
      return acc;
    }, {} as Record<string, typeof sessionItems>);

    // Create consolidated session entries (combine multiple sessions on same day)
    const consolidatedSessions = Object.entries(sessionsByDate).map(([dateKey, daySessions]) => {
      if (daySessions.length === 1) {
        return daySessions[0]; // Single session, no consolidation needed
      }

      // Multiple sessions on same day - consolidate
      const totalHours = daySessions.reduce((sum, s) => {
        if (s.data.endTime) {
          const durationMs = new Date(s.data.endTime).getTime() - new Date(s.data.startTime).getTime();
          return sum + (durationMs / (1000 * 60 * 60));
        }
        return sum;
      }, 0);

      const totalAmount = daySessions.reduce((sum, s) => sum + (s.data.amount || 0), 0);
      const allPaid = daySessions.every(s => s.data.status === 'paid');
      const anyRequested = daySessions.some(s => s.data.status === 'requested');
      const anyActive = daySessions.some(s => s.data.status === 'active');

      // Determine consolidated status
      let consolidatedStatus: 'paid' | 'unpaid' | 'requested' | 'active' = 'unpaid';
      if (anyActive) {
        consolidatedStatus = 'active';
      } else if (allPaid) {
        consolidatedStatus = 'paid';
      } else if (anyRequested) {
        consolidatedStatus = 'requested';
      }

      return {
        type: 'session_group' as const,
        id: `group_${dateKey}`,
        timestamp: daySessions[0].timestamp, // Use first session's timestamp
        data: {
          sessionCount: daySessions.length,
          totalHours,
          totalAmount,
          status: consolidatedStatus,
          date: new Date(dateKey),
          sessions: daySessions.map(s => s.data)
        }
      };
    });

    // Combine consolidated sessions with payments
    const allItems = [...consolidatedSessions, ...paymentItems];

    // Sort by timestamp (most recent first)
    allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return allItems;
  }, [sessions, activities]);


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

  const handleRequestPayment = () => {
    // Pre-check: Ensure no pending request exists (idempotency guard)
    if (pendingRequest) {
      if (__DEV__) {
        if (__DEV__) console.log('❌ Request blocked - pending request already exists:', pendingRequest.id);
      }
      return;
    }

    // Pre-check: Ensure unpaid sessions exist
    const unpaidSessions = sessions.filter(s => s.status === 'unpaid');
    if (unpaidSessions.length === 0) {
      showError('There are no unpaid sessions to request payment for.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmRequest = async () => {
    setIsRequesting(true);

    try {
      // Double-check for pending request (race condition protection)
      const currentPendingRequest = await getPendingPaymentRequest(clientId);
      if (currentPendingRequest) {
        if (__DEV__) {
          if (__DEV__) console.log('❌ Request blocked - pending request created during confirmation:', currentPendingRequest.id);
        }
        showError('A payment request for this client is already pending.');
        setShowConfirmModal(false);
        setIsRequesting(false);
        await loadData(); // Refresh to show the pending request
        return;
      }

      const unpaidSessions = sessions.filter(s => s.status === 'unpaid');
      if (unpaidSessions.length === 0) {
        showError('There are no unpaid sessions to request payment for.');
        setShowConfirmModal(false);
        setIsRequesting(false);
        return;
      }

      // Generate batch ID for tracking
      const batchId = generateBatchId();
      if (__DEV__) {
        if (__DEV__) console.log('🔄 Creating payment request with batch ID:', batchId);
      }

      // Create the payment request
      await requestPayment(clientId, unpaidSessions.map(s => s.id));

      if (__DEV__) {
        if (__DEV__) console.log('✅ Payment request created successfully');
      }

      // Refresh data to show the new pending request
      await loadData();

      setShowConfirmModal(false);
      showSuccess(`Payment request for ${formatCurrency(totalUnpaidBalance)} sent to ${client?.name}`);
    } catch (error) {
      if (__DEV__) {
        console.error('❌ Payment request failed:', error);
      }
      showError('Unable to send payment request. Please try again.');
      setShowConfirmModal(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleCancelRequest = () => {
    setShowConfirmModal(false);
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
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance due</Text>
            <View style={styles.summaryRight}>
              <Text style={styles.summaryAmount}>{formatCurrency(totalUnpaidBalance)}</Text>
              <Text style={styles.summaryHours}>[{formatHours(unpaidHours + requestedHours)}]</Text>
              {totalUnpaidBalance > 0 && !pendingRequest && (
                <Pressable
                  style={({pressed}) => [
                    styles.btnBase,
                    styles.btnSecondary,
                    pressed && { borderColor: theme.color.btnSecondaryBorderPressed },
                  ]}
                  onPress={handleRequestPayment}
                  accessibilityRole="button"
                  accessibilityLabel={`Request payment of ${formatCurrency(totalUnpaidBalance)}`}
                >
                  <Text style={[styles.btnText, styles.btnSecondaryText]}>
                    Request {formatCurrency(totalUnpaidBalance)}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Active Session Hint */}
          {activeSession && (
            <Text style={styles.hintText}>
              Active session time isn't included. End session to add it.
            </Text>
          )}

          {/* Pending Request Meta */}
          {pendingRequest && (
            <Text style={styles.metaText}>
              Requested on {formatDate(pendingRequest.created_at)} • {formatCurrency(pendingRequest.amount)} pending
            </Text>
          )}
        </View>

        {/* Active Session */}
        {activeSession && (
          <View style={styles.activeSessionCard}>
            <View style={styles.activeSessionHeader}>
              <Text style={styles.activeSessionTitle}>⏱️ Active Session</Text>
            </View>
            <Text style={styles.activeSessionTime}>{formatTimer(sessionTime)}</Text>
            <Pressable
              style={({pressed}) => [
                styles.btnBase,
                styles.btnDanger,
                styles.endSessionButton,
                pressed && { backgroundColor: theme.color.btnDangerBgPressed },
              ]}
              onPress={handleEndSession}
              accessibilityRole="button"
              accessibilityLabel="End session"
            >
              <Text style={[styles.btnText, styles.btnDangerText]}>
                End Session
              </Text>
            </Pressable>
          </View>
        )}

        {/* Start Session Button */}
        {!activeSession && (
          <View style={styles.actionButtons}>
            <Pressable
              style={({pressed}) => [
                styles.btnBase,
                styles.btnPrimary,
                styles.actionButton,
                pressed && { backgroundColor: theme.color.btnPrimaryBgPressed },
              ]}
              onPress={handleStartSession}
              accessibilityRole="button"
              accessibilityLabel="Start session"
            >
              <Text style={[styles.btnText, styles.btnPrimaryText]}>
                Start Session
              </Text>
            </Pressable>
          </View>
        )}

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
                  // Single Work Session Line
                  <View style={styles.timelineLine}>
                    <Text style={styles.timelineIcon}>🕒</Text>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineMainText}>
                        Work: {formatDate(item.data.startTime)}
                      </Text>
                      <Text style={styles.timelineSubText}>
                        {item.data.endTime
                          ? (() => {
                              const durationMs = new Date(item.data.endTime).getTime() - new Date(item.data.startTime).getTime();
                              const hours = Math.floor(durationMs / (1000 * 60 * 60));
                              const minutes = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                              const startTime = new Date(item.data.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                              const endTime = new Date(item.data.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                              return `${formatHours(hours + minutes / 60)} (${startTime}\u2013${endTime})`;
                            })()
                          : 'Active Session - In Progress'
                        }
                      </Text>
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={item.data.status === 'paid' ? styles.amountPaid : styles.amountUnpaid}>
                        {item.data.endTime ? formatCurrency(item.data.amount || 0) : 'Active'}
                      </Text>
                      <StatusPill
                        status={item.data.status as 'paid' | 'unpaid' | 'requested' | 'active'}
                        size="sm"
                      />
                    </View>
                  </View>
                ) : item.type === 'session_group' ? (
                  // Consolidated Work Sessions Line
                  <View style={styles.timelineLine}>
                    <Text style={styles.timelineIcon}>🕒</Text>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineMainText}>
                        Work: {formatDate(item.data.date)}
                      </Text>
                      <Text style={styles.timelineSubText}>
                        {item.data.sessionCount} session{item.data.sessionCount > 1 ? 's' : ''} \u2022 {formatHours(item.data.totalHours)}
                      </Text>
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={item.data.status === 'paid' ? styles.amountPaid : styles.amountUnpaid}>
                        {formatCurrency(item.data.totalAmount)}
                      </Text>
                      <StatusPill
                        status={item.data.status as 'paid' | 'unpaid' | 'requested' | 'active'}
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
                        {formatDate(item.timestamp)} \u2022 {item.data.data.sessionCount} session{item.data.data.sessionCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={styles.amountPaid}>
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        title="Request Payment"
        message={`Send a payment request to ${client?.name} for ${formatCurrency(totalUnpaidBalance)}?`}
        confirmText="Send Request"
        cancelText="Cancel"
        onConfirm={handleConfirmRequest}
        onCancel={handleCancelRequest}
        confirmStyle="primary"
        loading={isRequesting}
      />

      {/* Toast Notification */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.appBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.font.body,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 24,
  },
  backButtonText: {
    fontSize: theme.font.body,
    fontWeight: '500',
    color: theme.color.accent,
    fontFamily: theme.typography.fontFamily.primary,
  },
  clientName: {
    fontSize: theme.font.title,
    fontWeight: '600',
    color: theme.color.accent,
    fontFamily: theme.typography.fontFamily.display,
  },
  subtitle: {
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
    marginTop: 4,
    fontFamily: theme.typography.fontFamily.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  activeSessionCard: {
    backgroundColor: theme.color.cardBg,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: theme.color.accentTeal,
  },
  activeSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeSessionTitle: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
  },
  activeSessionTime: {
    marginTop: 8,
    fontSize: 32,
    fontWeight: '700',
    color: theme.color.text,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    marginBottom: 12,
    fontFamily: theme.typography.fontFamily.primary,
  },
  endSessionButton: {
    marginTop: 12,
    width: '100%',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    width: '100%',
  },

  // Button base styles
  btnBase: {
    height: 48,
    borderRadius: theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: theme.color.btnPrimaryBg,
  },
  btnDanger: {
    backgroundColor: theme.color.btnDangerBg,
  },
  btnSecondary: {
    backgroundColor: theme.color.btnSecondaryBg,
    borderWidth: 1,
    borderColor: theme.color.btnSecondaryBorder,
  },
  btnText: {
    fontSize: theme.font.body,
    fontWeight: '600',
  },
  btnPrimaryText: {
    color: theme.color.btnPrimaryText,
  },
  btnDangerText: {
    color: theme.color.btnDangerText,
  },
  btnSecondaryText: {
    color: theme.color.btnSecondaryText,
  },
  btnDisabled: {
    backgroundColor: theme.color.btnDisabledBg,
    borderColor: theme.color.btnDisabledBorder,
  },
  btnDisabledText: {
    color: theme.color.btnDisabledText,
  },

  // Summary card styles
  summaryCard: {
    backgroundColor: theme.color.cardBg,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    padding: 16,
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  summaryLabel: {
    color: theme.color.textSecondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },
  summaryAmount: {
    color: theme.color.money,
    fontWeight: '700',
    fontSize: theme.font.title,
    fontVariant: ['tabular-nums'],
    fontFamily: theme.typography.fontFamily.primary,
  },
  summaryHours: {
    color: theme.color.textSecondary,
    fontSize: theme.font.body,
    fontFamily: theme.typography.fontFamily.primary,
  },
  hintText: {
    marginTop: 8,
    color: theme.color.textSecondary,
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },
  metaText: {
    marginTop: 4,
    color: theme.color.textTertiary,
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primary,
  },

  // Timeline amount color styles
  amountPaid: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.money,
    fontFamily: theme.typography.fontFamily.primary,
  },
  amountUnpaid: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
  },
  timelineSection: {
    backgroundColor: theme.color.cardBg,
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: theme.radius.card,
    padding: 16,
  },
  timelineTitle: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
    marginBottom: 16,
    fontFamily: theme.typography.fontFamily.primary,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: theme.font.body,
    fontWeight: '500',
    color: theme.color.textSecondary,
    marginBottom: 8,
    fontFamily: theme.typography.fontFamily.primary,
  },
  emptyStateSubtext: {
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.primary,
  },
  timelineItem: {
    marginBottom: 12,
  },
  timelineLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  timelineIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  timelineContent: {
    flex: 1,
    marginRight: 12,
  },
  timelineMainText: {
    fontSize: theme.font.body,
    fontWeight: '500',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 2,
  },
  timelineSubText: {
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  timelineRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timelineAmount: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.money,
    fontFamily: theme.typography.fontFamily.primary,
  },
  // Day header styles
  dayHeader: {
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border + '40', // 25% opacity
  },
  dayHeaderText: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
  },
  // Session detail styles
  sessionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 16,
  },
  sessionBullet: {
    fontSize: 16,
    color: theme.color.textSecondary,
    marginRight: 8,
    width: 16,
    textAlign: 'center',
  },
  sessionContent: {
    flex: 1,
    marginRight: 8,
  },
  sessionText: {
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  sessionAmount: {
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: theme.color.text,
  },
});