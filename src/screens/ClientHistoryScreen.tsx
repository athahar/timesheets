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
  addActivity,
  getClientMoneyState,
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
  const [moneyState, setMoneyState] = useState<any>(null);
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

      // Get unified money state
      const clientMoneyState = await getClientMoneyState(clientId);
      setMoneyState(clientMoneyState);

      if (__DEV__) {
        console.debug('[moneyState]', clientId, clientMoneyState);
        console.debug('[pendingRequest]', pendingRequest);
        console.debug('[Request Button Logic] totalUnpaidBalance:', totalUnpaidBalance, 'pendingRequest:', !!pendingRequest, 'moneyState.lastPendingRequest:', !!clientMoneyState?.lastPendingRequest);
        // Debug SQL verification
        console.debug('[SQL Debug] Use these queries to verify:');
        console.debug(`SELECT * FROM trackpay_requests WHERE client_id = '${clientId}' AND status='pending' ORDER BY created_at DESC LIMIT 1;`);
        console.debug(`SELECT status, COUNT(*), SUM(amount) AS total FROM trackpay_sessions WHERE client_id='${clientId}' AND status IN ('unpaid','requested') GROUP BY status;`);
      }
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

  // Create timeline with day-grouped sessions and payment activities - memoized for performance
  const timelineItems = useMemo(() => {
    // Group sessions by date (exclude active sessions since they have their own timeline entry)
    const sessionsByDate = sessions
      .filter(session => session.status !== 'active') // Exclude active sessions
      .reduce((acc, session) => {
        const dateKey = new Date(session.endTime || session.startTime).toDateString();
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(session);
        return acc;
      }, {} as Record<string, typeof sessions>);

    // Create day group entries
    const dayGroups = Object.entries(sessionsByDate).map(([dateKey, daySessions]) => {
      const totalAmount = daySessions.reduce((sum, s) => sum + (s.amount || 0), 0);
      const date = new Date(dateKey);

      return {
        type: 'day_group' as const,
        id: `day_${dateKey}`,
        timestamp: date,
        data: {
          date,
          sessions: daySessions,
          totalAmount,
          sessionCount: daySessions.length
        }
      };
    });

    // Get payment activities
    const paymentItems = activities
      .filter(a => a.type === 'payment_completed' || a.type === 'payment_request_created')
      .map(activity => ({
        type: activity.type === 'payment_request_created' ? 'payment_request' as const : 'payment' as const,
        id: activity.id,
        timestamp: activity.data.paymentDate ? new Date(activity.data.paymentDate) : activity.timestamp,
        data: activity
      }));

    // Add active session entry if exists
    const activeSessionItems = activeSession ? [{
      type: 'active_session' as const,
      id: `active_${activeSession.id}`,
      timestamp: activeSession.startTime,
      data: activeSession
    }] : [];

    // Combine day groups with payment activities and active session
    const allItems = [...dayGroups, ...paymentItems, ...activeSessionItems];

    // Sort by timestamp (most recent first)
    allItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return allItems;
  }, [sessions, activities, activeSession]);

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
    if (pendingRequest || moneyState?.lastPendingRequest) {
      if (__DEV__) {
        console.log('❌ Request blocked - pending request already exists:', pendingRequest?.id || moneyState?.lastPendingRequest?.id);
      }
      return;
    }

    // Pre-check: Ensure unpaid (not requested) sessions exist
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
          console.log('❌ Request blocked - pending request created during confirmation:', currentPendingRequest.id);
        }
        showError('A payment request for this client is already pending.');
        setShowConfirmModal(false);
        setIsRequesting(false);
        await loadData(); // Refresh to show the pending request
        return;
      }

      // Only process unpaid sessions (not requested ones)
      const unpaidSessions = sessions.filter(s => s.status === 'unpaid');
      if (unpaidSessions.length === 0) {
        showError('There are no unpaid sessions to request payment for.');
        setShowConfirmModal(false);
        setIsRequesting(false);
        return;
      }

      // Calculate amount for unpaid sessions only
      const unpaidAmount = unpaidSessions.reduce((sum, s) => sum + (s.amount || 0), 0);

      // Generate batch ID for tracking
      const batchId = generateBatchId();
      if (__DEV__) {
        console.log('🔄 Creating payment request with batch ID:', batchId, 'for sessions:', unpaidSessions.map(s => s.id));
      }

      // Create the payment request (this will mark sessions as 'requested')
      await requestPayment(clientId, unpaidSessions.map(s => s.id));

      // Add consolidated activity for the batch
      await addActivity({
        type: 'payment_request_created',
        clientId,
        data: {
          amount: unpaidAmount,
          sessionCount: unpaidSessions.length,
          batchId,
          sessionIds: unpaidSessions.map(s => s.id)
        }
      });

      if (__DEV__) {
        console.log('✅ Payment request created successfully');
      }

      // Refresh data to show the new pending request
      await loadData();

      setShowConfirmModal(false);
      showSuccess(`Payment request for ${formatCurrency(unpaidAmount)} sent to ${client?.name}`);
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
          <View style={styles.summaryCompactRow}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryLabel}>Balance due: </Text>
              <Text style={styles.summaryAmount}>{formatCurrency(totalUnpaidBalance)}</Text>
              {totalUnpaidBalance > 0 && (
                <Text style={styles.summaryHours}> [{formatHours(unpaidHours + requestedHours)}]</Text>
              )}
            </View>
            {totalUnpaidBalance > 0 && (
              (() => {
                // Check both pending requests AND requested sessions
                const hasPendingRequest = pendingRequest || moneyState?.lastPendingRequest;
                const hasRequestedSessions = paymentStatus === 'requested' || requestedBalance > 0;
                const shouldShowDisabled = hasPendingRequest || hasRequestedSessions;
                if (__DEV__) {
                  console.debug('[Button Decision] totalUnpaidBalance:', totalUnpaidBalance, 'pendingRequest:', pendingRequest, 'moneyState.lastPendingRequest:', moneyState?.lastPendingRequest, 'paymentStatus:', paymentStatus, 'requestedBalance:', requestedBalance, 'shouldShowDisabled:', shouldShowDisabled);
                }
                return shouldShowDisabled;
              })() ? (
                // Show disabled requested status
                <View style={[styles.btnBase, styles.btnDisabled, styles.summaryButton]}>
                  <Text style={[styles.btnText, styles.btnDisabledText]}>
                    Requested {formatCurrency((pendingRequest || moneyState?.lastPendingRequest)?.amount || requestedBalance || totalUnpaidBalance)}
                  </Text>
                </View>
              ) : (
                // Show active request button
                <Pressable
                  style={({pressed}) => [
                    styles.btnBase,
                    styles.btnSecondary,
                    styles.summaryButton,
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
              )
            )}
          </View>

          {/* Active Session Hint */}
          {activeSession && (
            <Text style={styles.hintText}>
              Active session time isn't included. End session to add it.
            </Text>
          )}

          {/* Pending Request Meta */}
          {(pendingRequest || moneyState?.lastPendingRequest) && (
            <Text style={styles.metaText}>
              Requested on {formatDate((pendingRequest || moneyState?.lastPendingRequest)?.created_at)} • {formatCurrency((pendingRequest || moneyState?.lastPendingRequest)?.amount)} pending
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
              <View key={item.id}>
                <View style={styles.timelineItem}>
                  {item.type === 'day_group' ? (
                  // Day Group with Sessions
                  <View>
                    {/* Day Header */}
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayHeaderText}>
                        ⏱️ Work done • {formatDate(item.data.date)} • {formatCurrency(item.data.totalAmount)} • {item.data.sessionCount} session{item.data.sessionCount > 1 ? 's' : ''}
                      </Text>
                    </View>

                    {/* Session Details */}
                    {item.data.sessions.map((session, sessionIndex) => {
                      const formatSessionTime = (startTime: Date, endTime?: Date) => {
                        if (!endTime) {
                          // For active sessions, show "started at [time]"
                          const start = new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                          return `started at ${start}`;
                        }
                        const start = new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                        const end = new Date(endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                        return `${start}–${end}`;
                      };

                      const formatSessionDuration = (startTime: Date, endTime?: Date) => {
                        if (!endTime) return '';
                        const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
                        const hours = Math.floor(durationMs / (1000 * 60 * 60));
                        const minutes = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                        return formatHours(hours + minutes / 60);
                      };

                      return (
                        <View key={session.id} style={styles.sessionDetail}>
                          <Text style={styles.sessionBullet}>•</Text>
                          <View style={styles.sessionContent}>
                            <Text style={styles.sessionText}>
                              {formatSessionTime(session.startTime, session.endTime)}
                              {session.endTime && (
                                <Text> — {formatSessionDuration(session.startTime, session.endTime)} — <Text style={styles.sessionAmount}>{formatCurrency(session.amount || 0)}</Text></Text>
                              )}
                            </Text>
                          </View>
                          {session.status === 'active' && (
                            <StatusPill
                              status="active"
                              size="sm"
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : item.type === 'active_session' ? (
                  // Active Session Entry
                  <View style={styles.timelineLine}>
                    <Text style={styles.timelineIcon}>⏱️</Text>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineMainText}>
                        Work started • {new Date(item.data.startTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })} (active)
                      </Text>
                    </View>
                  </View>
                ) : item.type === 'payment_request' ? (
                  // Money Requested Line
                  <View style={styles.timelineLine}>
                    <Text style={styles.timelineIcon}>💰</Text>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineMainText}>
                        Money requested • {formatDate(item.timestamp)} • {formatCurrency(item.data.data.amount || 0)} • {item.data.data.sessionCount} session{item.data.data.sessionCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                ) : (
                  // Payment Received Line
                  <View style={styles.timelineLine}>
                    <Text style={styles.timelineIcon}>💸</Text>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineMainText}>
                        Payment received • {formatDate(item.timestamp)} • {formatCurrency(item.data.data.amount || 0)} • {item.data.data.sessionCount} session{item.data.data.sessionCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  )}
                </View>
                {index < timelineItems.slice(0, 20).length - 1 && (
                  <View style={styles.timelineDivider} />
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
    marginTop: 16,
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
    marginTop: 16,
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
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#FFF',
    gap: 8,
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  summaryCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    flex: 1,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  summaryButton: {
    height: 40,
    paddingHorizontal: 14,
    marginTop: 0,
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },
  summaryAmount: {
    color: '#16A34A',
    fontWeight: '700',
    fontSize: theme.font.title,
    fontVariant: ['tabular-nums'],
    fontFamily: theme.typography.fontFamily.primary,
  },
  summaryHours: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },
  requestBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestTxt: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.primary,
  },
  hintText: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },
  metaText: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },

  // Timeline amount color styles
  amountPaid: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.money,
    fontVariant: ['tabular-nums'],
    fontFamily: theme.typography.fontFamily.primary,
  },
  amountUnpaid: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
    fontVariant: ['tabular-nums'],
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
    paddingVertical: 12,
  },
  timelineDivider: {
    height: 1,
    backgroundColor: theme.color.border,
    opacity: 0.3,
    marginHorizontal: 0,
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
    fontVariant: ['tabular-nums'],
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