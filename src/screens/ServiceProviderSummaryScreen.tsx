import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Session, ActivityItem } from '../types';
import { Button } from '../components/Button';
import { StatusPill } from '../components/StatusPill';
import { MarkAsPaidModal } from '../components/MarkAsPaidModal';
import { theme } from '../styles/theme';
import {
  getCurrentUser,
  getClientSessionsForProvider,
  getActivities,
} from '../services/storageService';

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

  const loadData = async () => {
    try {
      console.log('🔍 ServiceProviderSummaryScreen: Loading data for providerId:', providerId);

      const user = await getCurrentUser();
      console.log('👤 Current user:', user);
      setCurrentUser(user || 'Client');

      // Get sessions for this client with the provider
      console.log('📊 Fetching sessions for user:', user, 'with provider:', providerId);
      const userSessions = await getClientSessionsForProvider(user || '', providerId);
      console.log('📊 Sessions received:', userSessions.length, 'sessions');
      console.log('📊 Session details:', userSessions.map(s => ({
        id: s.id.substring(0, 8) + '...',
        clientId: s.clientId?.substring(0, 8) + '...',
        providerId: s.providerId?.substring(0, 8) + '...',
        status: s.status,
        amount: s.amount
      })));

      // Get activities for this client - need to use the client record ID, not auth user ID
      const activitiesData = await getActivities();
      console.log('🔍 All activities:', activitiesData.length);

      // Get the client record ID from the first session (since we know sessions are filtered correctly)
      const clientRecordId = userSessions.length > 0 ? userSessions[0].clientId : null;
      console.log('🔍 Looking for activities with clientId:', clientRecordId);

      const clientActivities = activitiesData.filter(a => {
        console.log('🔍 Activity:', a.id, 'clientId:', a.clientId, 'type:', a.type);
        return a.clientId === clientRecordId;
      });
      console.log('🔍 Filtered client activities:', clientActivities.length);
      setActivities(clientActivities);

      // Calculate unpaid amounts
      const unpaidSessions = userSessions.filter(session =>
        session.status === 'unpaid' || session.status === 'requested'
      );
      console.log('💰 Unpaid sessions:', unpaidSessions.length);

      const unpaidHoursTotal = unpaidSessions.reduce((total, session) => total + (session.duration || 0), 0);
      const unpaidBalanceTotal = unpaidSessions.reduce((total, session) => total + (session.amount || 0), 0);
      console.log('💰 Totals - Hours:', unpaidHoursTotal, 'Balance:', unpaidBalanceTotal);

      setSessions(userSessions);
      setUnpaidHours(unpaidHoursTotal);
      setUnpaidBalance(unpaidBalanceTotal);
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
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.providerName}>{providerName}</Text>
        <Text style={styles.subtitle}>Work Summary</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Key Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, theme.shadows.card]}>
            <Text style={styles.statLabel}>Unpaid Amount</Text>
            <Text style={styles.statUnpaid}>
              {formatCurrency(unpaidBalance)}
            </Text>
          </View>

          <View style={[styles.statCard, theme.shadows.card]}>
            <Text style={styles.statLabel}>Unpaid Hours</Text>
            <Text style={styles.statUnpaidHours}>
              {formatHours(unpaidHours)}
            </Text>
          </View>
        </View>

        {/* Mark as Paid Button */}
        {unpaidBalance > 0 && (
          <View style={styles.actionButtonContainer}>
            <Button
              title={`Mark ${formatCurrency(unpaidBalance)} as Paid`}
              onPress={handleMarkAsPaid}
              variant="success"
              size="lg"
              style={styles.markAsPaidButton}
            />
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
                        Payment Sent
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
  providerName: {
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
    minWidth: '47%',
  },
  statLabel: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
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
  actionButtonContainer: {
    marginBottom: theme.spacing.xl,
  },
  markAsPaidButton: {
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