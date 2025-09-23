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

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'zelle', label: 'Zelle' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'other', label: 'Other' },
  ];

  const handleMarkAsPaid = async () => {
    try {
      setLoading(true);

      const amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
        return;
      }

      if (amount > unpaidAmount) {
        Alert.alert(
          'Amount Too High',
          `Payment amount cannot exceed the unpaid balance of $${unpaidAmount.toFixed(2)}.`
        );
        return;
      }

      // Validate that we have sessions to pay
      if (!sessions || sessions.length === 0) {
        Alert.alert('No Sessions', 'No sessions available for payment.');
        return;
      }

      // Filter only unpaid and requested sessions
      const payableSessions = sessions.filter(session =>
        session.status === 'unpaid' || session.status === 'requested'
      );

      if (payableSessions.length === 0) {
        Alert.alert('No Unpaid Sessions', 'All sessions are already paid.');
        return;
      }

      const sessionIds = payableSessions.map(session => session.id);
      const clientId = payableSessions[0]?.clientId;

      if (!clientId) {
        Alert.alert('Error', 'Unable to identify client for payment.');
        return;
      }

      if (__DEV__) {

        console.log('🔄 MarkAsPaidModal: Recording payment', {
        clientId,
        sessionIds,
        amount,
        paymentMethod,
        sessionsCount: payableSessions.length
      });

      }

      if (__DEV__) {

        console.log('💰 MarkAsPaidModal: Calling markPaid...');

      }
      await markPaid(clientId, sessionIds, amount, paymentMethod);
      if (__DEV__) {
        console.log('✅ MarkAsPaidModal: Payment successful, closing modal');
      }

      // Close modal immediately after successful payment
      onPaymentCompleted();
      onClose();

      // Show success alert after modal is closed
      setTimeout(() => {
        Alert.alert(
          'Payment Recorded',
          `Payment of $${amount.toFixed(2)} to ${providerName} has been recorded.`
        );
      }, 100);
    } catch (error) {
      console.error('❌ Error marking as paid:', error);
      Alert.alert('Error', 'Failed to record payment. Please try again.');
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
          title="Mark as Paid"
          subtitle={`Record payment to ${providerName}`}
          leftAction={{
            title: "Cancel",
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
          {/* Payment Amount */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Payment Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                ref={amountRef}
                style={styles.amountInput}
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.color.textSecondary}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => dateRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <Text style={styles.fieldHint}>
              Maximum: ${unpaidAmount.toFixed(2)}
            </Text>
          </View>

          {/* Payment Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Payment Date</Text>
            <TextInput
              ref={dateRef}
              style={styles.dateInput}
              value={paymentDate}
              onChangeText={handleDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.color.textSecondary}
              returnKeyType="done"
            />
            <Text style={styles.fieldHint}>
              Format: YYYY-MM-DD (e.g., 2024-01-15)
            </Text>
          </View>

          {/* Payment Method */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Payment Method</Text>
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
            title: loading ? "Recording..." : "Mark as Paid",
            onPress: handleMarkAsPaid,
            disabled: !isFormValid(),
            loading,
          }}
          secondaryButton={{
            title: "Cancel",
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