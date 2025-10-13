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
import { IOSHeader } from '../components/IOSHeader';
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
import { simpleT, translatePaymentMethod } from '../i18n/simple';

// Helper function to format names in proper sentence case
const formatName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

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
  const t = simpleT;

  const loadData = async () => {
    try {
      const clientData = await getClientById(clientId);
      if (!clientData) {
        Alert.alert(t('clientHistory.errorTitle'), t('clientHistory.clientNotFound'));
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
        if (__DEV__) {
          if (__DEV__) console.debug('[moneyState]', clientId, clientMoneyState);
          if (__DEV__) console.debug('[pendingRequest]', pendingRequest);
          if (__DEV__) console.debug('[Request Button Logic] totalUnpaidBalance:', totalUnpaidBalance, 'pendingRequest:', !!pendingRequest, 'moneyState.lastPendingRequest:', !!clientMoneyState?.lastPendingRequest);
          // Debug SQL verification
          if (__DEV__) console.debug('[SQL Debug] Use these queries to verify:');
          if (__DEV__) console.debug(`SELECT * FROM trackpay_requests WHERE client_id = '${clientId}' AND status='pending' ORDER BY created_at DESC LIMIT 1;`);
          if (__DEV__) console.debug(`SELECT status, COUNT(*), SUM(amount) AS total FROM trackpay_sessions WHERE client_id='${clientId}' AND status IN ('unpaid','requested') GROUP BY status;`);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(t('clientHistory.errorTitle'), t('clientHistory.loadError'));
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
    const items = [
      // Map sessions to timeline items
      ...sessions.map(session => ({
        type: 'session' as const,
        id: session.id,
        timestamp: new Date(session.endTime || session.startTime),
        data: session
      })),
      // Map payment activities to timeline items
      ...activities
        .filter(a => a.type === 'payment_completed' || a.type === 'payment_request_created')
        .map(activity => ({
          type: activity.type === 'payment_completed' ? 'payment' as const : 'payment_request' as const,
          id: activity.id,
          timestamp: activity.data.paymentDate ? new Date(activity.data.paymentDate) : new Date(activity.timestamp),
          data: activity
        }))
    ];

    // Sort by timestamp, newest first
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (__DEV__) {
      console.log('📋 Timeline items:', items.map(i => ({
        type: i.type,
        timestamp: i.timestamp.toISOString(),
        isValid: !isNaN(i.timestamp.getTime())
      })));
    }

    return items;
  }, [sessions, activities, activeSession]);

  // Group timeline items by day for cleaner presentation
  const groupedTimeline = useMemo(() => {
    const groups: { [key: string]: typeof timelineItems } = {};

    timelineItems.slice(0, 20).forEach(item => {
      const date = item.timestamp;
      // Use ISO date string (YYYY-MM-DD) as the key for grouping
      const dayKey = date.toISOString().split('T')[0]; // "2025-10-09"

      if (__DEV__) {
        console.log('🗓️ Grouping item:', {
          type: item.type,
          timestamp: date.toISOString(),
          dayKey,
          formatDateResult: formatDate(date)
        });
      }

      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [timelineItems]);

  const handleStartSession = async () => {
    try {
      await startSession(clientId);
      loadData();
    } catch (error) {
      Alert.alert(t('clientHistory.errorTitle'), t('clientHistory.sessionStartError'));
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await endSession(activeSession.id);
      loadData();
    } catch (error) {
      Alert.alert(t('clientHistory.errorTitle'), t('clientHistory.sessionEndError'));
    }
  };

  const handleRequestPayment = () => {
    // Pre-check: Ensure no pending request exists (idempotency guard)
    if (pendingRequest || moneyState?.lastPendingRequest) {
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('❌ Request blocked - pending request already exists:', pendingRequest?.id || moneyState?.lastPendingRequest?.id);
        }
      }
      return;
    }

    // Pre-check: Ensure unpaid (not requested) sessions exist
    const unpaidSessions = sessions.filter(s => s.status === 'unpaid');
    if (unpaidSessions.length === 0) {
      showError(t('clientHistory.noUnpaidSessions'));
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
          if (__DEV__) {
            if (__DEV__) console.log('❌ Request blocked - pending request created during confirmation:', currentPendingRequest.id);
          }
        }
        showError(t('clientHistory.pendingRequestExists'));
        setShowConfirmModal(false);
        setIsRequesting(false);
        await loadData(); // Refresh to show the pending request
        return;
      }

      // Only process unpaid sessions (not requested ones)
      const unpaidSessions = sessions.filter(s => s.status === 'unpaid');
      if (unpaidSessions.length === 0) {
        showError(t('clientHistory.noUnpaidSessions'));
        setShowConfirmModal(false);
        setIsRequesting(false);
        return;
      }

      // Calculate amount for unpaid sessions only
      const unpaidAmount = unpaidSessions.reduce((sum, s) => sum + (s.amount || 0), 0);

      // Generate batch ID for tracking
      const batchId = generateBatchId();
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('🔄 Creating payment request with batch ID:', batchId, 'for sessions:', unpaidSessions.map(s => s.id));
        }
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
        if (__DEV__) {
          if (__DEV__) console.log('✅ Payment request created successfully');
        }
      }

      // Refresh data to show the new pending request
      await loadData();

      setShowConfirmModal(false);
      showSuccess(t('clientHistory.paymentRequested', { amount: formatCurrency(unpaidAmount), clientName: client?.name }));
    } catch (error) {
      if (__DEV__) {
        console.error('❌ Payment request failed:', error);
      }
      showError(t('clientHistory.requestFailed'));
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
          <Text style={styles.loadingText}>{t('clientHistory.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('clientHistory.clientNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <IOSHeader
        title={formatName(client.name)}
        subtitle={client.claimedStatus === 'unclaimed' ? t('clientHistory.invitePending') : undefined}
        leftAction={{
          title: t('clientHistory.clients'),
          onPress: () => navigation.goBack(),
        }}
        rightAction={{
          title: t('clientHistory.profile'),
          onPress: () => navigation.navigate('ClientProfile', { clientId: client.id }),
        }}
        largeTitleStyle="always"
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryBalanceRow}>
            <Text style={styles.summaryLabel}>{t('clientHistory.balanceDue')}</Text>
            <Text style={[styles.summaryAmount, totalUnpaidBalance === 0 && styles.summaryAmountPaid]}>{formatCurrency(totalUnpaidBalance)}</Text>
            {totalUnpaidBalance > 0 && (
              <Text style={styles.summaryHours}> [{formatHours(unpaidHours + requestedHours)}]</Text>
            )}
          </View>

          {(() => {
            // Pure hide/show logic for buttons and paid up state
            const hasPendingRequest = pendingRequest || moneyState?.lastPendingRequest;
            const unpaidUnrequestedCents = Math.round((totalUnpaidBalance - requestedBalance) * 100);

            if (__DEV__) {
              if (__DEV__) {
                if (__DEV__) console.debug('[Button Logic] totalUnpaidBalance:', totalUnpaidBalance, 'hasPendingRequest:', hasPendingRequest, 'unpaidUnrequestedCents:', unpaidUnrequestedCents);
              }
            }

            // Case 1: Show Request button (enabled) - now on separate line
            if (!hasPendingRequest && unpaidUnrequestedCents > 0) {
              return (
                <View style={styles.summaryButtonRow}>
                  <Pressable
                    style={({pressed}) => [
                      styles.btnBase,
                      styles.btnSecondary,
                      styles.summaryButton,
                      pressed && { borderColor: theme.color.btnSecondaryBorderPressed },
                    ]}
                    onPress={handleRequestPayment}
                    accessibilityRole="button"
                    accessibilityLabel={`Request payment of ${formatCurrency(unpaidUnrequestedCents / 100)}`}
                  >
                    <Text style={[styles.btnText, styles.btnSecondaryText]}>
                      {t('clientHistory.requestPayment')} {formatCurrency(unpaidUnrequestedCents / 100)}
                    </Text>
                  </Pressable>
                </View>
              );
            }

            // Case 2: Show Paid up pill (no outstanding balance AND has work history)
            if (totalUnpaidBalance === 0 && !hasPendingRequest && totalHours > 0) {
              return (
                <View style={styles.summaryButtonRow}>
                  <View style={styles.paidUpPill}>
                    <Text style={styles.paidUpText}>{t('providerSummary.paidUp')}</Text>
                  </View>
                </View>
              );
            }

            // Case 3: Hide button (pending request or requested-only balance)
            return null;
          })()}

          {/* Active Session Hint */}
          {activeSession && (
            <Text style={styles.hintText}>
              {t('providerSummary.activeSessionHint')}
            </Text>
          )}

          {/* Pending Request Meta */}
          {(pendingRequest || moneyState?.lastPendingRequest) && (
            <Text style={styles.metaText}>
              {t('providerSummary.requestedOn', {
                date: formatDate((pendingRequest || moneyState?.lastPendingRequest)?.created_at),
                amount: formatCurrency((pendingRequest || moneyState?.lastPendingRequest)?.amount)
              })}
            </Text>
          )}
        </View>

        {/* Active Session */}
        {activeSession && (
          <View style={styles.activeSessionCard}>
            <View style={styles.activeSessionHeader}>
              <Text style={styles.activeSessionTitle}>{t('providerSummary.activeSessionTitle')}</Text>
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
                {t('clientHistory.endSession')}
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
                {t('clientHistory.startSession')}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Activity Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>{t('clientHistory.activityTimeline')}</Text>

          {timelineItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('emptyState.noWork')}</Text>
              <Text style={styles.emptyStateSubtext}>
                {t('emptyState.workWillAppear')}
              </Text>
              <View style={styles.emptyStateActions}>
                <TouchableOpacity onPress={handleStartSession} style={styles.inlineLink}>
                  <Text style={styles.inlineLinkText}>{t('emptyState.startFirst')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            groupedTimeline.map(([dayKey, dayItems]) => {
              // Parse from ISO date key (e.g., "2025-10-09")
              const date = new Date(dayKey + 'T00:00:00'); // Add time to ensure correct date
              const isToday = date.toDateString() === new Date().toDateString();
              const isYesterday = date.toDateString() === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

              let dayLabel;
              if (isToday) {
                dayLabel = t('clientHistory.today');
              } else if (isYesterday) {
                dayLabel = t('clientHistory.yesterday');
              } else {
                // Use consistent formatting
                dayLabel = formatDate(date);
              }

              return (
                <View key={dayKey}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayHeaderText}>{dayLabel}</Text>
                  </View>

                  {dayItems.map((item, index) => (
                    <View key={item.id} style={styles.timelineItem}>
                      {item.type === 'session' ? (
                        // Work Session Line - Simplified
                        <View style={styles.timelineLine}>
                          <Text style={styles.timelineIcon}>🕒</Text>
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineMainText}>
                              {t('providerSummary.workSession')}
                            </Text>
                            <Text style={styles.timelineSubText}>
                              {item.data.endTime
                                ? (() => {
                                    const durationMs = new Date(item.data.endTime).getTime() - new Date(item.data.startTime).getTime();
                                    const hours = Math.floor(durationMs / (1000 * 60 * 60));
                                    const minutes = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                                    const startTime = new Date(item.data.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                                    const endTime = new Date(item.data.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                                    const durationText = minutes > 0 ? t('duration.hoursMinutes', { hours: hours.toString(), minutes: ` ${minutes}min` }) : t('duration.hours', { hours: hours.toString() });
                                    return `${durationText} • ${startTime}-${endTime}`;
                                  })()
                                : (() => {
                                    const startTime = new Date(item.data.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                                    return t('providerSummary.activeSession', { time: startTime });
                                  })()
                              }
                            </Text>
                          </View>
                          <View style={styles.timelineRight}>
                            <Text style={styles.timelineAmount}>
                              {item.data.endTime ? formatCurrency(item.data.amount || 0) : ''}
                            </Text>
                            {item.data.endTime && item.data.status !== 'requested' && (
                              <StatusPill
                                status={item.data.status as 'paid' | 'unpaid'}
                                size="sm"
                              />
                            )}
                          </View>
                        </View>
                      ) : item.type === 'payment' ? (
                        // Payment Line - Simplified
                        <View style={styles.timelineLine}>
                          <Text style={styles.timelineIcon}>💰</Text>
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineMainText}>
                              {t('providerSummary.paymentReceived')}
                            </Text>
                            <Text style={styles.timelineSubText}>
                              {formatCurrency(item.data.data.amount || 0)} • {item.data.data.sessionCount} session{item.data.data.sessionCount > 1 ? 's' : ''}
                            </Text>
                          </View>
                          <View style={styles.timelineRight}>
                            <Text style={styles.timelineAmount}>
                              {translatePaymentMethod(item.data.data.method)}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        // Payment Request Line
                        <View style={styles.timelineLine}>
                          <Text style={styles.timelineIcon}>📋</Text>
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineMainText}>
                              {t('clientHistory.paymentRequestedActivity')}
                            </Text>
                            <Text style={styles.timelineSubText}>
                              {formatCurrency(item.data.data.amount || 0)} • {item.data.data.sessionCount} session{item.data.data.sessionCount > 1 ? 's' : ''}
                            </Text>
                          </View>
                          <View style={styles.timelineRight}>
                            <Text style={styles.timelineAmount}>
                              {t('providerSummary.pending')}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmModal}
        title={t('requestPaymentModal.title')}
        message={t('requestPaymentModal.confirmMessage', {
          clientName: client?.name || '',
          amount: formatCurrency(totalUnpaidBalance)
        })}
        confirmText={t('requestPaymentModal.sendRequest')}
        cancelText={t('requestPaymentModal.cancel')}
        onConfirm={handleConfirmRequest}
        onCancel={handleCancelRequest}
        confirmStyle="primary"
        loading={isRequesting}
        loadingText={t('confirmation.requesting')}
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
  subtitle: {
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
    marginTop: 0,
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
    marginTop: 16,
    fontSize: 32,
    fontWeight: '700',
    color: theme.color.text,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
    fontFamily: theme.typography.fontFamily.primary,
  },
  endSessionButton: {
    marginTop: 16,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#FFF',
    marginTop: 16,
    gap: 12,
  },
  summaryBalanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  summaryButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
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
    paddingHorizontal: 16,
    marginTop: 0,
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },
  summaryAmount: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: theme.font.title,
    fontVariant: ['tabular-nums'],
    fontFamily: theme.typography.fontFamily.primary,
  },
  summaryAmountPaid: {
    color: '#22C55E',
  },
  summaryHours: {
    color: '#6B7280',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.primary,
  },
  requestBtn: {
    height: 40,
    paddingHorizontal: 16,
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
    color: '#111827',
    fontVariant: ['tabular-nums'],
    fontFamily: theme.typography.fontFamily.primary,
  },
  // Day header styles
  dayHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'System',
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

  // Paid up pill styles
  paidUpPill: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-end',
  },
  paidUpText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },

  // New zero-state polish styles
  clientInfo: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  emptyStateActions: {
    alignItems: 'center',
  },
  inlineLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  inlineLinkText: {
    fontSize: theme.font.body,
    color: theme.color.accent,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.primary,
  },
});