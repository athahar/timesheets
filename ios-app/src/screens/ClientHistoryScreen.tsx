import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { Client, Session, ActivityItem } from '../types';
import { TPButton } from '../components/v2/TPButton';
import { TPAvatar } from '../components/v2/TPAvatar';
import { StatusPill } from '../components/StatusPill';
import { IOSHeader } from '../components/IOSHeader';
import { TP } from '../styles/themeV2';
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
  updateSessionCrewSize,
} from '../services/storageService';
import { formatCurrency, formatHours, formatTimer, formatDate, generateBatchId, isSameDay } from '../utils/formatters';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { simpleT, translatePaymentMethod } from '../i18n/simple';
import { useAuth } from '../contexts/AuthContext';
// Analytics
import { capture, group, E, nowIso } from '../services/analytics';

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
  const { user } = useAuth();
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
  const [initialLoad, setInitialLoad] = useState(true);
  const lastFetchedRef = useRef<number>(0);
  const loadingRef = useRef<boolean>(false); // Debounce guard for loadData
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionTime, setSessionTime] = useState(0);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [moneyState, setMoneyState] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [crewSize, setCrewSize] = useState(1);
  const [crewMessage, setCrewMessage] = useState<string | null>(null);
  const [isUpdatingCrew, setIsUpdatingCrew] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const { toast, showSuccess, showError, hideToast } = useToast();
  const t = simpleT;

  const loadData = useCallback(async (silent = false) => {
    // Debounce guard: prevent concurrent calls
    if (loadingRef.current) {
      if (__DEV__) console.log('🚫 loadData: already loading, skipping duplicate call');
      return;
    }

    loadingRef.current = true;
    try {
      if (!silent) setLoading(true);

      const clientData = await getClientById(clientId);
      if (!clientData) {
        Alert.alert(simpleT('clientHistory.errorTitle'), simpleT('clientHistory.clientNotFound'));
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
      setCrewSize(currentActiveSession?.crewSize || 1);

      // Check for pending payment request
      const pendingPaymentRequest = await getPendingPaymentRequest(clientId);
      setPendingRequest(pendingPaymentRequest);

      // Get unified money state
      const clientMoneyState = await getClientMoneyState(clientId);
      setMoneyState(clientMoneyState);

      lastFetchedRef.current = Date.now();

      if (__DEV__) {
        console.debug('[moneyState]', clientId, clientMoneyState);
        console.debug('[pendingRequest]', pendingPaymentRequest);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading data:', error);
      Alert.alert(simpleT('clientHistory.errorTitle'), simpleT('clientHistory.loadError'));
    } finally {
      if (!silent) {
        setLoading(false);
        setInitialLoad(false);
      }
      loadingRef.current = false; // Reset debounce guard
    }
  }, [clientId, navigation]); // Only depend on clientId - navigation and simpleT are stable

  useFocusEffect(
    useCallback(() => {
      if (initialLoad) {
        // First load - show spinner
        loadData(false);
      } else {
        // Stale-time pattern: only refetch if >30s old
        const STALE_MS = 30_000;
        if (Date.now() - lastFetchedRef.current > STALE_MS) {
          loadData(true); // Silent refetch
        }
      }
    }, [initialLoad, loadData])
  );

  // Session timer effect - update less frequently to reduce re-renders
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      // Update every minute (60000ms) for timer display
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000);
        setSessionTime(elapsed);
      }, 60000);

      // Set initial time immediately
      const elapsed = Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000);
      setSessionTime(elapsed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  useEffect(() => {
    if (!crewMessage) return;
    const timer = setTimeout(() => setCrewMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [crewMessage]);

  const currentCrewSize = activeSession?.crewSize ?? crewSize;
  const perPersonHours = activeSession ? sessionTime / 3600 : 0;
  const totalPersonHours = perPersonHours * currentCrewSize;

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
        .filter(a => a.type === 'payment_completed' || a.type === 'payment_request')
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

      // Debug payment request data specifically
      const paymentRequests = items.filter(i => i.type === 'payment_request');
      if (paymentRequests.length > 0) {
        console.log('💰 Payment request data:', paymentRequests.map(pr => ({
          type: pr.type,
          data: pr.data
        })));
      }
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

const handleCrewAdjust = async (delta: number) => {
  const targetSize = Math.max(1, currentCrewSize + delta);
  if (targetSize === currentCrewSize) return;

    if (activeSession) {
      setIsUpdatingCrew(true);
      try {
        const updated = await updateSessionCrewSize(activeSession.id, targetSize);
        const normalized = updated.crewSize ?? targetSize;
        setActiveSession(prev => prev ? { ...prev, crewSize: normalized } : prev);
        setCrewSize(normalized);
        setCrewMessage(`${normalized} ${normalized === 1 ? t('common.person') : t('common.people')} logged for this session.`);
      } catch (error) {
        console.error('Error updating crew size:', error);
        Alert.alert(t('clientHistory.errorTitle'), t('clientHistory.errorUpdateCrewSize'));
      } finally {
        setIsUpdatingCrew(false);
      }
    } else {
      setCrewSize(targetSize);
      setCrewMessage(`${targetSize} ${targetSize === 1 ? t('common.person') : t('common.people')} will be tracked when the session starts.`);
    }
  };

  const renderCrewSelector = () => {
    const minusDisabled = currentCrewSize <= 1 || isUpdatingCrew;
    const plusDisabled = isUpdatingCrew;

    return (
      <View style={styles.crewSelector}>
        <Text style={styles.crewLabel}>{t('clientHistory.crewSize')}</Text>
        <View style={styles.crewStepper}>
          <TouchableOpacity
            onPress={() => handleCrewAdjust(-1)}
            disabled={minusDisabled}
            style={[styles.crewButton, minusDisabled && styles.crewButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Decrease crew size"
          >
            <Text style={styles.crewButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.crewValue}>{currentCrewSize}</Text>
          <TouchableOpacity
            onPress={() => handleCrewAdjust(1)}
            disabled={plusDisabled}
            style={[styles.crewButton, plusDisabled && styles.crewButtonDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Increase crew size"
          >
            <Text style={styles.crewButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.crewHint}>
          {activeSession ? t('clientHistory.crewApplies') : t('clientHistory.crewSetBefore')}
        </Text>
        {crewMessage ? <Text style={styles.crewMessage}>{crewMessage}</Text> : null}
      </View>
    );
  };

  const handleStartSession = async () => {
    if (isSessionLoading) return; // Prevent double-tap

    try {
      setIsSessionLoading(true);
      const newSession = await startSession(clientId, crewSize);

      // Optimistic update - just update the active session state
      setActiveSession(newSession);
      setCrewSize(newSession.crewSize);

      // Analytics: Track session started
      try {
        if (user?.id) {
          group('provider', user.id);
          group('client', clientId);
        }

        capture(E.ACTION_SESSION_STARTED, {
          client_id: clientId,
          client_name: client?.name || '',
          crew_size: crewSize,
          hourly_rate: client?.hourlyRate || 0,
          start_time: nowIso(),
        });
      } catch (analyticsError) {
        if (__DEV__) {
          console.error('Analytics tracking failed:', analyticsError);
        }
      }

      // Silent refetch to update timeline (no full-page spinner)
      await loadData(true);

      // Show success toast
      showSuccess(t('common.sessionStarted'));
    } catch (error) {
      if (__DEV__) {
        console.error('Error starting session:', error);
      }
      Alert.alert(t('clientHistory.errorTitle'), t('clientHistory.sessionStartError'));
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession || isSessionLoading) return; // Prevent double-tap
    try {
      setIsSessionLoading(true);

      // Calculate duration before ending session
      const durationSeconds = Math.floor((Date.now() - activeSession.startTime.getTime()) / 1000);
      const durationMinutes = Math.round(durationSeconds / 60);
      const durationHours = durationSeconds / 3600;
      const finalCrewSize = activeSession?.crewSize || crewSize;
      const perPersonHours = durationHours;
      const totalPersonHours = perPersonHours * finalCrewSize;
      const totalAmount = totalPersonHours * (client?.hourlyRate || 0);

      await endSession(activeSession.id);

      // Analytics: Track session stopped and completed
      try {
        if (user?.id) {
          group('provider', user.id);
          group('client', clientId);
        }

        const sessionStartTime = activeSession.startTime.toISOString();
        const sessionEndTime = nowIso();

        // Track action event (canonical Tier-0)
        capture(E.ACTION_SESSION_STOPPED, {
          session_id: activeSession.id,
          client_id: clientId,
          total_duration_minutes: durationMinutes,
          crew_size: finalCrewSize,
          person_hours: totalPersonHours,
          hourly_rate: client?.hourlyRate || 0,
          total_amount: totalAmount,
        });

        // Track business event (canonical Tier-0)
        capture(E.BUSINESS_SESSION_COMPLETED, {
          session_id: activeSession.id,
          provider_id: user?.id || '',
          client_id: clientId,
          duration_minutes: durationMinutes,
          crew_size: finalCrewSize,
          person_hours: totalPersonHours,
          hourly_rate: client?.hourlyRate || 0,
          total_amount: totalAmount,
          start_time: sessionStartTime,
          end_time: sessionEndTime,
        });
      } catch (analyticsError) {
        if (__DEV__) {
          console.error('Analytics tracking failed:', analyticsError);
        }
      }

      // Optimistic update - clear active session
      setActiveSession(null);

      // Silent refetch to update timeline and summary
      await loadData(true);

      // Show success toast with duration
      showSuccess(`${t('common.sessionEnded')} - ${formatHours(durationHours)}`);
    } catch (error) {
      Alert.alert(t('clientHistory.errorTitle'), t('clientHistory.sessionEndError'));
    } finally {
      setIsSessionLoading(false);
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

    // Analytics: Track payment request action (per-session, canonical)
    try {
      // Emit one ACTION event per session (canonical Tier-0)
      for (const s of unpaidSessions) {
        try {
          capture(E.ACTION_PAYMENT_REQUESTED, {
            session_id: s.id,
            client_id: clientId,
            amount: s.amount || 0,
            success: true, // Set to false on failure
          });
        } catch (sessionError) {
          // Don't let one session failure block others
          if (__DEV__) {
            console.error('Analytics tracking failed for session:', s.id, sessionError);
          }
        }
      }
    } catch (analyticsError) {
      if (__DEV__) {
        console.error('Analytics tracking failed:', analyticsError);
      }
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

      // Create the payment request (this will mark sessions as 'requested' AND create activity)
      // Note: requestPayment() already creates the activity with correct personHours
      await requestPayment(clientId, unpaidSessions.map(s => s.id));

      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('✅ Payment request created successfully');
        }
      }

      // Analytics: Track business event for successful payment request (per-session, canonical)
      try {
        // Set groups before capturing events
        if (user?.id) {
          group('provider', user.id);
          group('client', clientId);
        }

        // Calculate total for optional extras
        const totalPersonHours = unpaidSessions.reduce((sum, s) => {
          const duration = s.duration || 0;
          const crew = s.crewSize || 1;
          return sum + (duration * crew);
        }, 0);

        // Emit one BUSINESS event per session (canonical Tier-0)
        for (const s of unpaidSessions) {
          try {
            capture(E.BUSINESS_PAYMENT_REQUESTED, {
              payment_request_id: `req_${s.id}`, // Deterministic ID until server-generated
              session_id: s.id,
              provider_id: user?.id || '',
              client_id: clientId,
              amount: s.amount || 0,
              requested_at: nowIso(),

              // Optional extras (tolerated by Zod drift):
              session_count: unpaidSessions.length,
              total_person_hours: totalPersonHours,
              total_amount: unpaidAmount,
            });
          } catch (sessionError) {
            // Don't let one session failure block others
            if (__DEV__) {
              console.error('Analytics tracking failed for session:', s.id, sessionError);
            }
          }
        }
      } catch (analyticsError) {
        if (__DEV__) {
          console.error('Analytics tracking failed:', analyticsError);
        }
      }

      // Close modal first
      setShowConfirmModal(false);

      // Show success message
      showSuccess(t('clientHistory.paymentRequested', { amount: formatCurrency(unpaidAmount), clientName: client?.name }));

      // Small delay to ensure activity is written to DB, then refresh
      setTimeout(async () => {
        await loadData();
      }, 500);
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

  if (loading && initialLoad) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Custom Header - always visible */}
        <View style={styles.customHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Feather name="arrow-left" size={24} color={TP.color.ink} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <TPAvatar name={client?.name || 'Loading'} size="sm" />
            <Text style={styles.headerName}>{client ? formatName(client.name) : 'Loading...'}</Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        {/* Spinner in content area */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={TP.color.ink} />
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
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Feather name="arrow-left" size={24} color={TP.color.ink} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <TPAvatar name={client.name} size="sm" />
          <Text style={styles.headerName}>{formatName(client.name)}</Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('ClientProfile', { clientId: client.id })}
          style={styles.headerButton}
        >
          <Feather name="settings" size={24} color={TP.color.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Total Outstanding Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('common.totalOutstanding')}</Text>
          <Text style={styles.summaryAmountLarge}>{formatCurrency(totalUnpaidBalance)}</Text>
          <Text style={styles.summaryHoursUnpaid}>
            {formatHours(unpaidHours + requestedHours)} {t('clientHistory.unpaid')}
          </Text>

          {(() => {
            // Pure hide/show logic for buttons and paid up state
            const hasPendingRequest = pendingRequest || moneyState?.lastPendingRequest;
            const unpaidUnrequestedCents = Math.round((totalUnpaidBalance - requestedBalance) * 100);

            // Case 1: Show Request button (enabled)
            if (!hasPendingRequest && unpaidUnrequestedCents > 0) {
              return (
                <TouchableOpacity
                  style={styles.requestPaymentButton}
                  onPress={handleRequestPayment}
                  accessibilityRole="button"
                  accessibilityLabel={`Request payment of ${formatCurrency(unpaidUnrequestedCents / 100)}`}
                >
                  <Text style={styles.requestPaymentButtonText}>
                    → {t('common.requestPayment')}
                  </Text>
                </TouchableOpacity>
              );
            }

            // Case 2: Show Paid up pill (no outstanding balance AND has work history)
            if (totalUnpaidBalance === 0 && !hasPendingRequest && totalHours > 0) {
              return (
                <View style={styles.paidUpPill}>
                  <Text style={styles.paidUpText}>{t('providerSummary.paidUp')}</Text>
                </View>
              );
            }

            // Case 3: Hide button (pending request or requested-only balance)
            return null;
          })()}
        </View>

        {/* Activity Timeline */}
        <View style={styles.timelineSection}>
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
                        // Work Session - Simplified format
                        <View style={styles.timelineCard}>
                          <View style={styles.timelineCardHeader}>
                            <Text style={styles.timelineCardTitle}>{t('clientHistory.workSession')}</Text>
                            <Text style={styles.timelineCardAmount}>
                              {item.data.endTime ? formatCurrency(item.data.amount || 0) : ''}
                            </Text>
                          </View>
                          <Text style={styles.timelineCardMeta}>
                            {(() => {
                              const session = item.data as Session;
                              const crewSize = session.crewSize || 1;
                              const start = new Date(session.startTime);
                              const startLabel = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                              if (session.endTime) {
                                const end = new Date(session.endTime);
                                const endLabel = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                                const baseDuration =
                                  session.duration ??
                                  ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
                                const personText = crewSize === 1 ? `1 ${t('common.person')}` : `${crewSize} ${t('common.person')}`;
                                return `${startLabel} - ${endLabel} • ${personText} • ${formatHours(baseDuration)}`;
                              }
                              return `${t('clientHistory.activeSince', { time: startLabel })} • ${crewSize} ${t('common.person')}`;
                            })()}
                          </Text>
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
                              {formatCurrency(item.data.data.amount || 0)} • {item.data.data.sessionCount} session{item.data.data.sessionCount > 1 ? 's' : ''} • {formatHours(item.data.data.personHours || 0)} total
                            </Text>
                          </View>
                          <View style={styles.timelineRight}>
                            <Text style={styles.timelineAmount}>
                              {translatePaymentMethod(item.data.data.method)}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        // Payment Request - Simplified format
                        <View style={styles.timelineCard}>
                          <View style={styles.timelineCardHeader}>
                            <Text style={styles.timelineCardTitle}>{t('clientHistory.paymentRequestedActivity')}</Text>
                            <Text style={styles.timelineCardAmount}>
                              {formatCurrency(item.data.data.amount || 0)}
                            </Text>
                          </View>
                          <Text style={styles.timelineCardMeta}>
                            {(() => {
                              const sessionCount = item.data.data.sessionIds?.length || 0;
                              const personHours = item.data.data.personHours || 0;
                              const sessionText = sessionCount === 1
                                ? `1 ${t('clientHistory.session')}`
                                : `${sessionCount} ${t('clientHistory.sessions')}`;
                              return `${sessionText} • ${formatHours(personHours)}`;
                            })()}
                          </Text>
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

      {/* Fixed Footer with Crew Counter and Start/Stop */}
      <View style={styles.fixedFooter}>
        <View style={styles.footerCrewCounter}>
          <Text style={styles.footerCrewLabel}>{t('clientHistory.persons')}</Text>
          <TouchableOpacity
            onPress={() => handleCrewAdjust(-1)}
            disabled={currentCrewSize <= 1 || isUpdatingCrew}
            style={[styles.footerCrewButton, (currentCrewSize <= 1 || isUpdatingCrew) && styles.footerCrewButtonDisabled]}
          >
            <Text style={styles.footerCrewButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.footerCrewValue}>{currentCrewSize}</Text>
          <TouchableOpacity
            onPress={() => handleCrewAdjust(1)}
            disabled={isUpdatingCrew}
            style={[styles.footerCrewButton, isUpdatingCrew && styles.footerCrewButtonDisabled]}
          >
            <Text style={styles.footerCrewButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={activeSession ? handleEndSession : handleStartSession}
          disabled={isSessionLoading}
          style={[
            styles.footerActionButton,
            activeSession ? styles.footerActionButtonStop : styles.footerActionButtonStart,
            isSessionLoading && styles.footerActionButtonLoading
          ]}
        >
          {isSessionLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.footerActionButtonText}>
              {activeSession
                ? `${t('common.stop')} - ${formatHours(sessionTime / 3600)}`
                : t('common.start')
              }
            </Text>
          )}
        </TouchableOpacity>
      </View>

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

  // Custom Header Styles
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x12,
    borderBottomWidth: 1,
    borderBottomColor: TP.color.divider,
    backgroundColor: TP.color.cardBg,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: TP.spacing.x8,
  },
  headerName: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
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
    paddingBottom: 80, // Extra padding for fixed footer
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
  activeSessionPrompt: {
    marginTop: 12,
    fontSize: theme.font.body,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 16,
  },
  sessionActionButton: {
    marginTop: 16,
    width: '100%',
  },
  activeSessionMeta: {
    marginTop: 16,
    gap: 4,
  },
  activeSessionMetaText: {
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  crewSelector: {
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  crewLabel: {
    fontSize: theme.font.body,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    marginBottom: 8,
  },
  crewStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  crewButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.color.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.cardBg,
  },
  crewButtonDisabled: {
    opacity: 0.4,
  },
  crewButtonText: {
    fontSize: 24,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
  },
  crewValue: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: theme.font.title,
    fontWeight: '600',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
  },
  crewHint: {
    marginTop: 8,
    fontSize: theme.font.small,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  crewMessage: {
    marginTop: 4,
    fontSize: theme.font.small,
    color: theme.color.primary,
    fontFamily: theme.typography.fontFamily.primary,
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
  btnRequestPayment: {
    backgroundColor: TP.color.cardBg, // White
    borderWidth: 1,
    borderColor: TP.color.ink, // Black
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
  btnRequestPaymentText: {
    color: TP.color.ink, // Black text
  },
  btnDisabled: {
    backgroundColor: theme.color.btnDisabledBg,
    borderColor: theme.color.btnDisabledBorder,
  },
  btnDisabledText: {
    color: theme.color.btnDisabledText,
  },

  // Summary card styles (Total Outstanding)
  summaryCard: {
    paddingHorizontal: TP.spacing.x20,
    paddingVertical: TP.spacing.x20,
    borderWidth: 1,
    borderColor: TP.color.divider,
    borderRadius: TP.radius.card,
    backgroundColor: TP.color.cardBg,
    marginTop: TP.spacing.x16,
    marginBottom: TP.spacing.x24,
    gap: TP.spacing.x12,
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
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x4,
  },
  summaryAmountLarge: {
    fontSize: 48,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
    lineHeight: 56,
  },
  summaryHoursUnpaid: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x8,
  },
  requestPaymentButton: {
    backgroundColor: TP.color.cardBg,
    borderWidth: 1,
    borderColor: TP.color.ink,
    borderRadius: TP.radius.button,
    paddingVertical: TP.spacing.x12,
    paddingHorizontal: TP.spacing.x16,
    alignSelf: 'flex-start',
  },
  requestPaymentButtonText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
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
    marginTop: TP.spacing.x8,
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
  // New simplified timeline card styles
  timelineCard: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    borderWidth: 1,
    borderColor: TP.color.divider,
    padding: TP.spacing.x16,
    marginBottom: TP.spacing.x8,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TP.spacing.x8,
  },
  timelineCardTitle: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  timelineCardAmount: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  timelineCardMeta: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.regular,
    color: TP.color.textSecondary,
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
    paddingHorizontal: 16,
    marginBottom: 4,
    marginTop: 16,
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

  // Fixed Footer Styles
  fixedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x12,
    backgroundColor: TP.color.cardBg,
    borderTopWidth: 1,
    borderTopColor: TP.color.divider,
    gap: TP.spacing.x12,
  },
  footerCrewCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TP.spacing.x8,
  },
  footerCrewLabel: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
  },
  footerCrewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TP.color.appBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TP.color.divider,
  },
  footerCrewButtonDisabled: {
    opacity: 0.4,
  },
  footerCrewButtonText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  footerCrewValue: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    minWidth: 24,
    textAlign: 'center',
  },
  footerActionButton: {
    paddingVertical: TP.spacing.x12,
    paddingHorizontal: TP.spacing.x24,
    borderRadius: TP.radius.button,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerActionButtonStart: {
    backgroundColor: TP.color.ink, // Black
  },
  footerActionButtonStop: {
    backgroundColor: TP.color.btn.dangerBg, // Red
  },
  footerActionButtonLoading: {
    opacity: 0.7,
  },
  footerActionButtonText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.cardBg, // White text
  },
});
