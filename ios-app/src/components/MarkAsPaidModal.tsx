import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Session, PaymentMethod } from '../types';
import { StickyCTA } from './StickyCTA';
import { IOSHeader } from './IOSHeader';
import { theme } from '../styles/theme';
import { markPaid } from '../services/storageService';
import { simpleT } from '../i18n/simple';
import { formatCurrency, formatHours } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
// Analytics
import { capture, group, E, nowIso } from '../services/analytics';

interface MarkAsPaidModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentCompleted: () => void;
  unpaidAmount: number;
  providerName: string;
  sessions: Session[];
}

export const MarkAsPaidModal: React.FC<MarkAsPaidModalProps> = ({
  visible,
  onClose,
  onPaymentCompleted,
  unpaidAmount,
  providerName,
  sessions,
}) => {
  const { user } = useAuth();
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customAmount, setCustomAmount] = useState(unpaidAmount.toString());
  const [loading, setLoading] = useState(false);

  // Focus management
  const amountRef = useRef<TextInput>(null);
  const dateRef = useRef<TextInput>(null);

  const totalPersonHours = sessions.reduce((sum, session) => {
    const crew = session.crewSize || 1;
    const baseDuration = session.duration || 0;
    const personHours = typeof session.personHours === 'number' ? session.personHours : baseDuration * crew;
    return sum + personHours;
  }, 0);
  const outstandingAmountLabel = formatCurrency(unpaidAmount);
  const totalPersonHoursLabel = formatHours(totalPersonHours);

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: simpleT('markAsPaidModal.paymentMethods.cash') },
    { value: 'zelle', label: simpleT('markAsPaidModal.paymentMethods.zelle') },
    { value: 'paypal', label: simpleT('markAsPaidModal.paymentMethods.paypal') },
    { value: 'bank_transfer', label: simpleT('markAsPaidModal.paymentMethods.bankTransfer') },
    { value: 'other', label: simpleT('markAsPaidModal.paymentMethods.other') },
  ];

  /**
   * Calculate days between oldest session end time and now (payment confirmed time).
   * This is the North Star metric for payment velocity.
   */
  const daysSinceOldestCompleted = (sessions: Session[]): number => {
    if (!sessions.length) return 0;

    const confirmedAt = new Date();
    const oldestEndTime = sessions.reduce((oldest, s) => {
      const sessionEnd = s.endTime ? new Date(s.endTime) : new Date();
      return sessionEnd < oldest ? sessionEnd : oldest;
    }, new Date());

    const diffMs = confirmedAt.getTime() - oldestEndTime.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  const handleMarkAsPaid = async () => {
    try {
      setLoading(true);

      const amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert(
          simpleT('markAsPaidModal.errors.invalidAmount'),
          simpleT('markAsPaidModal.errors.validAmount')
        );
        return;
      }

      if (amount > unpaidAmount) {
        Alert.alert(
          simpleT('markAsPaidModal.errors.amountTooHigh'),
          simpleT('markAsPaidModal.errors.exceedsBalance', { amount: unpaidAmount.toFixed(2) })
        );
        return;
      }

      // Validate that we have sessions to pay
      if (!sessions || sessions.length === 0) {
        Alert.alert(
          simpleT('markAsPaidModal.errors.noSessions'),
          simpleT('markAsPaidModal.errors.noSessionsAvailable')
        );
        return;
      }

      // Filter only unpaid and requested sessions
      const payableSessions = sessions.filter(session =>
        session.status === 'unpaid' || session.status === 'requested'
      );

      if (payableSessions.length === 0) {
        Alert.alert(
          simpleT('markAsPaidModal.errors.noUnpaidSessions'),
          simpleT('markAsPaidModal.errors.allPaid')
        );
        return;
      }

      const sessionIds = payableSessions.map(session => session.id);
      const clientId = payableSessions[0]?.clientId;
      const providerId = payableSessions[0]?.providerId;

      if (!clientId) {
        Alert.alert(
          simpleT('markAsPaidModal.errors.clientError'),
          simpleT('markAsPaidModal.errors.clientNotFound')
        );
        return;
      }

      if (__DEV__) {

        if (__DEV__) {
          if (__DEV__) console.log('🔄 MarkAsPaidModal: Recording payment', {
            clientId,
            sessionIds,
            amount,
            paymentMethod,
            sessionsCount: payableSessions.length
          });
        }

      }

      // Analytics: Track payment submission attempt (canonical Tier-0)
      try {
        capture(E.ACTION_PAYMENT_SENT_SUBMITTED, {
          session_ids: sessionIds,
          provider_id: providerId || '',
          total_amount: amount,
          success: false, // Will set to true on success
          payment_method: paymentMethod,
        });
      } catch (analyticsError) {
        if (__DEV__) {
          console.error('Analytics tracking failed:', analyticsError);
        }
      }

      if (__DEV__) {

        if (__DEV__) {
          if (__DEV__) console.log('💰 MarkAsPaidModal: Calling markPaid...');
        }

      }
      await markPaid(clientId, sessionIds, amount, paymentMethod);
      if (__DEV__) {
        if (__DEV__) {
          if (__DEV__) console.log('✅ MarkAsPaidModal: Payment successful, closing modal');
        }
      }

      // Analytics: Track successful payment confirmation (canonical Tier-0)
      try {
        // Set groups before capturing events
        if (user?.id && providerId) {
          group('provider', providerId);
          group('client', user.id);
        }

        // Calculate days since oldest session completed (North Star metric)
        const daysSince = daysSinceOldestCompleted(payableSessions);

        // Track business event (canonical fields)
        capture(E.BUSINESS_PAYMENT_CONFIRMED, {
          payment_ids: sessionIds, // Canonical field name
          provider_id: providerId || '',
          client_id: user?.id || '',
          total_amount: amount, // Canonical field name
          confirmed_at: nowIso(),
          days_since_session_completed: daysSince, // North Star metric

          // Optional extras (tolerated by Zod drift):
          session_count: payableSessions.length,
          total_person_hours: totalPersonHours,
          payment_method: paymentMethod,
        });

        // Track successful action event (canonical fields)
        capture(E.ACTION_PAYMENT_SENT_SUBMITTED, {
          session_ids: sessionIds,
          provider_id: providerId || '',
          total_amount: amount, // Canonical field name
          success: true, // Success flag
          payment_method: paymentMethod,
        });
      } catch (analyticsError) {
        if (__DEV__) {
          console.error('Analytics tracking failed:', analyticsError);
        }
      }

      // Close modal immediately after successful payment
      onPaymentCompleted();
      onClose();

      // Show success alert after modal is closed
      setTimeout(() => {
        Alert.alert(
          simpleT('markAsPaidModal.success.title'),
          simpleT('markAsPaidModal.success.message', {
            amount: amount.toFixed(2),
            providerName: providerName
          })
        );
      }, 100);
    } catch (error) {
      if (__DEV__) {
        console.error('❌ Error marking as paid:', error);
      }
      Alert.alert(
        simpleT('markAsPaidModal.errors.clientError'),
        simpleT('markAsPaidModal.errors.paymentFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    const amount = parseFloat(customAmount);
    return !isNaN(amount) && amount > 0 && amount <= unpaidAmount;
  };

  const handleDateChange = (text: string) => {
    // Simple date validation - in a real app you'd use a proper date picker
    setPaymentDate(text);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <IOSHeader
          title={simpleT('markAsPaidModal.title')}
          subtitle={simpleT('markAsPaidModal.subtitle', { providerName })}
          leftAction={{
            title: simpleT('markAsPaidModal.cancel'),
            onPress: onClose,
          }}
          backgroundColor={theme.color.cardBg}
          largeTitleStyle="never"
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Outstanding Summary */}
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryPrimary}>{outstandingAmountLabel}</Text>
            <Text style={styles.summarySecondary}>{totalPersonHoursLabel} person-hours outstanding</Text>
          </View>

          {/* Payment Amount */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{simpleT('markAsPaidModal.paymentAmount')}</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                ref={amountRef}
                style={styles.amountInput}
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="decimal-pad"
                placeholder={simpleT('markAsPaidModal.amountPlaceholder')}
                placeholderTextColor={theme.color.textSecondary}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => dateRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <Text style={styles.fieldHint}>
              {simpleT('markAsPaidModal.maximumAmount', { amount: unpaidAmount.toFixed(2) })}
            </Text>
          </View>

          {/* Payment Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{simpleT('markAsPaidModal.paymentDate')}</Text>
            <TextInput
              ref={dateRef}
              style={styles.dateInput}
              value={paymentDate}
              onChangeText={handleDateChange}
              placeholder={simpleT('markAsPaidModal.datePlaceholder')}
              placeholderTextColor={theme.color.textSecondary}
              returnKeyType="done"
            />
            <Text style={styles.fieldHint}>
              {simpleT('markAsPaidModal.dateHint')}
            </Text>
          </View>

          {/* Payment Method */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{simpleT('markAsPaidModal.paymentMethod')}</Text>
            <View style={styles.methodContainer}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.methodButton,
                    paymentMethod === method.value && styles.methodButtonSelected
                  ]}
                  onPress={() => setPaymentMethod(method.value)}
                  activeOpacity={0.7}
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
        </ScrollView>

        <StickyCTA
          primaryButton={{
            title: loading ? simpleT('markAsPaidModal.recording') : simpleT('markAsPaidModal.markPaid'),
            onPress: handleMarkAsPaid,
            disabled: !isFormValid(),
            loading,
          }}
          secondaryButton={{
            title: simpleT('markAsPaidModal.cancel'),
            onPress: onClose,
            disabled: loading,
          }}
          backgroundColor={theme.color.cardBg}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.cardBg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  summaryBlock: {
    marginBottom: 24,
  },
  summaryPrimary: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.display,
  },
  summarySecondary: {
    fontSize: 14,
    color: theme.color.textSecondary,
    marginTop: 4,
    fontFamily: theme.typography.fontFamily.primary,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.color.text,
    marginBottom: 8,
    fontFamily: theme.typography.fontFamily.primary,
  },
  fieldHint: {
    fontSize: 13,
    color: theme.color.textSecondary,
    marginTop: 4,
    fontFamily: theme.typography.fontFamily.primary,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.color.border,
    minHeight: 44,
  },
  dollarSign: {
    fontSize: 16,
    color: theme.color.textSecondary,
    fontFamily: theme.typography.fontFamily.primary,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    fontVariant: ['tabular-nums'],
  },
  dateInput: {
    backgroundColor: theme.color.cardBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    borderWidth: 1,
    borderColor: theme.color.border,
    minHeight: 44,
  },
  methodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodButton: {
    borderWidth: 1,
    borderColor: theme.color.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.color.cardBg,
    minHeight: 36,
    justifyContent: 'center',
  },
  methodButtonSelected: {
    backgroundColor: theme.color.brand,
    borderColor: theme.color.brand,
  },
  methodButtonText: {
    fontSize: 14,
    color: theme.color.text,
    fontFamily: theme.typography.fontFamily.primary,
    fontWeight: '500',
  },
  methodButtonTextSelected: {
    color: '#FFFFFF',
  },
});
