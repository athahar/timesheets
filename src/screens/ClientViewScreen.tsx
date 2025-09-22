import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityItem, Client, PaymentMethod, Session } from '../types';
import { Button } from '../components/Button';
import { theme } from '../styles/theme';
import {
  getActivities,
  getClients,
  markPaid,
  getSessionsByClient,
} from '../services/storageService';

export const ClientViewScreen: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'zelle', label: 'Zelle' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'other', label: 'Other' },
  ];

  const loadData = async () => {
    try {
      const [activitiesData, clientsData] = await Promise.all([
        getActivities(),
        getClients(),
      ]);

      if (__DEV__) {

        console.log('🔍 DEBUG: Total activities loaded:', activitiesData.length);

      }
      if (__DEV__) {
        console.log('🔍 DEBUG: Activity types:', activitiesData.map(a => a.type));
        console.log('🔍 DEBUG: Payment activities:', activitiesData.filter(a => a.type === 'payment_completed'));
      }

      setActivities(activitiesData);
      setClients(clientsData);

      // Load all sessions from all clients for the timeline
      const allSessions: Session[] = [];
      for (const client of clientsData) {
        const clientSessions = await getSessionsByClient(client.id);
        allSessions.push(...clientSessions);
      }
      setSessions(allSessions);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );


  const handlePaymentRequest = (activity: ActivityItem) => {
    if (activity.type === 'payment_request') {
      setSelectedActivity(activity);
      setPaymentAmount(activity.data.amount?.toString() || '');
      setShowPaymentModal(true);
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedActivity) return;

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    try {
      // Get unpaid sessions for this client
      const sessions = await getSessionsByClient(selectedActivity.clientId);
      const unpaidSessions = sessions.filter(session => session.status === 'unpaid');

      if (unpaidSessions.length === 0) {
        Alert.alert('Error', 'No unpaid sessions found');
        return;
      }

      await markPaid(
        selectedActivity.clientId,
        unpaidSessions.map(s => s.id),
        amount,
        paymentMethod
      );

      setShowPaymentModal(false);
      setSelectedActivity(null);
      setPaymentAmount('');
      loadData(); // Refresh data

      Alert.alert('Success', 'Payment marked as completed');
    } catch (error) {
      console.error('Error marking payment:', error);
      Alert.alert('Failed to mark payment as completed');
    }
  };

  const getClientById = (id: string) => {
    return clients.find(client => client.id === id) || null;
  };

  // Combine sessions and payment activities into unified timeline - memoized for performance
  const timelineItems = useMemo(() => {
    const items = [
      // Map sessions to timeline items
      ...sessions.map(session => ({
        type: 'session' as const,
        id: session.id,
        timestamp: session.endTime || session.startTime,
        clientId: session.clientId,
        data: session
      })),
      // Map payment activities to timeline items
      ...activities
        .filter(a => a.type === 'payment_completed')
        .map(activity => ({
          type: 'payment' as const,
          id: activity.id,
          timestamp: activity.data.paymentDate ? new Date(activity.data.paymentDate) : activity.timestamp,
          clientId: activity.clientId,
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
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Activity Timeline</Text>
        <Text style={styles.subtitle}>
          Updates from your service provider
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Activity Timeline */}
        <View style={styles.timelineSection}>
          {timelineItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No activity yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Activity will appear here when your service provider starts working
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
                      <Text style={styles.timelineClientText}>
                        {getClientById(item.clientId)?.name || 'Unknown Client'}
                      </Text>
                    </View>
                    <View style={styles.timelineRight}>
                      <Text style={styles.timelineAmount}>
                        {item.data.endTime ? formatCurrency(item.data.amount || 0) : 'Active'}
                      </Text>
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
                      <Text style={styles.timelineClientText}>
                        to {getClientById(item.clientId)?.name || 'Unknown Client'}
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

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark Payment</Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Amount */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>
                  Payment Amount
                </Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputRow}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      placeholder="Enter amount paid"
                      placeholderTextColor="#86868B"
                      keyboardType="numeric"
                      style={styles.textInput}
                    />
                  </View>
                </View>
                <Text style={styles.formHelperText}>
                  You can enter a partial payment amount
                </Text>
              </View>

              {/* Payment Method */}
              <View style={styles.formField}>
                <Text style={styles.formLabel}>
                  Payment Method
                </Text>
                <View style={styles.methodsContainer}>
                  {paymentMethods.map((method) => (
                    <TouchableOpacity
                      key={method.value}
                      onPress={() => setPaymentMethod(method.value)}
                      style={[
                        styles.methodButton,
                        paymentMethod === method.value && styles.methodButtonSelected
                      ]}
                    >
                      <Text style={[
                        styles.methodButtonText,
                        paymentMethod === method.value && styles.methodButtonTextSelected
                      ]}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Mark as Paid Button */}
            <View style={styles.modalButtonContainer}>
              <Button
                title="Mark as Paid"
                onPress={handleMarkPaid}
                variant="success"
                size="lg"
                style={styles.modalButton}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontSize.display,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.display,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.fontSize.callout,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  timelineSection: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
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
    marginBottom: 2,
  },
  timelineClientText: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
    fontStyle: 'italic',
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
  // Modal styles
  modalContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  modalTitle: {
    fontSize: theme.fontSize.title,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  cancelButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  formContainer: {
    gap: theme.spacing.lg,
  },
  formField: {
    gap: theme.spacing.sm,
  },
  formLabel: {
    fontSize: theme.fontSize.callout,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  inputContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.button,
    borderWidth: 1,
    borderColor: '#e5e5e7',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dollarSign: {
    fontSize: theme.fontSize.body,
    color: theme.colors.text.secondary,
    paddingLeft: theme.spacing.md,
    fontFamily: theme.typography.fontFamily.primary,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.body,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  formHelperText: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  methodsContainer: {
    gap: theme.spacing.sm,
  },
  methodButton: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.button,
    borderWidth: 2,
    borderColor: '#e5e5e7',
    padding: theme.spacing.md,
  },
  methodButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}08`,
  },
  methodButtonText: {
    fontSize: theme.fontSize.callout,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  methodButtonTextSelected: {
    color: theme.colors.primary,
  },
  modalButtonContainer: {
    marginTop: theme.spacing.xxl,
  },
  modalButton: {
    width: '100%',
  },
});