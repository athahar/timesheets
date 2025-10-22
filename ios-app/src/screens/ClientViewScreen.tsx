import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { TPButton } from '../components/v2/TPButton';
import { TP } from '../styles/themeV2';
import { simpleT } from '../i18n/simple';
import { formatCurrency } from '../utils/formatters';
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
  const loadingRef = useRef<boolean>(false); // Debounce guard for loadData

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: simpleT('markAsPaidModal.paymentMethods.cash') },
    { value: 'zelle', label: simpleT('markAsPaidModal.paymentMethods.zelle') },
    { value: 'paypal', label: simpleT('markAsPaidModal.paymentMethods.paypal') },
    { value: 'bank_transfer', label: simpleT('markAsPaidModal.paymentMethods.bankTransfer') },
    { value: 'other', label: simpleT('markAsPaidModal.paymentMethods.other') },
  ];

  const loadData = async () => {
    // Debounce guard: prevent concurrent calls
    if (loadingRef.current) {
      if (__DEV__) console.log('🚫 loadData: already loading, skipping duplicate call');
      return;
    }

    loadingRef.current = true;
    try {
      const [activitiesData, clientsData] = await Promise.all([
        getActivities(),
        getClients(),
      ]);

      if (__DEV__) {

        if (__DEV__) {
          if (__DEV__) console.log('🔍 DEBUG: Total activities loaded:', activitiesData.length);
        }

      }
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('🔍 DEBUG: Activity types:', activitiesData.map(a => a.type));
          if (__DEV__) console.log('🔍 DEBUG: Payment activities:', activitiesData.filter(a => a.type === 'payment_completed'));
        }
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
      loadingRef.current = false; // Reset debounce guard
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
                          : simpleT('providerSummary.activeSessionInProgress')
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
              <TPButton
                title="Mark as Paid"
                onPress={handleMarkPaid}
                variant="primary"
                size="lg"
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
    paddingHorizontal: TP.spacing.x24,
    paddingTop: TP.spacing.x24,
    paddingBottom: TP.spacing.x32,
  },
  title: {
    fontSize: TP.font.display,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x12,
  },
  subtitle: {
    fontSize: 15,
    color: TP.color.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: TP.spacing.x24,
    paddingBottom: TP.spacing.x32 + TP.spacing.x16,
  },
  timelineSection: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.card,
    padding: TP.spacing.x24,
    borderWidth: 1,
    borderColor: TP.color.border,
  },
  emptyState: {
    padding: TP.spacing.x32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
    marginBottom: TP.spacing.x12,
  },
  emptyStateSubtext: {
    fontSize: TP.font.footnote,
    color: TP.color.textSecondary,
    textAlign: 'center',
  },
  timelineItem: {
    marginBottom: TP.spacing.x16,
  },
  timelineLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: TP.spacing.x12,
  },
  timelineIcon: {
    fontSize: 20,
    marginRight: TP.spacing.x16,
    width: 24,
    textAlign: 'center',
  },
  timelineContent: {
    flex: 1,
    marginRight: TP.spacing.x16,
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
    marginBottom: 2,
  },
  timelineClientText: {
    fontSize: TP.font.footnote,
    color: TP.color.textSecondary,
    fontStyle: 'italic',
  },
  timelineRight: {
    alignItems: 'flex-end',
    gap: TP.spacing.x8,
  },
  timelineAmount: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    paddingHorizontal: TP.spacing.x24,
    paddingTop: TP.spacing.x24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TP.spacing.x32 + TP.spacing.x16,
  },
  modalTitle: {
    fontSize: TP.font.title,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
  },
  cancelButton: {
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x12,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: TP.weight.medium,
    color: TP.color.ink,
  },
  formContainer: {
    gap: TP.spacing.x24,
  },
  formField: {
    gap: TP.spacing.x12,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: TP.weight.medium,
    color: TP.color.ink,
  },
  inputContainer: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.input,
    borderWidth: 1,
    borderColor: TP.color.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dollarSign: {
    fontSize: TP.font.body,
    color: TP.color.textSecondary,
    paddingLeft: TP.spacing.x16,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: TP.spacing.x12,
    paddingVertical: TP.spacing.x16,
    fontSize: TP.font.body,
    color: TP.color.ink,
  },
  formHelperText: {
    fontSize: TP.font.footnote,
    color: TP.color.textSecondary,
  },
  methodsContainer: {
    gap: TP.spacing.x12,
  },
  methodButton: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.button,
    borderWidth: 2,
    borderColor: TP.color.border,
    padding: TP.spacing.x16,
  },
  methodButtonSelected: {
    borderColor: TP.color.ink,
    backgroundColor: '#11182708',
  },
  methodButtonText: {
    fontSize: 15,
    fontWeight: TP.weight.medium,
    color: TP.color.ink,
  },
  methodButtonTextSelected: {
    color: TP.color.ink,
  },
  modalButtonContainer: {
    marginTop: TP.spacing.x32 + TP.spacing.x16,
  },
  modalButton: {
    width: '100%',
  },
});