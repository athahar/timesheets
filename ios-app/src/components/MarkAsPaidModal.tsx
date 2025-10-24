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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Session } from '../types';
import { StickyCTA } from './StickyCTA';
import { TPHeader } from './v2/TPHeader';
import { theme } from '../styles/theme';
import { TP } from '../styles/themeV2';
import { markPaid } from '../services/storageService';
import { simpleT } from '../i18n/simple';
import { formatHours } from '../utils/formatters';
import { moneyFormat, parseLocalizedMoney } from '../utils/money';
import { useLocale } from '../hooks/useLocale';
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
  const { locale } = useLocale();
  const [paymentDate, setPaymentDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [customAmount, setCustomAmount] = useState(unpaidAmount.toFixed(2));
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

  // Use moneyFormat for locale-aware currency display
  const outstandingAmountLabel = moneyFormat(unpaidAmount * 100, 'USD', locale);
  const totalPersonHoursLabel = formatHours(totalPersonHours);

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

      // Parse amount using locale-aware parser (returns cents)
      const amountCents = parseLocalizedMoney(customAmount, locale, 'USD');
      const amount = amountCents / 100; // Convert back to dollars for backend

      if (amountCents <= 0) {
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
        console.log('🔄 MarkAsPaidModal: Recording payment', {
          clientId,
          sessionIds,
          amount,
          paymentMethod: 'other', // Always 'other' now
          sessionsCount: payableSessions.length
        });
      }

      // Analytics: Track payment submission attempt (canonical Tier-0)
      try {
        capture(E.ACTION_PAYMENT_SENT_SUBMITTED, {
          session_ids: sessionIds,
          provider_id: providerId || '',
          total_amount: amount,
          success: false, // Will set to true on success
          payment_method: 'other',
        });
      } catch (analyticsError) {
        if (__DEV__) {
          console.error('Analytics tracking failed:', analyticsError);
        }
      }

      if (__DEV__) {
        console.log('💰 MarkAsPaidModal: Calling markPaid...');
      }

      // Call markPaid with 'other' as default payment method
      await markPaid(clientId, sessionIds, amount, 'other');

      if (__DEV__) {
        console.log('✅ MarkAsPaidModal: Payment successful, closing modal');
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
          payment_method: 'other',
        });

        // Track successful action event (canonical fields)
        capture(E.ACTION_PAYMENT_SENT_SUBMITTED, {
          session_ids: sessionIds,
          provider_id: providerId || '',
          total_amount: amount, // Canonical field name
          success: true, // Success flag
          payment_method: 'other',
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
    const amountCents = parseLocalizedMoney(customAmount, locale, 'USD');
    const amount = amountCents / 100;
    return amountCents > 0 && amount <= unpaidAmount;
  };

  const handleDateChange = (text: string) => {
    // Simple date validation - in a real app you'd use a proper date picker
    setPaymentDate(text);
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayBackground} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title */}
            <Text style={styles.title}>{simpleT('markAsPaidModal.title')}</Text>

            {/* Requested Amount (Read-only) */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{simpleT('markAsPaidModal.requestedAmount')}</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>
                  {outstandingAmountLabel} [{totalPersonHoursLabel}]
                </Text>
              </View>
            </View>

            {/* Paid Amount */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{simpleT('markAsPaidModal.paidAmount')}</Text>
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
                onSubmitEditing={dismissKeyboard}
              />
              <Text style={styles.fieldHint}>
                {simpleT('markAsPaidModal.dateHint')}
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>
                  {simpleT('markAsPaidModal.cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, (!isFormValid() || loading) && styles.saveButtonDisabled]}
                onPress={handleMarkAsPaid}
                disabled={!isFormValid() || loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? simpleT('markAsPaidModal.recording') : simpleT('markAsPaidModal.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: TP.color.cardBg,
    borderRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollView: {
    maxHeight: '100%',
  },
  content: {
    padding: TP.spacing.x24,
  },
  title: {
    fontSize: TP.font.title1,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
    textAlign: 'center',
    marginBottom: TP.spacing.x24,
  },
  fieldContainer: {
    marginBottom: TP.spacing.x20,
  },
  fieldLabel: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
    marginBottom: TP.spacing.x8,
  },
  fieldHint: {
    fontSize: TP.font.caption,
    color: TP.color.textSecondary,
    marginTop: TP.spacing.x4,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.input,
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x12,
    borderWidth: 1,
    borderColor: TP.color.divider,
    minHeight: 44,
  },
  dollarSign: {
    fontSize: TP.font.body,
    color: TP.color.textSecondary,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: TP.font.body,
    color: TP.color.ink,
    fontVariant: ['tabular-nums'],
  },
  dateInput: {
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.input,
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x12,
    fontSize: TP.font.body,
    color: TP.color.ink,
    borderWidth: 1,
    borderColor: TP.color.divider,
    minHeight: 44,
  },
  readOnlyField: {
    backgroundColor: TP.color.appBg,
    borderRadius: TP.radius.input,
    paddingHorizontal: TP.spacing.x16,
    paddingVertical: TP.spacing.x12,
    borderWidth: 1,
    borderColor: TP.color.divider,
    minHeight: 44,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: TP.font.body,
    color: TP.color.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: TP.spacing.x12,
    marginTop: TP.spacing.x8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: TP.color.cardBg,
    borderWidth: 1,
    borderColor: TP.color.ink,
    borderRadius: TP.radius.button,
    paddingVertical: TP.spacing.x14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButtonText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  saveButton: {
    flex: 1,
    backgroundColor: TP.color.ink,
    borderRadius: TP.radius.button,
    paddingVertical: TP.spacing.x14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.cardBg,
  },
});
