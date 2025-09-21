import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Session, PaymentMethod } from '../types';
import { Button } from './Button';
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

      console.log('🔄 MarkAsPaidModal: Recording payment', {
        clientId,
        sessionIds,
        amount,
        paymentMethod,
        sessionsCount: payableSessions.length
      });

      console.log('💰 MarkAsPaidModal: Calling markPaid...');
      await markPaid(clientId, sessionIds, amount, paymentMethod);
      console.log('✅ MarkAsPaidModal: Payment successful, closing modal');

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

  const handleDateChange = (text: string) => {
    // Simple date validation - in a real app you'd use a proper date picker
    setPaymentDate(text);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Mark as Paid</Text>
          <Text style={styles.modalSubtitle}>
            Record payment to {providerName}
          </Text>

          {/* Payment Amount */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Payment Amount</Text>
            <TextInput
              style={styles.amountInput}
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="numeric"
              placeholder="0.00"
              autoFocus
            />
            <Text style={styles.fieldHint}>
              Maximum: ${unpaidAmount.toFixed(2)}
            </Text>
          </View>

          {/* Payment Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Payment Date</Text>
            <TextInput
              style={styles.dateInput}
              value={paymentDate}
              onChangeText={handleDateChange}
              placeholder="YYYY-MM-DD"
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

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              onPress={onClose}
              variant="secondary"
              size="md"
              style={styles.cancelButton}
              disabled={loading}
            />
            <Button
              title={loading ? "Recording..." : "Mark as Paid"}
              onPress={handleMarkAsPaid}
              variant="success"
              size="md"
              style={styles.confirmButton}
              disabled={loading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...theme.shadows.card,
  },
  modalTitle: {
    fontSize: theme.fontSize.headline,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.primary,
  },
  modalSubtitle: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    fontFamily: theme.typography.fontFamily.primary,
  },
  fieldContainer: {
    marginBottom: theme.spacing.lg,
  },
  fieldLabel: {
    fontSize: theme.fontSize.body,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    fontFamily: theme.typography.fontFamily.primary,
  },
  fieldHint: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    fontFamily: theme.typography.fontFamily.primary,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.body,
    fontFamily: theme.typography.fontFamily.primary,
    backgroundColor: theme.colors.background,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.fontSize.body,
    fontFamily: theme.typography.fontFamily.primary,
    backgroundColor: theme.colors.background,
  },
  methodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  methodButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.small,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  methodButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  methodButtonText: {
    fontSize: theme.fontSize.footnote,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.primary,
  },
  methodButtonTextSelected: {
    color: theme.colors.white,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});