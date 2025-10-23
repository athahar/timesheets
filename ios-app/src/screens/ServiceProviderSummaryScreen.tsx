import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Session, ActivityItem } from '../types';
import { StatusPill } from '../components/StatusPill';
import { MarkAsPaidModal } from '../components/MarkAsPaidModal';
import { TPHeader } from '../components/v2/TPHeader';
import { TP } from '../styles/themeV2';
import {
  getCurrentUser,
  getClientSessionsForProvider,
  getActivities,
  getClientMoneyState,
  getPendingPaymentRequest,
  getSessionsByClient,
} from '../services/storageService';
import { supabase } from '../services/supabase';
import { formatDate, formatCurrency as formatCurrencyLocal } from '../utils/localeFormatters';
import { simpleT, translatePaymentMethod } from '../i18n/simple';
import { moneyFormat } from '../utils/money';
import { useLocale } from '../hooks/useLocale';
import { trackEvent } from '../services/analytics';
import { dedupeEventOnce } from '../services/analytics/dedupe';

interface ServiceProviderSummaryScreenProps {
  route: {
    params: {
      providerId: string;
      providerName: string;
    };
  };
  navigation: any;
}

export const ServiceProviderSummaryScreen: React.FC<ServiceProviderSummaryScreenProps> = ({
  route,
  navigation,
}) => {
  const { providerId, providerName } = route.params;
  const { locale } = useLocale();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [unpaidHours, setUnpaidHours] = useState(0);
  const [unpaidBalance, setUnpaidBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const loadingRef = useRef<boolean>(false); // Debounce guard for loadData

  // Track screen view on mount
  useEffect(() => {
    if (dedupeEventOnce('client.provider_detail.viewed')) {
      trackEvent('client.provider_detail.viewed', {
        providerId,
        providerName,
        unpaidBalance,
      });
    }
  }, []);

  const loadData = async () => {
    // Debounce guard: prevent concurrent calls
    if (loadingRef.current) {
      if (__DEV__) console.log('🚫 loadData: already loading, skipping duplicate call');
      return;
    }

    loadingRef.current = true;
    try {
      if (__DEV__) {
        if (__DEV__) console.log('🔍 ServiceProviderSummaryScreen: Loading data for providerId:', providerId);
      }

      const user = await getCurrentUser();
      if (__DEV__) {
        if (__DEV__) console.log('👤 Current user:', user);
      }
      setCurrentUser(user || 'Client');

      // Get sessions for this client with the provider
      if (__DEV__) {
        if (__DEV__) console.log('📊 Fetching sessions for user:', user, 'with provider:', providerId);
      }

      // TEMP FIX: Use direct session lookup to match provider-side data
      // TODO: Fix getClientSessionsForProvider to return consistent data
      let userSessions = [];
      try {
        // Get current user's client record ID from auth
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const { data: clientRecord } = await supabase.from('trackpay_users')
            .select('id')
            .eq('auth_user_id', currentUser.id)
            .eq('role', 'client')
            .single();

          if (clientRecord) {
            // Use same data loading as provider side for consistency
            userSessions = await getSessionsByClient(clientRecord.id);
            if (__DEV__) {
                    if (__DEV__) {
                if (__DEV__) console.log('🔧 Using direct session lookup for consistency. ClientId:', clientRecord.id);
                if (__DEV__) console.log('🔧 Found sessions:', userSessions.length);
              }
            }
          }
        }
      } catch (error) {
        if (__DEV__) {
          if (__DEV__) {
            if (__DEV__) console.warn('⚠️ Direct session lookup failed, falling back to original method');
          }
        }
        userSessions = await getClientSessionsForProvider(user || '', providerId);
      }
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('📊 Sessions received:', userSessions.length, 'sessions');
        }
      }

      // Get activities for this client - need to use the client record ID, not auth user ID
      const activitiesData = await getActivities();
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('🔍 All activities:', activitiesData.length);
        }
      }

      // Get the client record ID from the first session (since we know sessions are filtered correctly)
      const clientRecordId = userSessions.length > 0 ? userSessions[0].clientId : null;
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('🔍 Looking for activities with clientId:', clientRecordId);
        }
      }

      const clientActivities = activitiesData.filter(a => {
        if (__DEV__) {
          if (__DEV__) {
            if (__DEV__) console.log('🔍 Activity:', a.id, 'clientId:', a.clientId, 'type:', a.type);
          }
        }
        return a.clientId === clientRecordId;
      });
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('🔍 Filtered client activities:', clientActivities.length);
        }
      }
      setActivities(clientActivities);

      // Get money state from client perspective (includes requested amounts)
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('💰 Getting client money state for clientId:', clientRecordId);
        }
      }

      let moneyState = { balanceDueCents: 0, unpaidDurationSec: 0, hasActiveSession: false };
      if (clientRecordId) {
        try {
          moneyState = await getClientMoneyState(clientRecordId, providerId);
          if (__DEV__) {
            if (__DEV__) {
              if (__DEV__) console.log('💰 Client money state:', moneyState);
            }
          }
        } catch (error) {
          if (__DEV__) {
            if (__DEV__) {
              if (__DEV__) console.warn('⚠️ Error getting client money state:', error);
            }
          }
        }
      }

      // Convert cents to dollars and seconds to hours
      const balanceDue = moneyState.balanceDueCents / 100;
      const unpaidHoursTotal = moneyState.unpaidDurationSec / 3600;

      setSessions(userSessions);
      setUnpaidHours(unpaidHoursTotal);
      setUnpaidBalance(balanceDue);
      setHasActiveSession(moneyState.hasActiveSession);

      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('💰 Final balance due:', balanceDue, 'unpaid hours:', unpaidHoursTotal);
        }
      }
    } catch (error) {
      console.error('Error loading provider summary:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false; // Reset debounce guard
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [providerId])
  );

  // Listen for screen dimension changes
  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  const handleMarkAsPaid = () => {
    setShowMarkAsPaidModal(true);
  };

  const handlePaymentCompleted = () => {
    setShowMarkAsPaidModal(false);
    loadData(); // Refresh data after payment
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatHours = (totalHours: number) => {
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours % 1) * 60);
    if (hours === 0) {
      return `${minutes}min`;
    }
    return minutes > 0 ? `${hours}hr ${minutes}min` : `${hours}hr`;
  };


  const formatTimeRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const startStr = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    const endStr = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    return `${startStr}–${endStr}`;
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}hr${minutes > 0 ? ` ${minutes}min` : ''}`;
  };

  // Check if screen is wide enough for inline layout
  const isWideLayout = screenWidth >= 380;

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
        .filter(a => a.type === 'payment_completed' || a.type === 'payment_request_created')
        .map(activity => ({
          type: activity.type === 'payment_completed' ? 'payment' as const : 'payment_request' as const,
          id: activity.id,
          timestamp: activity.data.paymentDate ? new Date(activity.data.paymentDate) : activity.timestamp,
          data: activity
        }))
    ];

    // Sort by timestamp (most recent first)
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }, [sessions, activities]);

  // Group timeline items by day for cleaner presentation
  const groupedTimeline = useMemo(() => {
    const groups: { [key: string]: typeof timelineItems } = {};

    timelineItems.slice(0, 20).forEach(item => {
      const date = new Date(item.timestamp);

      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        if (__DEV__) { if (__DEV__) console.warn('Invalid timestamp in timeline item:', item.timestamp); }
        return; // Skip this item
      }

      // Use same date formatting as provider side for consistency
      const dayKey = formatDate(date).replace(/\s/g, '-'); // Convert "Sep 23, 2025" to "Sep-23,-2025"

      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [timelineItems]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{simpleT('providerSummary.loadingProviderSummary')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TPHeader
        title={providerName}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card - Responsive like provider side */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryBalanceRow}>
            <Text style={styles.summaryLabel}>{simpleT('providerSummary.balanceDue')}</Text>
            <Text style={[styles.summaryAmount, unpaidBalance === 0 && styles.summaryAmountPaid]}>{moneyFormat(unpaidBalance * 100, 'USD', locale)}</Text>
            {unpaidBalance > 0 && (
              <Text style={styles.summaryHours}> [{formatHours(unpaidHours)} person-hours]</Text>
            )}
          </View>

          {unpaidBalance > 0 ? (
            <View style={styles.summaryButtonRow}>
              <Pressable
                style={styles.recordPaymentButton}
                onPress={() => setShowMarkAsPaidModal(true)}
              >
                <Text style={styles.recordPaymentButtonText}>{simpleT('providerSummary.recordPayment')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.summaryButtonRow}>
              <View style={styles.paidUpPill}>
                <Text style={styles.paidUpText}>{simpleT('providerSummary.paidUp')}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Activity Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>{simpleT('providerSummary.activityTimeline')}</Text>

          {timelineItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{simpleT('providerSummary.noActivity')}</Text>
              <Text style={styles.emptyStateSubtext}>
                {simpleT('providerSummary.noActivitySubtext')}
              </Text>
            </View>
          ) : (
            groupedTimeline.map(([dayKey, dayItems]) => {
              // Get date from first item in group instead of parsing formatted string
              const firstItem = dayItems[0];
              const date = new Date(firstItem.timestamp);

              // Check if date is valid
              let dayLabel;
              if (isNaN(date.getTime())) {
                dayLabel = 'Invalid Date';
              } else {
                const isToday = date.toDateString() === new Date().toDateString();
                const isYesterday = date.toDateString() === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

                if (isToday) {
                  dayLabel = simpleT('date.today');
                } else if (isYesterday) {
                  dayLabel = simpleT('date.yesterday');
                } else {
                  // Use consistent formatting with provider side
                  dayLabel = formatDate(date);
                }
              }

              return (
                <View key={dayKey}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayHeaderText}>{dayLabel}</Text>
                  </View>

                  {dayItems.map((item, index) => (
                    <View key={item.id} style={styles.timelineItem}>
                      {item.type === 'session' ? (
                        // Work Session Line with crew context
                        <View style={styles.timelineLine}>
                          <Text style={styles.timelineIcon}>🕒</Text>
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineMainText}>
                              {simpleT('providerSummary.workSession')}
                            </Text>
                            <Text style={styles.timelineSubText}>
                              {(() => {
                                const session = item.data as Session;
                                const crewSize = session.crewSize || 1;
                                const crewText = crewSize === 1 ? '1 person' : `${crewSize} people`;
                                const start = new Date(session.startTime);
                                const startLabel = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                                if (session.endTime) {
                                  const end = new Date(session.endTime);
                                  const endLabel = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                                  const baseDuration =
                                    session.duration ??
                                    ((end.getTime() - start.getTime()) / (1000 * 60 * 60));
                                  const totalPersonHours =
                                    session.personHours ?? baseDuration * crewSize;
                                  return `${crewText} × ${formatHours(baseDuration)} = ${formatHours(totalPersonHours)} • ${startLabel}-${endLabel}`;
                                }
                                return `${crewText} • active since ${startLabel}`;
                              })()}
                            </Text>
                          </View>
                          <View style={styles.timelineRight}>
                            <Text style={styles.timelineAmount}>
                              {item.data.endTime ? moneyFormat((item.data.amount || 0) * 100, 'USD', locale) : ''}
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
                              {simpleT('providerSummary.paymentSent')}
                            </Text>
                            <Text style={styles.timelineSubText}>
                              {moneyFormat((item.data.data.amount || 0) * 100, 'USD', locale)} • {item.data.data.sessionCount} {item.data.data.sessionCount > 1 ? simpleT('providerSummary.sessions') : simpleT('providerSummary.session')} • {formatHours(item.data.data.personHours || 0)} total
                            </Text>
                          </View>
                          <View style={styles.timelineRight}>
                            <Text style={styles.timelineAmount}>
                              {translatePaymentMethod(item.data.data.method)}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        // Payment Request Line - New for client view
                        <View style={styles.timelineLine}>
                          <Text style={styles.timelineIcon}>📋</Text>
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineMainText}>
                              {simpleT('providerSummary.paymentRequested')}
                            </Text>
                            <Text style={styles.timelineSubText}>
                              {moneyFormat((item.data.data.amount || 0) * 100, 'USD', locale)} • {item.data.data.sessionCount} {item.data.data.sessionCount > 1 ? simpleT('providerSummary.sessions') : simpleT('providerSummary.session')} • {formatHours(item.data.data.personHours || 0)} total
                            </Text>
                          </View>
                          <View style={styles.timelineRight}>
                            <Text style={styles.timelineAmount}>
                              {simpleT('providerSummary.pending')}
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

      {/* Mark as Paid Modal */}
      <MarkAsPaidModal
        visible={showMarkAsPaidModal}
        onClose={() => setShowMarkAsPaidModal(false)}
        onPaymentCompleted={handlePaymentCompleted}
        unpaidAmount={unpaidBalance}
        providerName={providerName}
        sessions={sessions.filter(s => s.status === 'unpaid' || s.status === 'requested')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TP.color.appBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: TP.font.body,
    color: TP.color.textSecondary,
  },
  header: {
    paddingHorizontal: TP.spacing.x16,
    paddingTop: TP.spacing.x8,
    paddingBottom: TP.spacing.x32,
  },
  backButton: {
    marginBottom: TP.spacing.x16,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: TP.weight.medium,
    color: TP.color.ink,
  },
  providerName: {
    fontSize: 24,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  subtitle: {
    fontSize: TP.font.footnote,
    color: TP.color.textSecondary,
    marginTop: TP.spacing.x4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: TP.spacing.x16,
    paddingBottom: 48,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TP.spacing.x12,
    marginBottom: TP.spacing.x32,
  },
  statCard: {
    flex: 1,
    backgroundColor: TP.color.cardBg,
    borderWidth: 1,
    borderColor: TP.color.border,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x16,
    minWidth: '47%',
  },
  statLabel: {
    fontSize: TP.font.footnote,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x8,
  },
  statUnpaid: {
    fontSize: 24,
    fontWeight: TP.weight.bold,
    color: '#EF4444',
    fontVariant: ['tabular-nums'],
  },
  statUnpaidHours: {
    fontSize: 24,
    fontWeight: TP.weight.bold,
    color: '#EF4444',
  },
  actionButtonContainer: {
    marginBottom: TP.spacing.x32,
  },
  markAsPaidButton: {
    width: '100%',
  },
  timelineSection: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x16,
    ...Platform.select({
      ios: TP.shadow.card.ios,
      android: TP.shadow.card.android,
    }),
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x16,
  },
  emptyState: {
    padding: TP.spacing.x32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x8,
  },
  emptyStateSubtext: {
    fontSize: TP.font.footnote,
    color: TP.color.textSecondary,
    textAlign: 'center',
  },
  timelineItem: {
    marginBottom: TP.spacing.x12,
  },
  timelineLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: TP.spacing.x8,
  },
  timelineIcon: {
    fontSize: 20,
    marginRight: TP.spacing.x12,
    width: 24,
    textAlign: 'center',
  },
  timelineContent: {
    flex: 1,
    marginRight: TP.spacing.x12,
  },
  timelineMainText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.medium,
    color: TP.color.ink,
    marginBottom: 2,
  },
  timelineSubText: {
    fontSize: TP.font.footnote,
    color: TP.color.textSecondary,
  },
  timelineRight: {
    alignItems: 'flex-end',
    gap: TP.spacing.x4,
  },
  timelineAmount: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    fontVariant: ['tabular-nums'],
  },
  dayHeader: {
    paddingVertical: TP.spacing.x12,
    paddingHorizontal: TP.spacing.x16,
    borderBottomWidth: 1,
    borderBottomColor: TP.color.border,
    marginBottom: TP.spacing.x8,
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: TP.weight.semibold,
    color: '#374151',
  },
  // Summary card styles - matching provider design
  summaryCard: {
    paddingHorizontal: TP.spacing.x20,
    paddingVertical: TP.spacing.x16,
    borderRadius: TP.radius.card,
    backgroundColor: TP.color.cardBg,
    gap: TP.spacing.x12,
    marginTop: TP.spacing.x16,
    marginBottom: TP.spacing.x32,
    ...Platform.select({
      ios: TP.shadow.card.ios,
      android: TP.shadow.card.android,
    }),
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
    flexDirection: 'column',
    gap: TP.spacing.x16,
  },
  summaryCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: TP.spacing.x16,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  summaryLabel: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.medium,
    color: '#374151',
  },
  summaryAmount: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.bold,
    color: '#EF4444',
    fontVariant: ['tabular-nums'],
  },
  summaryAmountPaid: {
    color: '#22C55E',
  },
  summaryHours: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  recordPaymentButton: {
    backgroundColor: TP.color.ink,
    borderRadius: TP.radius.button,
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x8,
  },
  recordPaymentButtonText: {
    color: TP.color.cardBg,
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
  },
  paidUpPill: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: TP.spacing.x16,
    paddingHorizontal: TP.spacing.x12,
    paddingVertical: TP.spacing.x8 - 2,
  },
  paidUpText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: TP.weight.semibold,
  },
});
