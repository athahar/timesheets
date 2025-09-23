import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Session, ActivityItem } from '../types';
import { StatusPill } from '../components/StatusPill';
import { MarkAsPaidModal } from '../components/MarkAsPaidModal';
import { IOSHeader } from '../components/IOSHeader';
import { theme } from '../styles/theme';
import {
  getCurrentUser,
  getClientSessionsForProvider,
  getActivities,
  getClientMoneyState,
  getPendingPaymentRequest,
  getSessionsByClient,
} from '../services/storageService';
import { supabase } from '../services/supabase';
import { formatDate } from '../utils/formatters';

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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [unpaidHours, setUnpaidHours] = useState(0);
  const [unpaidBalance, setUnpaidBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  const loadData = async () => {
    try {
      if (__DEV__) {
        console.log('🔍 ServiceProviderSummaryScreen: Loading data for providerId:', providerId);
      }

      const user = await getCurrentUser();
      if (__DEV__) {
        console.log('👤 Current user:', user);
      }
      setCurrentUser(user || 'Client');

      // Get sessions for this client with the provider
      if (__DEV__) {
        console.log('📊 Fetching sessions for user:', user, 'with provider:', providerId);
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
              console.log('🔧 Using direct session lookup for consistency. ClientId:', clientRecord.id);
              console.log('🔧 Found sessions:', userSessions.length);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Direct session lookup failed, falling back to original method');
        userSessions = await getClientSessionsForProvider(user || '', providerId);
      }
      if (__DEV__) {
        console.log('📊 Sessions received:', userSessions.length, 'sessions');
      }

      // Get activities for this client - need to use the client record ID, not auth user ID
      const activitiesData = await getActivities();
      if (__DEV__) {
        console.log('🔍 All activities:', activitiesData.length);
      }

      // Get the client record ID from the first session (since we know sessions are filtered correctly)
      const clientRecordId = userSessions.length > 0 ? userSessions[0].clientId : null;
      if (__DEV__) {
        console.log('🔍 Looking for activities with clientId:', clientRecordId);
      }

      const clientActivities = activitiesData.filter(a => {
        if (__DEV__) {
          console.log('🔍 Activity:', a.id, 'clientId:', a.clientId, 'type:', a.type);
        }
        return a.clientId === clientRecordId;
      });
      if (__DEV__) {
        console.log('🔍 Filtered client activities:', clientActivities.length);
      }
      setActivities(clientActivities);

      // Get money state from client perspective (includes requested amounts)
      if (__DEV__) {
        console.log('💰 Getting client money state for clientId:', clientRecordId);
      }

      let moneyState = { balanceDueCents: 0, unpaidDurationSec: 0, hasActiveSession: false };
      if (clientRecordId) {
        try {
          moneyState = await getClientMoneyState(clientRecordId, providerId);
          if (__DEV__) {
            console.log('💰 Client money state:', moneyState);
          }
        } catch (error) {
          console.warn('⚠️ Error getting client money state:', error);
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
        console.log('💰 Final balance due:', balanceDue, 'unpaid hours:', unpaidHoursTotal);
      }
    } catch (error) {
      console.error('Error loading provider summary:', error);
    } finally {
      setLoading(false);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
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
        if (__DEV__) { console.warn('Invalid timestamp in timeline item:', item.timestamp); }
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
          <Text style={styles.loadingText}>Loading Provider Summary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <IOSHeader
        title={providerName}
        subtitle="Work Summary"
        leftAction={{
          title: "Back",
          onPress: () => navigation.goBack(),
        }}
        largeTitleStyle="always"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card - Responsive like provider side */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryBalanceRow}>
            <Text style={styles.summaryLabel}>Balance due: </Text>
            <Text style={[styles.summaryAmount, unpaidBalance === 0 && styles.summaryAmountPaid]}>{formatCurrency(unpaidBalance)}</Text>
            {unpaidBalance > 0 && (
              <Text style={styles.summaryHours}> [{formatHours(unpaidHours)}]</Text>
            )}
          </View>

          {unpaidBalance > 0 ? (
            <View style={styles.summaryButtonRow}>
              <Pressable
                style={styles.recordPaymentButton}
                onPress={() => setShowMarkAsPaidModal(true)}
              >
                <Text style={styles.recordPaymentButtonText}>Record Payment</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.summaryButtonRow}>
              <View style={styles.paidUpPill}>
                <Text style={styles.paidUpText}>Paid up</Text>
              </View>
            </View>
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
                  dayLabel = 'Today';
                } else if (isYesterday) {
                  dayLabel = 'Yesterday';
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
                        // Work Session Line - Simplified
                        <View style={styles.timelineLine}>
                          <Text style={styles.timelineIcon}>🕒</Text>
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineMainText}>
                              Work session
                            </Text>
                            <Text style={styles.timelineSubText}>
                              {item.data.endTime
                                ? (() => {
                                    const durationMs = new Date(item.data.endTime).getTime() - new Date(item.data.startTime).getTime();
                                    const hours = Math.floor(durationMs / (1000 * 60 * 60));
                                    const minutes = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                                    const startTime = new Date(item.data.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                                    const endTime = new Date(item.data.endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                                    return `${hours}hr${minutes > 0 ? ` ${minutes}min` : ''} • ${startTime}-${endTime}`;
                                  })()
                                : (() => {
                                    const startTime = new Date(item.data.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
                                    return `Active session • Started at ${startTime}`;
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
                              Payment sent
                            </Text>
                            <Text style={styles.timelineSubText}>
                              {formatCurrency(item.data.data.amount || 0)} • {item.data.data.sessionCount} session{item.data.data.sessionCount > 1 ? 's' : ''}
                            </Text>
                          </View>
                          <View style={styles.timelineRight}>
                            <Text style={styles.timelineAmount}>
                              {item.data.data.method}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        // Payment Request Line - New for client view
                        <View style={styles.timelineLine}>
                          <Text style={styles.timelineIcon}>📋</Text>
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineMainText}>
                              Payment requested
                            </Text>
                            <Text style={styles.timelineSubText}>
                              {formatCurrency(item.data.data.amount || 0)} • {item.data.data.sessionCount} session{item.data.data.sessionCount > 1 ? 's' : ''}
                            </Text>
                          </View>
                          <View style={styles.timelineRight}>
                            <Text style={styles.timelineAmount}>
                              Pending
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
    backgroundColor: '#F8F9FB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'System',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#22C55E',
    fontFamily: 'System',
  },
  providerName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'System',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    minWidth: '47%',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: 'System',
  },
  statUnpaid: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
    fontFamily: 'System',
    fontVariant: ['tabular-nums'],
  },
  statUnpaidHours: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
    fontFamily: 'System',
  },
  actionButtonContainer: {
    marginBottom: 32,
  },
  markAsPaidButton: {
    width: '100%',
  },
  timelineSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    fontFamily: 'System',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'System',
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
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    fontFamily: 'System',
    marginBottom: 2,
  },
  timelineSubText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'System',
  },
  timelineRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timelineAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'System',
    fontVariant: ['tabular-nums'],
  },
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
  // Summary card styles - matching provider design
  summaryCard: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#FFF',
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
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
    gap: 16,
  },
  summaryCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'System',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
    fontFamily: 'System',
    fontVariant: ['tabular-nums'],
  },
  summaryAmountPaid: {
    color: '#22C55E',
  },
  summaryHours: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: 'System',
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  recordPaymentButton: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recordPaymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  paidUpPill: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  paidUpText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
});