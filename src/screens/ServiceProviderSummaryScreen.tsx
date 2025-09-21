import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Session } from '../types';
import { Button } from '../components/Button';
import { StatusPill } from '../components/StatusPill';
import { MarkAsPaidModal } from '../components/MarkAsPaidModal';
import { theme } from '../styles/theme';
import {
  getCurrentUser,
  getClientSessionsForProvider,
} from '../services/storage';

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
  const [unpaidHours, setUnpaidHours] = useState(0);
  const [unpaidBalance, setUnpaidBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');

  const loadData = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user || 'Client');

      // Get sessions for this client with the provider
      const userSessions = await getClientSessionsForProvider(user || '', providerId);

      // Calculate unpaid amounts
      const unpaidSessions = userSessions.filter(session =>
        session.status === 'unpaid' || session.status === 'requested'
      );

      const unpaidHoursTotal = unpaidSessions.reduce((total, session) => total + (session.duration || 0), 0);
      const unpaidBalanceTotal = unpaidSessions.reduce((total, session) => total + (session.amount || 0), 0);

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

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}hr ${m}min`;
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

        {/* Sessions History */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Recent Work Sessions</Text>

          {sessions.length === 0 ? (
            <View style={[styles.emptyState, theme.shadows.card]}>
              <Text style={styles.emptyStateText}>No work sessions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Work sessions will appear here
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
    backgroundColor: '#E5E5E7',
    marginHorizontal: 0,
  },
});